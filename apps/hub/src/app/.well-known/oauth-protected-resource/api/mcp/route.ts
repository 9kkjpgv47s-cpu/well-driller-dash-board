import {
  protectedResourceOptionsResponse,
  protectedResourceResponse,
} from "@/lib/mcp/protected-resource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = () => protectedResourceResponse();
export const OPTIONS = () => protectedResourceOptionsResponse();
