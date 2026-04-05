import { enqueueOfflineWrite } from "./offline-write-queue"

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean
  data?: T
  queued?: boolean
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export const apiClient = {
  async get<T>(path: string, searchParams?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(BASE_URL + path, window.location.origin)
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    try {
      const response = await fetch(url.toString())
      return response.json() as Promise<ApiResponse<T>>
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : "Network request failed"
        }
      }
    }
  },

  async post<T>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(BASE_URL + path, window.location.origin)
    const payload = body || {}

    try {
      const idempotencyKey = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey
        },
        body: JSON.stringify({ ...payload, requestId: idempotencyKey })
      })
      return response.json() as Promise<ApiResponse<T>>
    } catch (err) {
      const queuedResult = enqueueOfflineWrite("POST", path, payload)
      return {
        ok: false,
        queued: queuedResult.queued,
        error: navigator.onLine
          ? {
              code: "NETWORK_ERROR",
              message: err instanceof Error ? err.message : "Network request failed"
            }
          : {
              code: "OFFLINE_QUEUED",
              message: "오프라인 상태라 요청을 큐에 저장했습니다. 온라인 복귀 시 자동 전송됩니다.",
              details: { idempotencyKey: queuedResult.idempotencyKey }
            }
      }
    }
  },

  async patch<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(BASE_URL + path, window.location.origin)
    const payload = body

    try {
      const idempotencyKey = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey
        },
        body: JSON.stringify({ ...payload, requestId: idempotencyKey })
      })
      return response.json() as Promise<ApiResponse<T>>
    } catch (err) {
      const queuedResult = enqueueOfflineWrite("PATCH", path, payload)
      return {
        ok: false,
        queued: queuedResult.queued,
        error: navigator.onLine
          ? {
              code: "NETWORK_ERROR",
              message: err instanceof Error ? err.message : "Network request failed"
            }
          : {
              code: "OFFLINE_QUEUED",
              message: "오프라인 상태라 요청을 큐에 저장했습니다. 온라인 복귀 시 자동 전송됩니다.",
              details: { idempotencyKey: queuedResult.idempotencyKey }
            }
      }
    }
  }
}
