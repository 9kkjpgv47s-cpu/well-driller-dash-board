#!/usr/bin/env node
/**
 * OAuth discovery check for the hosted MCP endpoint (`/api/mcp`) — verifies the
 * chain ChatGPT needs end to end: 401 challenge → RFC 9728 protected-resource
 * metadata (path-suffixed + root) → authorization-server metadata → JWKS.
 *
 *   node scripts/mcp-oauth-check.mjs [mcp-url] [--issuer <url>]
 *   e.g. npm run mcp:oauth-check                       # prod defaults
 *        npm run mcp:oauth-check -- http://localhost:3000/api/mcp \
 *          --issuer https://<tenant>.authkit.app
 *
 * Prints one PASS/FAIL/WARN/INFO/SKIP line per check, then a summary; exits 1
 * if any check FAILs (or OAuth is unconfigured with no --issuer to check).
 * Read-only; sends no credentials.
 */
const DEFAULT_MCP_URL = "https://driller-hub.vercel.app/api/mcp";

const args = process.argv.slice(2);
let mcpUrl = DEFAULT_MCP_URL;
let issuerArg;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--issuer") {
    issuerArg = args[i + 1];
    i += 1;
  } else if (!args[i].startsWith("--")) {
    mcpUrl = args[i];
  } else {
    console.error(`unknown flag: ${args[i]}`);
    process.exit(2);
  }
}

let parsed;
try {
  parsed = new URL(mcpUrl);
} catch {
  console.error(
    "usage: node scripts/mcp-oauth-check.mjs [mcp-url] [--issuer <url>]",
  );
  process.exit(2);
}

const counts = { PASS: 0, FAIL: 0, WARN: 0, INFO: 0, SKIP: 0 };
function report(level, name, detail = "") {
  counts[level] += 1;
  console.log(`${level} ${name}${detail ? ` — ${detail}` : ""}`);
}

function summary() {
  console.log(
    `summary: ${counts.PASS} pass, ${counts.FAIL} fail, ${counts.WARN} warn, ${counts.INFO} info, ${counts.SKIP} skip`,
  );
}

async function getJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  return { status: res.status, ok: res.ok, body };
}

// a. Unauthenticated initialize must 401 with a resource_metadata challenge.
let metadataUrl;
try {
  const res = await fetch(mcpUrl, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "mcp-oauth-check", version: "0.1.0" },
      },
    }),
  });
  const www = res.headers.get("www-authenticate") ?? "";
  const match = www.match(/resource_metadata="([^"]+)"/);
  if (res.status === 401 && match) {
    metadataUrl = match[1];
    report("PASS", "challenge", `401 resource_metadata="${metadataUrl}"`);
  } else {
    report(
      "FAIL",
      "challenge",
      `expected 401 + resource_metadata=, got ${res.status} www-authenticate: ${www || "(none)"}`,
    );
  }
} catch (err) {
  report("FAIL", "challenge", `request failed: ${err.message}`);
}

// b. RFC 9728 PRM at the path-suffixed URL (spec 2025-11-25 clients look here
// first) and at the root URL the challenge points at.
const suffixedUrl = `${parsed.origin}/.well-known/oauth-protected-resource${parsed.pathname}`;
const rootUrl =
  metadataUrl ?? `${parsed.origin}/.well-known/oauth-protected-resource`;

let prm;
let prmUnconfigured = false;
try {
  const suffixed = await getJson(suffixedUrl);
  const root =
    rootUrl === suffixedUrl ? suffixed : await getJson(rootUrl);
  report("INFO", "prm", `path-suffixed ${suffixed.status} ${suffixedUrl}`);
  report("INFO", "prm", `root ${root.status} ${rootUrl}`);

  if (suffixed.status === 404 && root.status === 404) {
    prmUnconfigured = true;
    report(
      "INFO",
      "prm",
      "OAuth not configured on the hub (MCP_OAUTH_ISSUER unset)",
    );
  } else {
    const doc =
      suffixed.status === 200 && suffixed.body
        ? suffixed.body
        : root.status === 200 && root.body
          ? root.body
          : undefined;
    if (!doc) {
      report(
        "FAIL",
        "prm",
        `no usable metadata: path-suffixed ${suffixed.status}, root ${root.status}`,
      );
    } else {
      prm = doc;
      if (prm.resource !== mcpUrl) {
        report(
          "FAIL",
          "prm",
          `resource ${JSON.stringify(prm.resource)} !== ${mcpUrl}`,
        );
      } else {
        report("PASS", "prm", `resource matches ${mcpUrl}`);
      }
      if (
        !Array.isArray(prm.authorization_servers) ||
        prm.authorization_servers.length === 0
      ) {
        report("FAIL", "prm", "authorization_servers missing or empty");
      } else {
        report(
          "PASS",
          "prm",
          `authorization_servers: ${prm.authorization_servers.join(", ")}`,
        );
      }
      if (suffixed.status !== 200 && root.status === 200) {
        report(
          "WARN",
          "prm",
          "path-suffixed URL not 200 while root is — newer clients try it first",
        );
      }
    }
  }
} catch (err) {
  report("FAIL", "prm", `request failed: ${err.message}`);
}

// c. Authorization-server metadata. Issuer: --issuer wins, else PRM.
const issuer = (issuerArg ?? prm?.authorization_servers?.[0])?.replace(
  /\/$/,
  "",
);
if (!issuer) {
  report(
    "SKIP",
    "as-metadata",
    "no issuer (pass --issuer or configure OAuth on the hub)",
  );
  report("SKIP", "jwks", "no issuer");
  summary();
  process.exit(1);
}

let asMeta;
try {
  let res = await getJson(`${issuer}/.well-known/oauth-authorization-server`);
  if (res.status === 404) {
    res = await getJson(`${issuer}/.well-known/openid-configuration`);
  }
  if (!res.ok || !res.body) {
    report(
      "FAIL",
      "as-metadata",
      `no AS/OIDC metadata for ${issuer} (last status ${res.status})`,
    );
  } else {
    asMeta = res.body;
    report("PASS", "as-metadata", `metadata fetched for ${issuer}`);
  }
} catch (err) {
  report("FAIL", "as-metadata", `request failed: ${err.message}`);
}

if (asMeta) {
  if (asMeta.issuer === issuer) {
    report("PASS", "as-metadata", `issuer matches ${issuer}`);
  } else {
    report(
      "FAIL",
      "as-metadata",
      `issuer ${JSON.stringify(asMeta.issuer)} !== ${issuer} (clients compare exact strings)`,
    );
  }

  const ccm = asMeta.code_challenge_methods_supported ?? [];
  if (ccm.includes("S256")) {
    report("PASS", "as-metadata", "PKCE S256 supported");
  } else {
    report(
      "FAIL",
      "as-metadata",
      `code_challenge_methods_supported lacks S256: ${JSON.stringify(ccm)}`,
    );
  }

  const registration = [];
  if (asMeta.registration_endpoint)
    registration.push("dynamic client registration");
  if (asMeta.client_id_metadata_document_supported === true)
    registration.push("client ID metadata document");
  if (registration.length === 0) {
    report(
      "FAIL",
      "as-metadata",
      "no registration_endpoint and client_id_metadata_document_supported !== true",
    );
  } else {
    report(
      "INFO",
      "as-metadata",
      `registration available: ${registration.join(" + ")}`,
    );
  }

  const team = asMeta.token_endpoint_auth_methods_supported ?? [];
  if (team.includes("none")) {
    report("PASS", "as-metadata", "public (unauthenticated) token clients OK");
  } else {
    report(
      "FAIL",
      "as-metadata",
      `token_endpoint_auth_methods_supported lacks "none": ${JSON.stringify(team)}`,
    );
  }

  const grants = asMeta.grant_types_supported;
  if (grants === undefined) {
    report(
      "WARN",
      "as-metadata",
      "grant_types_supported absent — cannot confirm refresh_token",
    );
  } else if (Array.isArray(grants) && grants.includes("refresh_token")) {
    report("PASS", "as-metadata", "refresh_token grant supported");
  } else {
    report(
      "FAIL",
      "as-metadata",
      `grant_types_supported lacks refresh_token: ${JSON.stringify(grants)}`,
    );
  }

  const asScopes = asMeta.scopes_supported;
  if (Array.isArray(asScopes) && asScopes.includes("offline_access")) {
    report("PASS", "as-metadata", "offline_access scope supported");
  } else {
    report(
      "WARN",
      "as-metadata",
      `scopes_supported lacks offline_access — no refresh tokens: ${JSON.stringify(asScopes)}`,
    );
  }

  if (Array.isArray(prm?.scopes_supported) && Array.isArray(asScopes)) {
    const missing = prm.scopes_supported.filter((s) => !asScopes.includes(s));
    if (missing.length === 0) {
      report(
        "PASS",
        "as-metadata",
        "every PRM scope is AS-supported (no invalid_scope trap)",
      );
    } else {
      report(
        "FAIL",
        "as-metadata",
        `PRM scopes_supported not grantable by AS: ${missing.join(", ")}`,
      );
    }
  }
}

// d. JWKS — from AS metadata, else the AuthKit convention.
let jwksUrl = asMeta?.jwks_uri;
if (!jwksUrl) {
  try {
    if (new URL(issuer).hostname.endsWith(".authkit.app")) {
      jwksUrl = `${issuer}/oauth2/jwks`;
    }
  } catch {
    // Malformed issuer URL — no fallback possible.
  }
}
if (!jwksUrl) {
  report(
    "SKIP",
    "jwks",
    "no jwks_uri in AS metadata and issuer is not *.authkit.app",
  );
} else {
  try {
    const res = await getJson(jwksUrl);
    const n = Array.isArray(res.body?.keys) ? res.body.keys.length : 0;
    if (res.ok && n >= 1) {
      report("PASS", "jwks", `${n} key(s) at ${jwksUrl}`);
    } else {
      report(
        "FAIL",
        "jwks",
        `status ${res.status}, keys: ${n} at ${jwksUrl}`,
      );
    }
  } catch (err) {
    report("FAIL", "jwks", `request failed: ${err.message}`);
  }
}

summary();
process.exit(counts.FAIL > 0 ? 1 : 0);
