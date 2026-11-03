#!/usr/bin/env node
/**
 * Golden-task eval for the hosted MCP endpoint (`/api/mcp`).
 *
 *   DRILLER_MCP_API_KEY=<key> node scripts/mcp-eval.mjs <mcp-url> [--tasks f.json] [--out results.json]
 *   e.g. DRILLER_MCP_API_KEY=dk_eval node scripts/mcp-eval.mjs http://localhost:3000/api/mcp
 *
 * Runs every task in mcp-eval-tasks.json against a live server, evaluates the
 * declarative assertions, prints a PASS/FAIL table, and optionally writes the
 * results JSON for before/after comparison. Tasks whose tool does not exist on
 * the server report MISSING (counts as fail, tag shows which feature gate it is).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const tasksPath = opt("--tasks") ?? join(here, "mcp-eval-tasks.json");
const outPath = opt("--out");

function opt(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

if (!url) {
  console.error("usage: node scripts/mcp-eval.mjs <mcp-url> [--tasks f] [--out f]");
  process.exit(2);
}
const apiKey = process.env.DRILLER_MCP_API_KEY;
if (!apiKey) {
  console.error("DRILLER_MCP_API_KEY env var is required");
  process.exit(2);
}

const spec = JSON.parse(readFileSync(tasksPath, "utf8"));
const client = new Client({ name: "driller-hub-eval", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
});

// ---------- tiny path evaluator ----------
function getPath(obj, path) {
  if (!path) return undefined;
  const p = path === "sc" ? "structuredContent" : path.startsWith("sc.") ? `structuredContent.${path.slice(3)}` : path;
  let cur = obj;
  for (const seg of p.split(".")) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return cur;
}

function evalAssert(a, ctx) {
  const { result, text, meta } = ctx;
  switch (a.type) {
    case "notError": return { ok: result.isError !== true };
    case "isError": return { ok: result.isError === true };
    case "or": {
      const sub = a.of.map((s) => evalAssert(s, ctx));
      return { ok: sub.some((s) => s.ok), detail: sub.map((s) => s.ok).join("/") };
    }
    case "textMatch": {
      const ok = new RegExp(a.pattern).test(text);
      return { ok, detail: ok ? undefined : `text lacked /${a.pattern}/` };
    }
    case "jsonPath": {
      const v = getPath(result, a.path);
      if (a.exists === true) return { ok: v !== undefined && v !== null, detail: v === undefined ? `${a.path} missing` : undefined };
      if (a.nonEmpty === true) return { ok: v != null && (typeof v !== "object" ? String(v).length > 0 : Object.keys(v).length > 0) };
      if (a.isType === "number") return { ok: typeof v === "number" && Number.isFinite(v), detail: `${a.path}=${v}` };
      if (a.isType === "array") return { ok: Array.isArray(v), detail: `${a.path} not array` };
      if (a.eq !== undefined) return { ok: v === a.eq, detail: `${a.path}=${JSON.stringify(v)} want ${JSON.stringify(a.eq)}` };
      if (a.oneOf) return { ok: a.oneOf.includes(v), detail: `${a.path}=${JSON.stringify(v)}` };
      if (a.gt !== undefined) return { ok: typeof v === "number" && v > a.gt, detail: `${a.path}=${v} want >${a.gt}` };
      if (a.lt !== undefined) return { ok: typeof v === "number" && v < a.lt, detail: `${a.path}=${v} want <${a.lt}` };
      if (a.near !== undefined) {
        const tol = a.tol ?? 0.001;
        return { ok: typeof v === "number" && Math.abs(v - a.near) <= tol, detail: `${a.path}=${v} want ~${a.near}±${tol}` };
      }
      if (a.anyKey) return { ok: v != null && a.anyKey.some((k) => v[k] !== undefined && v[k] !== null && v[k] !== ""), detail: `${a.path} keys` };
      if (a.arrayLenMin !== undefined || a.arrayLenMax !== undefined) {
        const n = Array.isArray(v) ? v.length : -1;
        const lo = a.arrayLenMin ?? 0, hi = a.arrayLenMax ?? Infinity;
        return { ok: n >= lo && n <= hi, detail: `${a.path}.length=${n} want ${lo}..${hi}` };
      }
      return { ok: v !== undefined };
    }
    // meta assertions run against cached list results
    case "toolsInclude": {
      const names = new Set(meta.tools.map((t) => t.name));
      const missing = a.names.filter((n) => !names.has(n));
      return { ok: missing.length === 0, detail: missing.length ? `missing tools: ${missing.join(", ")}` : undefined };
    }
    case "allReadOnly": {
      const bad = meta.tools.filter((t) => t.annotations?.readOnlyHint !== true).map((t) => t.name);
      return { ok: bad.length === 0, detail: bad.length ? `not readOnly: ${bad.join(", ")}` : undefined };
    }
    case "allHaveOutputSchema": {
      const bad = meta.tools.filter((t) => !t.outputSchema).map((t) => t.name);
      return { ok: bad.length === 0, detail: bad.length ? `no outputSchema: ${bad.join(", ")}` : undefined };
    }
    case "promptsInclude": {
      const names = new Set(meta.prompts.map((p) => p.name));
      const missing = a.names.filter((n) => !names.has(n));
      return { ok: missing.length === 0, detail: missing.length ? `missing prompts: ${missing.join(", ")}` : undefined };
    }
    case "resourcesInclude": {
      const uris = new Set(meta.resources.map((r) => r.uri));
      const missing = a.uris.filter((u) => !uris.has(u));
      return { ok: missing.length === 0, detail: missing.length ? `missing resources: ${missing.join(", ")}` : undefined };
    }
    default:
      return { ok: false, detail: `unknown assert ${a.type}` };
  }
}

function resolveArgs(argsObj, prevResults) {
  const out = {};
  for (const [k, v] of Object.entries(argsObj ?? {})) {
    if (typeof v === "string" && v.startsWith("$")) {
      const [taskId, ...rest] = v.slice(1).split(".");
      const prev = prevResults.get(taskId);
      const val = prev ? getPath(prev, rest.join(".")) : undefined;
      if (val == null) throw new Error(`unresolved reference ${v}`);
      out[k] = val;
    } else out[k] = v;
  }
  return out;
}

// ---------- run ----------
const meta = { tools: [], prompts: [], resources: [] };
const prevResults = new Map();
const rows = [];

try {
  await client.connect(transport);
  try { meta.tools = (await client.listTools()).tools ?? []; } catch { /* list unsupported */ }
  try { meta.prompts = (await client.listPrompts()).prompts ?? []; } catch { /* no prompts */ }
  try { meta.resources = (await client.listResources()).resources ?? []; } catch { /* no resources */ }
  console.log(`connected: ${url}`);
  console.log(`tools: ${meta.tools.map((t) => t.name).join(", ") || "(none)"}`);
  if (meta.prompts.length) console.log(`prompts: ${meta.prompts.map((p) => p.name).join(", ")}`);
  if (meta.resources.length) console.log(`resources: ${meta.resources.map((r) => r.uri).join(", ")}`);

  for (const task of spec.tasks) {
    const t0 = Date.now();
    let result = {}, text = "";
    try {
      if (task.kind === "tools-list" || task.kind === "prompts-resources") {
        result = {}; // meta asserts only
      } else {
        const toolArgs = resolveArgs(task.call.args, prevResults);
        result = await client.callTool({ name: task.call.tool, arguments: toolArgs });
        text = (result.content ?? []).map((c) => (c.type === "text" ? c.text : "")).filter(Boolean).join("\n");
      }
    } catch (e) {
      const missing = String(e?.message ?? e).match(/not found|Unknown tool|does not exist/i) || !meta.tools.some((t) => t.name === task.call?.tool);
      rows.push({ id: task.id, status: missing ? "MISSING" : "ERROR", ms: Date.now() - t0, detail: String(e?.message ?? e).slice(0, 200) });
      continue;
    }
    prevResults.set(task.id, result);
    const ctx = { result, text, meta };
    const fails = [];
    for (const a of task.assert ?? []) {
      const r = evalAssert(a, ctx);
      if (!r.ok) fails.push(`${a.type}${a.path ? ` ${a.path}` : ""}${a.names ? ` ${a.names.join("|")}` : ""}${a.uris ? ` ${a.uris.join("|")}` : ""}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    rows.push({ id: task.id, status: fails.length ? "FAIL" : "PASS", ms: Date.now() - t0, fails });
  }
} finally {
  await client.close().catch(() => {});
}

// ---------- report ----------
let pass = 0, fail = 0, missing = 0, error = 0;
for (const r of rows) {
  const icon = r.status === "PASS" ? "PASS" : r.status === "MISSING" ? "MISS" : r.status === "ERROR" ? "ERR!" : "FAIL";
  if (r.status === "PASS") pass++;
  else if (r.status === "MISSING") missing++;
  else if (r.status === "ERROR") error++;
  else fail++;
  console.log(`${icon} ${r.id} (${r.ms}ms)${r.detail ? ` — ${r.detail}` : ""}`);
  for (const f of r.fails ?? []) console.log(`     ✗ ${f}`);
}
console.log(`\nsummary: ${pass} pass, ${fail} fail, ${missing} missing-tool, ${error} error / ${rows.length} tasks`);

if (outPath) {
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ url, ranAt: new Date().toISOString(), tools: meta.tools.map((t) => t.name), prompts: meta.prompts.map((p) => p.name), resources: meta.resources.map((r) => r.uri), rows, summary: { pass, fail, missing, error } }, null, 2));
  console.log(`results written: ${outPath}`);
}
process.exit(fail + missing + error > 0 ? 1 : 0);
