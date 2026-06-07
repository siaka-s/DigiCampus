import { apiClient } from "./client"
import { getSession } from "next-auth/react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export type CampusPhoto = {
  id: string
  filename: string
  caption: string
  order_index: number
  is_active: boolean
  created_at: string
}

type ApiResponse<T> = { data: T | null; error: string | null; message: string }

export const photosApi = {
  list: () => apiClient.get<CampusPhoto[]>("/api/v1/photos"),

  upload: async (file: File, caption: string): Promise<ApiResponse<CampusPhoto>> => {
    const session = await getSession()
    const formData = new FormData()
    formData.append("file", file)
    formData.append("caption", caption)

    const res = await fetch(`${API_URL}/api/v1/photos`, {
      method: "POST",
      headers: session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {},
      body: formData,
    })
    return res.json()
  },

  update: (id: string, data: { caption: string; is_active: boolean; order_index: number }) =>
    apiClient.patch<CampusPhoto>(`/api/v1/photos/${id}`, data),

  delete: (id: string) => apiClient.delete<null>(`/api/v1/photos/${id}`),

  url: (filename: string) => `${API_URL}/uploads/${filename}`,
}
