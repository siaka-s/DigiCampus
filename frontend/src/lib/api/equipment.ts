import { apiClient } from "./client"

export type Equipment = {
  ID: string
  Type: string
  Name: string
  Status: string
  AssignedTo: string | null
  ReturnDate: string | null
  CreatedAt: string
}

export type EquipmentRequest = {
  ID: string
  EquipmentID: string | null
  UserID: string
  Type: string
  Mission: string | null
  Location: string | null
  StartDate: string
  EndDate: string
  Status: string
  Comment: string | null
  CreatedAt: string
}

export const equipmentApi = {
  list: () =>
    apiClient.get<Equipment[]>("/api/v1/equipment"),

  add: (input: { type: string; name: string }) =>
    apiClient.post<Equipment>("/api/v1/equipment", input),

  update: (id: string, input: { status: string; assigned_to?: string | null; return_date?: string | null }) =>
    apiClient.patch(`/api/v1/equipment/${id}`, input),

  listRequests: () =>
    apiClient.get<EquipmentRequest[]>("/api/v1/equipment/requests"),

  createRequest: (input: {
    type: string
    mission?: string
    location?: string
    start_date: string
    end_date: string
  }) => apiClient.post<EquipmentRequest>("/api/v1/equipment/requests", input),

  createRental: (input: {
    type: string
    location?: string
    start_date: string
    end_date: string
  }) => apiClient.post<EquipmentRequest>("/api/v1/equipment/rentals", { ...input, type: "location_externe" }),

  validate: (id: string) =>
    apiClient.patch(`/api/v1/equipment/requests/${id}/validate`, {}),

  refuse: (id: string, comment: string) =>
    apiClient.patch(`/api/v1/equipment/requests/${id}/refuse`, { comment }),

  closeRental: (id: string) =>
    apiClient.patch(`/api/v1/equipment/rentals/${id}/close`, {}),

  getOverdue: () =>
    apiClient.get<EquipmentRequest[]>("/api/v1/equipment/overdue"),
}
