import { apiClient, type ApiResponse } from "../../lib/api-client"

export interface DailyLogData {
  exists: boolean
  daily?: {
    id: string
    date: string
    sleepStart?: string
    sleepEnd?: string
    sleepDuration?: number
    sleepQuality?: number
    todayFocus?: string
    pomodoroSessions?: number
    pomodoroMinutes?: number
    pomodoroTimeline?: string
    [key: string]: unknown
  }
}

export const dailyApi = {
  async getDaily(date: string): Promise<ApiResponse<DailyLogData>> {
    return apiClient.get<DailyLogData>("/daily", { date })
  },

  async createDaily(date: string, name: string): Promise<ApiResponse<{ created: boolean; dailyId: string }>> {
    return apiClient.post<{ created: boolean; dailyId: string }>("/daily/create", { date, name })
  },

  async updateDaily(
    dailyId: string,
    patch: Record<string, unknown>
  ): Promise<ApiResponse<{ updated: boolean; dailyId: string }>> {
    return apiClient.patch<{ updated: boolean; dailyId: string }>("/daily/update", { dailyId, patch })
  }
}
