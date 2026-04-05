export interface TodayResponse {
  date: string
  deepFocus: ActionItem[]
  queue: ActionItem[]
  routines: RoutineItem[]
}

export interface ProjectItem {
  id: string
  title: string
  status: string
  notes?: string
  goalIds?: string[]
}

export interface ActionItem {
  id: string
  title: string
  priority: string
  time?: string
  done: boolean
}

export interface RoutineItem {
  id: string
  title: string
  active: boolean
  doneToday: boolean
}

export interface DailyLogResponse {
  exists: boolean
  daily?: DailyLog
}

export interface ActionPayload {
  title: string
  date?: string
  dueDate?: string
  time?: string
  type?: string
  priority?: string
  pillar?: string
  durationMin?: number
  scheduledTime?: string
  todayTop?: boolean
  done?: boolean
  note?: string
  projectIds?: string[]
  goalIds?: string[]
}

export interface ProjectPayload {
  title: string
  status?: string
  goalIds?: string[]
  pillar?: string
  notes?: string
}

export interface ParseResult {
  strategy: "RULE_BASED" | "AI_FALLBACK"
  intent: "ACTION_CREATE" | "PROJECT_CREATE" | "DAILY_UPSERT" | "ACTION_COMPLETE" | "DAILY_SCORE_UPDATE"
  confidence: number
  parsed: Record<string, unknown>
}

export interface DailyLog {
  id: string
  date: string
  sleepStart?: string
  sleepEnd?: string
  sleepDuration?: number
  sleepQuality?: number
  todayFocus?: string
  morningNote?: string
  weather?: string
  morningMood?: number
  routinesCompleted?: number
  routinesTotal?: number
  pomodoroSessions?: number
  pomodoroMinutes?: number
  pomodoroTimeline?: string
  pillarExecute?: number
  executeNote?: string
  pillarGrowth?: number
  growthNote?: string
  pillarCreate?: number
  createNote?: string
  pillarHealth?: number
  healthNote?: string
  tomorrowFirst?: string
  tomorrowNote?: string
  journal?: string
}

export interface NotionPageProperty {
  id: string
  name: string
  type: string
  [key: string]: unknown
}

export interface NotionDatabase {
  id: string
  properties: Record<string, NotionPageProperty>
}
