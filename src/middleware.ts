import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Blocks vulnerability scanners (Path traversal, .env/.git probes, PHP/WP exploits, XSS/SQLi scans, command injection)
const MALICIOUS_PROBE_REGEX = /(?:\.env|\.git|wp-admin|wp-login|xmlrpc|phpinfo|eval\(|<script|\.\.[\/\\]|etc\/passwd|union\s+select|sleep\(\d+\)|benchmark\(|drop\s+table|exec\s*\(|cmd\.exe|\/bin\/sh)/i;

export default withAuth(
  function middleware(req: NextRequest) {
    const url = req.nextUrl.pathname + req.nextUrl.search;
    if (MALICIOUS_PROBE_REGEX.test(url)) {
      return new NextResponse("Bad Request: Security policy violation", { status: 400 });
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect only root workspace; allow public pages & SEO
        if (req.nextUrl.pathname === "/") {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Run on all app routes while skipping static assets & images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};