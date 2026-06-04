import { auth } from "@/lib/auth/auth"
import { NextResponse } from "next/server"

const publicRoutes = ["/login", "/register", "/pending"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
