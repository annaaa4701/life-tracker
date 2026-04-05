import { apiClient, type ApiResponse } from "../../lib/api-client"

export interface ActionItem {
  id: string
  title: string
  priority: string
  time?: string
  done: boolean
}

export const actionApi = {
  async searchToday(date?: string): Promise<ApiResponse<{ items: ActionItem[] }>> {
    return apiClient.get<{ items: ActionItem[] }>("/actions", date ? { date } : undefined)
  },

  async completeByTitle(title: string): Promise<ApiResponse<{ updated: boolean; actionId: string }>> {
    return apiClient.post<{ updated: boolean; actionId: string }>("/parse", {
      text: `${title} 완료 처리`,
      persist: true,
      tz: "Asia/Seoul",
      locale: "ko-KR"
    })
  },

  async updateAction(
    actionId: string,
    patch: Record<string, unknown>
  ): Promise<ApiResponse<{ updated: boolean; actionId: string }>> {
    return apiClient.patch<{ updated: boolean; actionId: string }>("/action/update", {
      actionId,
      patch
    })
  }
}
