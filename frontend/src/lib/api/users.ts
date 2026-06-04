import { apiClient } from "./client"

export type User = {
  ID: string
  Email: string
  Role: string
  Department: string | null
  IsActive: boolean
}

export const usersApi = {
  list: () =>
    apiClient.get<User[]>("/api/v1/users"),

  activate: (id: string) =>
    apiClient.patch(`/api/v1/users/${id}/activate`, {}),

  deactivate: (id: string) =>
    apiClient.delete(`/api/v1/users/${id}`),

  updateRole: (id: string, role: string) =>
    apiClient.patch(`/api/v1/users/${id}/role`, { role }),

  updateDepartment: (id: string, department: string | null) =>
    apiClient.patch(`/api/v1/users/${id}/department`, { department }),
}
