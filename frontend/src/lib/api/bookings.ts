import { apiClient } from "./client"

export type Booking = {
  ID: string
  SpaceID: string
  UserID: string
  Program: string
  StartTime: string
  Duration: number
  Participants: number
  Status: string
  IsUrgent: boolean
  Comment: string | null
  CreatedAt: string
}

export type BookingInput = {
  space_id: string
  program: string
  start_time: string
  duration: number
  participants: number
  is_urgent?: boolean
}

export const bookingsApi = {
  list: () =>
    apiClient.get<Booking[]>("/api/v1/bookings"),

  create: (input: BookingInput) =>
    apiClient.post<Booking>("/api/v1/bookings", input),

  createUrgent: (input: BookingInput) =>
    apiClient.post<Booking>("/api/v1/bookings/urgent", { ...input, is_urgent: true }),

  validate: (id: string) =>
    apiClient.patch(`/api/v1/bookings/${id}/validate`, {}),

  refuse: (id: string, comment: string) =>
    apiClient.patch(`/api/v1/bookings/${id}/refuse`, { comment }),

  cancel: (id: string) =>
    apiClient.patch(`/api/v1/bookings/${id}/cancel`, {}),

  createDirect: (input: {
    space_id: string
    program: string
    start_time: string
    duration: number
    participants: number
  }) => apiClient.post<Booking>("/api/v1/bookings/direct", input),

  createRecurring: (input: {
    space_id: string
    program: string
    start_date: string
    end_date: string
    start_hour: number
    start_minute: number
    duration: number
    participants: number
    days_of_week: number[]
  }) => apiClient.post<Booking[]>("/api/v1/bookings/recurring", input),
}
