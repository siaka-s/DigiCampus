import { getSession } from "next-auth/react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type ApiResponse<T> = {
  data: T | null
  error: string | null
  message: string
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const session = await getSession()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    window.location.href = "/login"
    return { data: null, error: "Non authentifié", message: "" }
  }

  if (res.status === 403) {
    window.location.href = "/unauthorized"
    return { data: null, error: "Accès refusé", message: "" }
  }

  return res.json()
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
