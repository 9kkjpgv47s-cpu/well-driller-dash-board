import { NextResponse, type NextRequest } from "next/server";

// Dev-only design routes: production must answer a real 404 status, not a
// streamed 200 with a 404 body (root loading.tsx flushes the shell before the
// page's notFound() can set the status).
export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/design", "/design/:path*"] };
