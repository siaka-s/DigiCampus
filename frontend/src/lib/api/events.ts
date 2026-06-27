import { apiClient } from "./client"

export type EventType = "formation" | "atelier" | "conference" | "reunion" | "autre"

// Vue collaborateur — champs publics uniquement
export interface CampusEvent {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  location: string
  type: EventType
}

// Vue admin — champs complets
export interface AdminEvent extends CampusEvent {
  created_by: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface CreateEventInput {
  title: string
  description?: string
  date: string
  start_time: string
  end_time: string
  location?: string
  type: EventType
}

export interface UpdateEventInput {
  title?: string
  description?: string
  date?: string
  start_time?: string
  end_time?: string
  location?: string
  type?: EventType
}

export const eventsApi = {
  list: () =>
    apiClient.get<CampusEvent[]>("/api/v1/events"),

  listAll: () =>
    apiClient.get<AdminEvent[]>("/api/v1/events/all"),

  create: (input: CreateEventInput) =>
    apiClient.post<AdminEvent>("/api/v1/events", input),

  update: (id: string, input: UpdateEventInput) =>
    apiClient.patch<null>(`/api/v1/events/${id}`, input),

  publish: (id: string) =>
    apiClient.patch<null>(`/api/v1/events/${id}/publish`, {}),

  unpublish: (id: string) =>
    apiClient.patch<null>(`/api/v1/events/${id}/unpublish`, {}),

  delete: (id: string) =>
    apiClient.delete<null>(`/api/v1/events/${id}`),
}
