export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>,
    public status = 400
  ) {
    super(message)
  }
}

export const errors = {
  VALIDATION_ERROR: (details?: Record<string, unknown>) =>
    new ApiError("VALIDATION_ERROR", "Invalid request format", details, 400),
  NOT_FOUND: () => new ApiError("NOT_FOUND", "Resource not found", {}, 404),
  CONFLICT: (message: string) =>
    new ApiError("CONFLICT", message, {}, 409),
  NOTION_ERROR: (message: string) =>
    new ApiError("NOTION_ERROR", `Notion API error: ${message}`, {}, 500),
  INTERNAL_ERROR: (message: string) =>
    new ApiError("INTERNAL_ERROR", message, {}, 500)
}
