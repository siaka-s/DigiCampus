import { apiClient } from "./client"

export type Department = {
  id: string
  name: string
  category: string
  is_active: boolean
  created_at: string
}

export const departmentsApi = {
  // Public — dropdown inscription (pas d'auth)
  listActive: async (): Promise<Department[]> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    try {
      const res = await fetch(`${apiUrl}/api/v1/departments`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data?.data) ? data.data : []
    } catch {
      return []
    }
  },

  // Admin — tous les départements
  list: () => apiClient.get<Department[]>("/api/v1/departments/all"),

  create: (name: string, category: string) =>
    apiClient.post<Department>("/api/v1/departments", { name, category }),

  update: (id: string, name: string) =>
    apiClient.patch(`/api/v1/departments/${id}`, { name }),

  deactivate: (id: string) =>
    apiClient.patch(`/api/v1/departments/${id}/deactivate`, {}),

  activate: (id: string) =>
    apiClient.patch(`/api/v1/departments/${id}/activate`, {}),
}
