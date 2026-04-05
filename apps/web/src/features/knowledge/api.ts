import { apiClient, type ApiResponse } from "../../lib/api-client"

export type KnowledgeType = "MEDIA" | "NOTE" | "DOC"

export interface TopicItem {
  id: string
  name: string
}

export interface NeurobitItem {
  id: string
  title: string
  type: KnowledgeType
  topicName?: string
  sourceUrl?: string
  notes?: string
  createdTime?: string
}

export const knowledgeApi = {
  async getTopics(): Promise<ApiResponse<{ items: TopicItem[] }>> {
    return apiClient.get<{ items: TopicItem[] }>("/topics")
  },

  async getRecentNeurobits(limit = 10): Promise<ApiResponse<{ items: NeurobitItem[] }>> {
    return apiClient.get<{ items: NeurobitItem[] }>("/neurobits", { limit: String(limit) })
  },

  async createNeurobit(payload: {
    type: KnowledgeType
    title: string
    topicId?: string
    sourceUrl?: string
    notes?: string
  }): Promise<ApiResponse<{ neurobitId: string }>> {
    return apiClient.post<{ neurobitId: string }>("/neurobit/create", payload)
  }
}
