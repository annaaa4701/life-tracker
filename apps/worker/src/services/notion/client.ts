export interface NotionClientConfig {
  apiKey: string
  version: string
}

export interface QueryDatabasePayload {
  filter?: Record<string, unknown>
  sorts?: Record<string, unknown>[]
  [key: string]: unknown
}

export class NotionClient {
  private apiKey: string
  private version: string
  private baseUrl = "https://api.notion.com/v1"

  constructor({ apiKey, version }: NotionClientConfig) {
    this.apiKey = apiKey
    this.version = version
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: HeadersInit = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Notion-Version": this.version,
      "Content-Type": "application/json"
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, any>
      throw new Error(`Notion API error: ${errorData.message || response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async queryDatabase(databaseId: string, payload?: QueryDatabasePayload) {
    return this.request(
      "POST",
      `/databases/${databaseId}/query`,
      payload || {}
    )
  }

  async getDatabase(databaseId: string) {
    return this.request("GET", `/databases/${databaseId}`)
  }

  async getPage(pageId: string) {
    return this.request("GET", `/pages/${pageId}`)
  }

  async createPage(payload: Record<string, unknown>) {
    return this.request("POST", "/pages", payload)
  }

  async updatePage(pageId: string, payload: Record<string, unknown>) {
    return this.request("PATCH", `/pages/${pageId}`, payload)
  }
}
