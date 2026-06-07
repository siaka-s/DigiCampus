import { apiClient } from "./client"

export type OccupancyBooking = {
  id: string
  program: string
  start_time: string
  duration: number
  status: string
}

export type OccupancyItem = {
  id: string
  name: string
  type: string
  capacity: number
  seats: number
  equipment_fixed: string[]
  bookings: OccupancyBooking[]
  presence_count: number
  is_over_capacity: boolean
}

export const occupancyApi = {
  get: (date: string) =>
    apiClient.get<OccupancyItem[]>(`/api/v1/spaces/occupancy?date=${date}`),

  // 1 requête HTTP au lieu de 7 — endpoint dédié semaine
  getWeek: (monday: string): Promise<OccupancyItem[][]> =>
    apiClient
      .get<OccupancyItem[][]>(`/api/v1/spaces/occupancy/week?monday=${monday}`)
      .then(r => r.data ?? []),
}
