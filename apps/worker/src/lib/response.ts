type JsonData = Record<string, unknown>

type ApiResponse<T = JsonData> = {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export const json = <T = JsonData>(
  data: ApiResponse<T>,
  status = 200
): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  })
}

export const success = <T = JsonData>(data: T, status = 200): Response =>
  json({ ok: true, data }, status)

export const error = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
  status = 400
): Response =>
  json({ ok: false, error: { code, message, details } }, status)
