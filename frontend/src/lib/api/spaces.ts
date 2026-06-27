import { apiClient } from "./client"

export type Space = {
  id: string
  name: string
  type: string
  capacity: number
  seats: number
  location: string
  equipment_fixed: string[]
  departments: { id: string; name: string }[]
  is_active: boolean
}

export type SpaceInput = {
  name: string
  type: string
  capacity: number
  seats: number
  location: string
  equipment_fixed: string[]
  department_ids: string[]
}

export const spacesApi = {
  list: () =>
    apiClient.get<Space[]>("/api/v1/spaces"),

  create: (input: SpaceInput) =>
    apiClient.post<Space>("/api/v1/spaces", input),

  update: (id: string, input: SpaceInput) =>
    apiClient.patch<Space>(`/api/v1/spaces/${id}`, input),

  deactivate: (id: string) =>
    apiClient.patch(`/api/v1/spaces/${id}/deactivate`, {}),

  available: (startTime: string, duration: number, participants: number, endDate?: string) => {
    let url = `/api/v1/spaces/available?start_time=${encodeURIComponent(startTime)}&duration=${duration}&participants=${participants}`
    if (endDate) url += `&end_date=${endDate}`
    return apiClient.get<Space[]>(url)
  },
}
