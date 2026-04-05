import { error, success } from "../lib/response"
import { validate, schemas } from "../lib/validators"
import type { DailyLogResponse } from "../domain/dto"
import { NotionClient } from "../services/notion/client"
import {
  getDateStart,
  getNumber,
  getPlainText,
  getSelectName,
  makeDate,
  makeNumber,
  makeRichText,
  makeSelect,
  makeTitle
} from "../lib/notion-properties"

type Env = {
  NOTION_API_KEY: string
  NOTION_VERSION?: string
  NOTION_DB_DAILY_ID: string
}

type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

const isMissing = (value?: string): boolean =>
  !value || value.trim() === "" || value.includes("replace-with-")

const ensureDailyEnv = (env: Env): string[] => {
  const missing: string[] = []
  if (isMissing(env.NOTION_API_KEY)) missing.push("NOTION_API_KEY")
  if (isMissing(env.NOTION_DB_DAILY_ID)) missing.push("NOTION_DB_DAILY_ID")
  return missing
}

const dailyDateCandidates = ["Date", "date"]

const queryDailyByDate = async (
  client: NotionClient,
  dailyDbId: string,
  date: string
): Promise<NotionPage | undefined> => {
  const response = (await client.queryDatabase(dailyDbId, {
    filter: {
      property: "Date",
      date: { equals: date }
    },
    page_size: 1
  })) as { results?: unknown[] }

  if (!Array.isArray(response.results) || response.results.length === 0) {
    return undefined
  }

  return response.results[0] as NotionPage
}

export const upsertDailyPatchByDate = async (
  env: Record<string, unknown>,
  date: string,
  patch: Record<string, unknown>
): Promise<{ created: boolean; dailyId: string }> => {
  const typedEnv = env as Env
  const notion = new NotionClient({
    apiKey: typedEnv.NOTION_API_KEY,
    version: typedEnv.NOTION_VERSION || "2022-06-28"
  })

  const existing = await queryDailyByDate(notion, typedEnv.NOTION_DB_DAILY_ID, date)
  if (existing) {
    await notion.updatePage(existing.id, { properties: toDailyPatchProperties(patch) })
    return { created: false, dailyId: existing.id }
  }

  const created = (await notion.createPage({
    parent: { database_id: typedEnv.NOTION_DB_DAILY_ID },
    properties: {
      Name: makeTitle(`${date} Daily Log`),
      Date: makeDate(date),
      ...toDailyPatchProperties(patch)
    }
  })) as { id: string }

  return { created: true, dailyId: created.id }
}

const mapDailyPage = (page: NotionPage) => {
  const props = page.properties
  return {
    id: page.id,
    date: getDateStart(props, dailyDateCandidates) || "",
    sleepStart: getPlainText(props, ["Sleep Start", "SleepStart"]),
    sleepEnd: getPlainText(props, ["Sleep End", "SleepEnd"]),
    sleepDuration: getNumber(props, ["Sleep Duration", "SleepDuration"]),
    sleepQuality: getNumber(props, ["Sleep Quality", "SleepQuality"]),
    todayFocus: getPlainText(props, ["Today Focus", "TodayFocus"]),
    morningNote: getPlainText(props, ["Morning Note", "MorningNote"]),
    weather: getSelectName(props, ["Weather"]),
    morningMood: getNumber(props, ["Morning Mood", "MorningMood"]),
    routinesCompleted: getNumber(props, ["Routines Completed", "RoutinesCompleted"]),
    routinesTotal: getNumber(props, ["Routines Total", "RoutinesTotal"]),
    pomodoroSessions: getNumber(props, ["Pomodoro Sessions", "포모도로_세션수", "Pomodoro Sessions Count"]),
    pomodoroMinutes: getNumber(props, ["Pomodoro Minutes", "포모도로_분", "Pomodoro Minutes Total"]),
    pomodoroTimeline: getPlainText(props, ["🕐 타임라인", "Pomodoro Timeline", "Pomodoro History"]),
    pillarExecute: getNumber(props, ["Pillar Execute", "PillarExecute"]),
    executeNote: getPlainText(props, ["Execute Note", "ExecuteNote"]),
    pillarGrowth: getNumber(props, ["Pillar Growth", "PillarGrowth"]),
    growthNote: getPlainText(props, ["Growth Note", "GrowthNote"]),
    pillarCreate: getNumber(props, ["Pillar Create", "PillarCreate"]),
    createNote: getPlainText(props, ["Create Note", "CreateNote"]),
    pillarHealth: getNumber(props, ["Pillar Health", "PillarHealth"]),
    healthNote: getPlainText(props, ["Health Note", "HealthNote"]),
    tomorrowFirst: getPlainText(props, ["Tomorrow First", "TomorrowFirst"]),
    tomorrowNote: getPlainText(props, ["Tomorrow Note", "TomorrowNote"]),
    journal: getPlainText(props, ["Journal"])
  }
}

const toDailyPatchProperties = (patch: Record<string, unknown>): Record<string, unknown> => {
  const props: Record<string, unknown> = {}
  const text = (key: string, value: unknown) => {
    if (typeof value === "string") props[key] = makeRichText(value)
  }
  const num = (key: string, value: unknown) => {
    if (typeof value === "number") props[key] = makeNumber(value)
  }

  text("Sleep Start", patch.sleepStart)
  text("Sleep End", patch.sleepEnd)
  num("Sleep Duration", patch.sleepDuration)
  num("Sleep Quality", patch.sleepQuality)
  text("Today Focus", patch.todayFocus)
  text("Morning Note", patch.morningNote)
  if (typeof patch.weather === "string") props.Weather = makeSelect(patch.weather)
  num("Morning Mood", patch.morningMood)
  num("Routines Completed", patch.routinesCompleted)
  num("Routines Total", patch.routinesTotal)
  num("Pomodoro Sessions", patch.pomodoroSessions)
  num("Pomodoro Minutes", patch.pomodoroMinutes)
  text("🕐 타임라인", patch.pomodoroTimeline)
  num("Pillar Execute", patch.pillarExecute)
  text("Execute Note", patch.executeNote)
  num("Pillar Growth", patch.pillarGrowth)
  text("Growth Note", patch.growthNote)
  num("Pillar Create", patch.pillarCreate)
  text("Create Note", patch.createNote)
  num("Pillar Health", patch.pillarHealth)
  text("Health Note", patch.healthNote)
  text("Tomorrow First", patch.tomorrowFirst)
  text("Tomorrow Note", patch.tomorrowNote)
  text("Journal", patch.journal)

  return props
}

export async function handleDailyGet(
  searchParams: URLSearchParams,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureDailyEnv(typedEnv)
    if (missing.length > 0) {
      return error(
        "CONFIG_ERROR",
        "Worker environment variables are missing",
        { missing },
        500
      )
    }

    const queryData = {
      date: searchParams.get("date")
    }

    const validation = validate(schemas.dailyQuery, queryData)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [
          issue.path.join(".") || "unknown",
          issue.message
        ])
      )
      return error("VALIDATION_ERROR", "Invalid query parameters", details, 400)
    }

    const data = validation.data as { date: string }
    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const page = await queryDailyByDate(notion, typedEnv.NOTION_DB_DAILY_ID, data.date)
    const response: DailyLogResponse = {
      exists: !!page,
      daily: page ? mapDailyPage(page) : undefined
    }

    return success(response, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleDailyCreate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureDailyEnv(typedEnv)
    if (missing.length > 0) {
      return error(
        "CONFIG_ERROR",
        "Worker environment variables are missing",
        { missing },
        500
      )
    }

    const validation = validate(schemas.dailyCreate, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [
          issue.path.join(".") || "unknown",
          issue.message
        ])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as { date: string; name: string }
    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const existing = await queryDailyByDate(notion, typedEnv.NOTION_DB_DAILY_ID, data.date)
    if (existing) {
      return success({ created: false, dailyId: existing.id }, 200)
    }

    const created = (await notion.createPage({
      parent: { database_id: typedEnv.NOTION_DB_DAILY_ID },
      properties: {
        Name: makeTitle(data.name),
        Date: makeDate(data.date)
      }
    })) as { id: string }

    return success({ created: true, dailyId: created.id }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleDailyUpdate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureDailyEnv(typedEnv)
    if (missing.length > 0) {
      return error(
        "CONFIG_ERROR",
        "Worker environment variables are missing",
        { missing },
        500
      )
    }

    const validation = validate(schemas.dailyUpdate, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [
          issue.path.join(".") || "unknown",
          issue.message
        ])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as { dailyId: string; patch: Record<string, unknown> }
    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const properties = toDailyPatchProperties(data.patch)
    await notion.updatePage(data.dailyId, { properties })

    return success({ updated: true, dailyId: data.dailyId }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}
