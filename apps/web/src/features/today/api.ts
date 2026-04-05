import { apiClient } from "../../lib/api-client"

export interface TodayData {
  date: string
  deepFocus: Array<{ id: string; title: string; priority: string; done: boolean }>
  queue: Array<{ id: string; title: string; priority: string; time?: string; done: boolean }>
  routines: Array<{ id: string; title: string; active: boolean; doneToday: boolean }>
}

export const todayApi = {
  async getToday(date?: string) {
    const params: Record<string, string> = {}
    if (date) {
      params.date = date
    }

    return apiClient.get<TodayData>("/today", params)
  }
}
