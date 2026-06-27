import { apiClient } from "./client"

export interface Notification {
  ID:          string
  UserID:      string
  Type:        string
  Message:     string
  IsRead:      boolean
  ReferenceID: string | null
  CreatedAt:   string
}

export const notificationsApi = {
  list: () =>
    apiClient.get<Notification[]>("/api/v1/notifications"),

  markRead: (id: string) =>
    apiClient.patch<null>(`/api/v1/notifications/${id}/read`, {}),

  markAllRead: () =>
    apiClient.patch<null>("/api/v1/notifications/read-all", {}),
}
