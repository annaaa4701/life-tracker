import { error, success } from "../lib/response"
import { validate, schemas } from "../lib/validators"
import type { TodayResponse } from "../domain/dto"
import { NotionClient } from "../services/notion/client"
import {
  getCheckbox,
  getDateStart,
  getPlainText,
  getSelectName
} from "../lib/notion-properties"

type Env = {
  NOTION_API_KEY: string
  NOTION_VERSION?: string
  NOTION_DB_ACTIONS_ID: string
  NOTION_DB_ROUTINES_ID: string
}

type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

const isMissing = (value?: string): boolean =>
  !value || value.trim() === "" || value.includes("replace-with-")

const ensureTodayEnv = (env: Env): string[] => {
  const missing: string[] = []
  if (isMissing(env.NOTION_API_KEY)) missing.push("NOTION_API_KEY")
  if (isMissing(env.NOTION_DB_ACTIONS_ID)) missing.push("NOTION_DB_ACTIONS_ID")
  if (isMissing(env.NOTION_DB_ROUTINES_ID)) missing.push("NOTION_DB_ROUTINES_ID")
  return missing
}

const actionDateCandidates = ["Do Date", "DoDate", "Date"]

const getActionFromPage = (page: NotionPage) => {
  const props = page.properties
  return {
    id: page.id,
    title: getPlainText(props, ["Name", "Title"]) || "(제목 없음)",
    priority: getSelectName(props, ["Priority"]) || "Quick",
    time: getPlainText(props, ["Time"]),
    done:
      (getSelectName(props, ["Status"]) || "").toLowerCase() === "done" ||
      getCheckbox(props, ["Done"]) === true
  }
}

const isDeepFocus = (priority: string): boolean => priority.startsWith("Deep Focus")

const sortByPriority = (a: string, b: string): number => {
  const order = [
    "Urgent/Scheduled",
    "Quick",
    "Deep Focus 1",
    "Deep Focus 2",
    "Deep Focus 3",
    "Deep Focus 4",
    "Errands"
  ]
  return order.indexOf(a) - order.indexOf(b)
}

export async function handleToday(
  searchParams: URLSearchParams,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureTodayEnv(typedEnv)
    if (missing.length > 0) {
      return error(
        "CONFIG_ERROR",
        "Worker environment variables are missing",
        { missing },
        500
      )
    }

    const queryData = {
      date: searchParams.get("date") || undefined,
      tz: searchParams.get("tz") || undefined
    }

    const validation = validate(schemas.todayQuery, queryData)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [
          issue.path.join(".") || "unknown",
          issue.message
        ])
      )
      return error("VALIDATION_ERROR", "Invalid query parameters", details, 400)
    }

    const data = validation.data as { date?: string; tz?: string }
    const targetDate = data.date || new Date().toISOString().split("T")[0]

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const actionsRaw = (await notion.queryDatabase(typedEnv.NOTION_DB_ACTIONS_ID, {
      page_size: 100
    })) as { results?: unknown[] }
    const actionPages = (Array.isArray(actionsRaw.results)
      ? actionsRaw.results
      : []) as NotionPage[]

    const actionItems = actionPages
      .filter((page) => {
        const doDate = getDateStart(page.properties, actionDateCandidates)
        return doDate ? doDate.startsWith(targetDate) : false
      })
      .map(getActionFromPage)
      .filter((item) => !item.done)

    const deepFocus = actionItems
      .filter((item) => isDeepFocus(item.priority))
      .sort((a, b) => sortByPriority(a.priority, b.priority))
      .slice(0, 2)

    const queue = actionItems
      .sort((a, b) => sortByPriority(a.priority, b.priority))

    const routinesRaw = (await notion.queryDatabase(typedEnv.NOTION_DB_ROUTINES_ID, {
      page_size: 100
    })) as { results?: unknown[] }
    const routinePages = (Array.isArray(routinesRaw.results)
      ? routinesRaw.results
      : []) as NotionPage[]

    const routines = routinePages
      .map((page) => {
        const props = page.properties
        return {
          id: page.id,
          title: getPlainText(props, ["Name", "Title"]) || "(루틴)",
          active: getCheckbox(props, ["Active"]) ?? true,
          doneToday:
            (getSelectName(props, ["Status"]) || "").toLowerCase() === "done" ||
            getCheckbox(props, ["Done"]) === true
        }
      })
      .filter((item) => item.active)

    const response: TodayResponse = {
      date: targetDate,
      deepFocus,
      queue,
      routines
    }

    return success(response, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}
