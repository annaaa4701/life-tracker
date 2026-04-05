import { apiClient, type ApiResponse } from "../../lib/api-client"
import type { ParseResponse } from "./types"

export const addApi = {
  async parse(text: string, persist = false): Promise<ApiResponse<ParseResponse>> {
    return apiClient.post<ParseResponse>("/parse", {
      text,
      persist,
      tz: "Asia/Seoul",
      locale: "ko-KR"
    })
  }
}
