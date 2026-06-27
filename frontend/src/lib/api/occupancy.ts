import { apiClient } from "./client"

export type OccupancyBooking = {
  id: string
  program: string
  start_time: string
  duration: number
  status: string
  responsible_email: string
}

export type OccupancyItem = {
  id: string
  name: string
  type: string
  capacity: number
  seats: number
  location: string
  equipment_fixed: string[]
  departments: { id: string; name: string }[]
  bookings: OccupancyBooking[]
  presence_count: number
  is_over_capacity: boolean
}

export type DailyOccupancyRate = {
  date:     string
  occupied: number
  total:    number
}

export const occupancyApi = {
  get: (date: string) =>
    apiClient.get<OccupancyItem[]>(`/api/v1/spaces/occupancy?date=${date}`),

  getWeek: (monday: string): Promise<OccupancyItem[][]> =>
    apiClient
      .get<OccupancyItem[][]>(`/api/v1/spaces/occupancy/week?monday=${monday}`)
      .then(r => r.data ?? []),

  getMonth: (month: string): Promise<DailyOccupancyRate[]> =>
    apiClient
      .get<DailyOccupancyRate[]>(`/api/v1/spaces/occupancy/month?month=${month}`)
      .then(r => r.data ?? []),
}
