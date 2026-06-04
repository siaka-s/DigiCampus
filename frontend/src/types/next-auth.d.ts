import { DefaultSession, DefaultJWT } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
    user: {
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    accessToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string
    accessToken: string
  }
}
