type WriteMethod = "POST" | "PATCH"

type QueueItem = {
  idempotencyKey: string
  method: WriteMethod
  path: string
  body: Record<string, unknown>
  createdAt: number
}

const STORAGE_KEY = "lt-offline-write-queue-v1"
let replayInProgress = false

const safeParse = (raw: string | null): QueueItem[] => {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as QueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const readQueue = (): QueueItem[] => safeParse(window.localStorage.getItem(STORAGE_KEY))

const writeQueue = (items: QueueItem[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const hashString = (value: string): string => {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }
  return Math.abs(hash >>> 0).toString(36)
}

const makeIdempotencyKey = (
  method: WriteMethod,
  path: string,
  body: Record<string, unknown>
): string => {
  const payload = JSON.stringify(body)
  const fingerprint = hashString(`${method}:${path}:${payload}`)
  return `req_${fingerprint}`
}

const buildUrl = (baseUrl: string, path: string): string =>
  new URL(baseUrl + path, window.location.origin).toString()

const fetchWrite = async (
  baseUrl: string,
  item: QueueItem
): Promise<boolean> => {
  try {
    const response = await fetch(buildUrl(baseUrl, item.path), {
      method: item.method,
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": item.idempotencyKey
      },
      body: JSON.stringify({ ...item.body, requestId: item.idempotencyKey })
    })

    return response.ok
  } catch {
    return false
  }
}

export const enqueueOfflineWrite = (
  method: WriteMethod,
  path: string,
  body: Record<string, unknown>
): { idempotencyKey: string; queued: boolean } => {
  const idempotencyKey = makeIdempotencyKey(method, path, body)
  const queue = readQueue()

  if (queue.some((item) => item.idempotencyKey === idempotencyKey)) {
    return { idempotencyKey, queued: false }
  }

  queue.push({
    idempotencyKey,
    method,
    path,
    body,
    createdAt: Date.now()
  })

  writeQueue(queue)
  return { idempotencyKey, queued: true }
}

export const flushOfflineWriteQueue = async (baseUrl: string): Promise<number> => {
  if (replayInProgress) return 0
  if (!navigator.onLine) return 0

  replayInProgress = true

  const queue = readQueue()
  if (queue.length === 0) {
    replayInProgress = false
    return 0
  }

  const remaining: QueueItem[] = []
  let flushed = 0

  for (const item of queue) {
    const ok = await fetchWrite(baseUrl, item)
    if (ok) {
      flushed += 1
    } else {
      remaining.push(item)
    }
  }

  writeQueue(remaining)
  replayInProgress = false
  return flushed
}

export const startOfflineWriteQueueReplay = (baseUrl: string) => {
  const runReplay = () => {
    void flushOfflineWriteQueue(baseUrl)
  }

  runReplay()
  window.addEventListener("online", runReplay)
}
