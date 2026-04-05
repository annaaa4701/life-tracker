import { z } from "zod"

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

const dateSchema = z.string().regex(dateRegex, "Invalid date format (YYYY-MM-DD)")
const timeSchema = z.string().regex(timeRegex, "Invalid time format (HH:mm)")

export const schemas = {
  date: dateSchema,
  time: timeSchema,
  priority: z.enum([
    "Deep Focus 1",
    "Deep Focus 2",
    "Deep Focus 3",
    "Deep Focus 4",
    "Urgent/Scheduled",
    "Quick",
    "Errands"
  ]),
  todayQuery: z.object({
    date: dateSchema.optional(),
    tz: z.string().optional()
  }),
  dailyQuery: z.object({
    date: dateSchema
  }),
  dailyCreate: z.object({
    date: dateSchema,
    name: z.string().min(1).max(200)
  }),
  dailyUpdate: z.object({
    dailyId: z.string().min(1),
    patch: z.object({
      sleepStart: z.string().optional(),
      sleepEnd: z.string().optional(),
      sleepDuration: z.number().optional(),
      sleepQuality: z.number().min(1).max(5).optional(),
      todayFocus: z.string().optional(),
      morningNote: z.string().optional(),
      weather: z.string().optional(),
      morningMood: z.number().optional(),
      routinesCompleted: z.number().optional(),
      routinesTotal: z.number().optional(),
      pomodoroSessions: z.number().optional(),
      pomodoroMinutes: z.number().optional(),
      pomodoroTimeline: z.string().optional(),
      pillarExecute: z.number().min(1).max(5).optional(),
      executeNote: z.string().optional(),
      pillarGrowth: z.number().min(1).max(5).optional(),
      growthNote: z.string().optional(),
      pillarCreate: z.number().min(1).max(5).optional(),
      createNote: z.string().optional(),
      pillarHealth: z.number().min(1).max(5).optional(),
      healthNote: z.string().optional(),
      tomorrowFirst: z.string().optional(),
      tomorrowNote: z.string().optional(),
      journal: z.string().optional()
    })
  }),
  actionCreate: z.object({
    title: z.string().min(1).max(200),
    date: dateSchema.optional(),
    dueDate: dateSchema.optional(),
    time: timeSchema.optional(),
    type: z.string().optional(),
    priority: z
      .enum([
        "🚨 Urgent",
        "📅 Scheduled",
        "⚡ Quick",
        "🔵 Deep Focus 1",
        "🔵 Deep Focus 2",
        "🔵 Deep Focus 3",
        "🔵 Deep Focus 4",
        "🛒 Errand",
        "🔔 Reminder"
      ])
      .optional(),
    pillar: z.string().optional(),
    durationMin: z.number().int().positive().optional(),
    scheduledTime: timeSchema.optional(),
    todayTop: z.boolean().optional(),
    done: z.boolean().optional(),
    note: z.string().optional(),
    projectId: z.string().optional(),
    projectIds: z.array(z.string()).optional(),
    goalId: z.string().optional(),
    goalIds: z.array(z.string()).optional()
  }),
  actionUpdate: z.object({
    actionId: z.string().min(1),
    patch: z.object({
      title: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      pillar: z.string().optional(),
      date: dateSchema.optional(),
      dueDate: dateSchema.optional(),
      time: timeSchema.optional(),
      durationMin: z.number().int().positive().optional(),
      scheduledTime: timeSchema.optional(),
      todayTop: z.boolean().optional(),
      done: z.boolean().optional(),
      note: z.string().optional(),
      projectIds: z.array(z.string()).optional(),
      goalIds: z.array(z.string()).optional()
    })
  }),
  projectCreate: z.object({
    title: z.string().min(1).max(200),
    status: z.string().optional(),
    goalIds: z.array(z.string()).optional(),
    pillar: z.string().optional(),
    notes: z.string().optional()
  }),
  projectUpdate: z.object({
    projectId: z.string().min(1),
    patch: z.object({
      title: z.string().optional(),
      status: z.string().optional(),
      goalIds: z.array(z.string()).optional(),
      pillar: z.string().optional(),
      notes: z.string().optional()
    })
  }),
  parseRequest: z.object({
    text: z.string().min(1).max(500),
    locale: z.string().optional(),
    tz: z.string().optional(),
    persist: z.boolean().optional()
  }),
  neurobitCreate: z.object({
    type: z.enum(["MEDIA", "NOTE", "DOC"]),
    title: z.string().min(1).max(200),
    topicId: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    notes: z.string().max(2000).optional()
  })
}

export const validate = <T>(
  schema: z.ZodSchema,
  data: unknown
): { ok: true; data: T } | { ok: false; errors: z.ZodError } => {
  const result = schema.safeParse(data)
  if (!result.success) {
    return { ok: false, errors: result.error }
  }
  return { ok: true, data: result.data as T }
}
