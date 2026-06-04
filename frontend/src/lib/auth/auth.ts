import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        )

        if (!res.ok) return null

        const { data } = await res.json()
        if (!data?.token) return null

        const payload = JSON.parse(
          Buffer.from(data.token.split(".")[1], "base64").toString()
        )

        return {
          id: payload.sub,
          email: credentials.email as string,
          role: payload.role as string,
          accessToken: data.token as string,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.accessToken = user.accessToken
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role as string
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
