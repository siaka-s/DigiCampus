import { apiClient } from "./client"

export type Space = {
  ID: string
  Name: string
  Type: string
  Capacity: number
  Seats: number
  EquipmentFixed: string[]
  IsActive: boolean
}

export type SpaceInput = {
  name: string
  type: string
  capacity: number
  seats: number
  equipment_fixed: string[]
}

export const spacesApi = {
  list: () =>
    apiClient.get<Space[]>("/api/v1/spaces"),

  create: (input: SpaceInput) =>
    apiClient.post<Space>("/api/v1/spaces", input),

  update: (id: string, input: SpaceInput) =>
    apiClient.patch(`/api/v1/spaces/${id}`, input),

  deactivate: (id: string) =>
    apiClient.patch(`/api/v1/spaces/${id}/deactivate`, {}),
}
