import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes, excluding the login page itself and static assets
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    // Check for Supabase session cookies
    const cookies = request.cookies.getAll();
    const hasSupabaseCookie = cookies.some(
      (c: { name: string; value: string }) =>
        c.name.includes("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
    );

    // If no session cookie is present, redirect directly to admin login
    if (!hasSupabaseCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
