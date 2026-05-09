import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionValue } from "@/lib/auth";

const username = process.env.DASHBOARD_AUTH_USER;
const passwordHash = process.env.DASHBOARD_AUTH_PASSWORD_SHA256?.toLowerCase();
const sessionSecret = process.env.DASHBOARD_AUTH_SECRET;
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

function authNotConfigured() {
  return new NextResponse("Autenticação não configurada.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/api/auth/");

  if (!username || !passwordHash || !sessionSecret) {
    if (isAuthRoute) {
      return NextResponse.next();
    }

    return isProduction ? authNotConfigured() : NextResponse.next();
  }

  const isAuthenticated = await verifySessionValue(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
    sessionSecret,
    username
  );

  if (isAuthRoute) {
    if (pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
