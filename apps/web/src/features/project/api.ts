import { apiClient, type ApiResponse } from "../../lib/api-client"

export interface ProjectItem {
  id: string
  title: string
  status: string
  notes?: string
  goalIds?: string[]
}

export const projectApi = {
  async list(): Promise<ApiResponse<{ items: ProjectItem[] }>> {
    return apiClient.get<{ items: ProjectItem[] }>("/projects")
  }
}
