import { apiClient } from "./client"

export type Presence = {
  ID: string
  UserID: string
  SpaceID: string
  Date: string
  DeclaredAt: string
}

export const presenceApi = {
  declare: (space_id: string, dates: string[]) =>
    apiClient.post<Presence[]>("/api/v1/presence", { space_id, dates }),

  getBySpace: (space_id: string, week: string) =>
    apiClient.get<Presence[]>(`/api/v1/presence?space_id=${space_id}&week=${week}`),

  getMyPresence: (week: string) =>
    apiClient.get<Presence[]>(`/api/v1/presence/me?week=${week}`),

  update: (id: string, date: string) =>
    apiClient.patch(`/api/v1/presence/${id}`, { date }),

  checkCapacity: (space_id: string, date: string) =>
    apiClient.get<{ is_over_capacity: boolean; presence_count: number; seats: number }>(
      `/api/v1/presence/capacity?space_id=${space_id}&date=${date}`
    ),
}
