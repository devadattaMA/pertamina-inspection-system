import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./app/lib/auth-security";
import { getAuthenticatedUser } from "./app/lib/auth";
import { hasPermission } from "./app/lib/permissions";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let user;
  try {
    user = await getAuthenticatedUser(request);
  } catch (error) {
    console.error("Page session verification failed:", error);
    return new NextResponse("Authentication service temporarily unavailable.", { status: 503 });
  }

  if (path === "/login") {
    if (!user) return NextResponse.next();
    return NextResponse.redirect(new URL(user.mustChangePassword ? "/change-password" : "/", request.url));
  }
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("returnTo", path);
    const response = NextResponse.redirect(url);
    response.cookies.set({ name: AUTH_COOKIE_NAME, value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0, expires: new Date(0) });
    return response;
  }
  if (user.mustChangePassword && path !== "/change-password") return NextResponse.redirect(new URL("/change-password", request.url));
  if (!user.mustChangePassword && path === "/change-password") return NextResponse.redirect(new URL("/", request.url));
  if (path.startsWith("/admin") && !hasPermission(user.role, "manage_users")) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
  runtime: "nodejs",
};
