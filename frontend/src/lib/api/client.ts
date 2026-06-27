import { getSession } from "next-auth/react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type ApiResponse<T> = {
  data: T | null
  error: string | null
  message: string
}

// Cache la session 60s — déduplique les appels concurrents (un seul getSession() à la fois)
let _session: Awaited<ReturnType<typeof getSession>> | undefined
let _sessionExpiry = 0
let _sessionPromise: Promise<Awaited<ReturnType<typeof getSession>>> | null = null

async function getCachedSession() {
  if (_session !== undefined && Date.now() < _sessionExpiry) {
    return _session
  }
  if (!_sessionPromise) {
    _sessionPromise = getSession().then(s => {
      _session = s
      _sessionExpiry = Date.now() + 60_000
      _sessionPromise = null
      return s
    })
  }
  return _sessionPromise
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const session = await getCachedSession()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    _session = undefined // Invalide le cache sur 401
    window.location.href = "/login"
    return { data: null, error: "Non authentifié", message: "" }
  }

  if (res.status === 403) {
    window.location.href = "/unauthorized"
    return { data: null, error: "Accès refusé", message: "" }
  }

  try {
    return await res.json()
  } catch {
    return { data: null, error: `Erreur serveur (${res.status})`, message: "" }
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
