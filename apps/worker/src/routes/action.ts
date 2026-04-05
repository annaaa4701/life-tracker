import { error, success } from "../lib/response"
import { validate, schemas } from "../lib/validators"
import { NotionClient } from "../services/notion/client"
import {
  getCheckbox,
  getPlainText,
  getSelectName,
  makeCheckbox,
  makeDate,
  makeNumber,
  makeRelation,
  makeRichText,
  makeSelect,
  makeStatus,
  makeTitle
} from "../lib/notion-properties"
import type { ActionItem } from "../domain/dto"

type Env = {
  NOTION_API_KEY: string
  NOTION_VERSION?: string
  NOTION_DB_ACTIONS_ID: string
}

type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

type Environment = Env & {
  NOTION_DB_PROJECTS_ID?: string
  NOTION_DB_GOALS_ID?: string
}

const isMissing = (value?: string): boolean =>
  !value || value.trim() === "" || value.includes("replace-with-")

const ensureActionEnv = (env: Env): string[] => {
  const missing: string[] = []
  if (isMissing(env.NOTION_API_KEY)) missing.push("NOTION_API_KEY")
  if (isMissing(env.NOTION_DB_ACTIONS_ID)) missing.push("NOTION_DB_ACTIONS_ID")
  return missing
}

const inferPillar = (text: string): string => {
  if (/운동|걷기|헬스|수영|건강|잠|식사/i.test(text)) return "💚 건강"
  if (/공부|학습|읽기|리서치|공부하기|스터디/i.test(text)) return "🌱 성장"
  if (/창작|작성|디자인|그리기|영상|글쓰기|만들/i.test(text)) return "🎨 창조"
  return "⚡ 실행"
}

const inferPriority = (text: string): string => {
  if (/긴급|urgent/i.test(text)) return "🚨 Urgent"
  if (/오늘|scheduled|예약|일정/i.test(text)) return "📅 Scheduled"
  if (/심부름|errand/i.test(text)) return "🛒 Errand"
  if (/리마인더|remind/i.test(text)) return "🔔 Reminder"
  if (/딥포커스|deep focus 1/i.test(text)) return "🔵 Deep Focus 1"
  return "⚡ Quick"
}

const extractTitles = async (
  notion: NotionClient,
  databaseId: string | undefined,
  keywords: string[]
): Promise<string[]> => {
  if (!databaseId) return []

  const response = (await notion.queryDatabase(databaseId, { page_size: 100 })) as {
    results?: unknown[]
  }

  const pages = (Array.isArray(response.results) ? response.results : []) as NotionPage[]
  return pages
    .map((page) => getPlainText(page.properties, ["Action Item", "Project", "Name", "Title"]))
    .filter((title): title is string => Boolean(title))
    .filter((title) => keywords.some((keyword) => title.includes(keyword)))
}

const inferRelationsFromText = async (
  notion: NotionClient,
  env: Environment,
  text: string
): Promise<{ projectIds: string[]; goalIds: string[] }> => {
  const keywords = text
    .replace(/[#:,()/]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

  const projectIds: string[] = []
  const goalIds: string[] = []

  if (env.NOTION_DB_PROJECTS_ID) {
    const response = (await notion.queryDatabase(env.NOTION_DB_PROJECTS_ID, { page_size: 100 })) as {
      results?: unknown[]
    }
    const pages = (Array.isArray(response.results) ? response.results : []) as NotionPage[]
    for (const page of pages) {
      const title = getPlainText(page.properties, ["Project", "Name", "Title", "이름"])
      if (title && keywords.some((keyword) => title.includes(keyword) || keyword.includes(title))) {
        projectIds.push(page.id)
      }
    }
  }

  if (env.NOTION_DB_GOALS_ID) {
    const response = (await notion.queryDatabase(env.NOTION_DB_GOALS_ID, { page_size: 100 })) as {
      results?: unknown[]
    }
    const pages = (Array.isArray(response.results) ? response.results : []) as NotionPage[]
    for (const page of pages) {
      const title = getPlainText(page.properties, ["Goal", "Name", "Title", "이름"])
      if (title && keywords.some((keyword) => title.includes(keyword) || keyword.includes(title))) {
        goalIds.push(page.id)
      }
    }
  }

  return { projectIds: [...new Set(projectIds)], goalIds: [...new Set(goalIds)] }
}

const queryActionByTitle = async (
  client: NotionClient,
  actionDbId: string,
  title: string
): Promise<NotionPage | undefined> => {
  const response = (await client.queryDatabase(actionDbId, {
    filter: {
      property: "Action Item",
      title: { contains: title }
    },
    page_size: 1
  })) as { results?: unknown[] }

  if (!Array.isArray(response.results) || response.results.length === 0) {
    return undefined
  }

  return response.results[0] as NotionPage
}

const mapActionPage = (page: NotionPage): ActionItem => {
  const props = page.properties
  const title = getPlainText(props, ["Action Item", "Name", "Title"]) || "(제목 없음)"
  const priority = getSelectName(props, ["Priority"]) || "Quick"
  const status = getSelectName(props, ["Status"]) || "Active"
  const done =
    getCheckbox(props, ["Done"]) === true || status === "✅ Done" || status.toLowerCase() === "done"

  return {
    id: page.id,
    title,
    priority,
    time: getPlainText(props, ["Scheduled Time", "Time"]),
    done
  }
}

const toActionProperties = (data: Record<string, unknown>): Record<string, unknown> => {
  const props: Record<string, unknown> = {}

  if (typeof data.title === "string") props["Action Item"] = makeTitle(data.title)
  if (typeof data.status === "string") props.Status = makeStatus(data.status)
  if (typeof data.priority === "string") props.Priority = makeSelect(data.priority)
  if (typeof data.pillar === "string") props["🧭 Pillar"] = makeSelect(data.pillar)
  if (typeof data.date === "string") props["Do Date"] = makeDate(data.date)
  if (typeof data.dueDate === "string") props["Due Date"] = makeDate(data.dueDate)
  if (typeof data.time === "string") props.Time = makeRichText(data.time)
  if (typeof data.scheduledTime === "string") props["Scheduled Time"] = makeRichText(data.scheduledTime)
  if (typeof data.durationMin === "number") props.Duration = makeNumber(data.durationMin)
  if (typeof data.todayTop === "boolean") props["오늘 Top"] = makeCheckbox(data.todayTop)
  if (typeof data.done === "boolean") props.Done = makeCheckbox(data.done)
  if (typeof data.note === "string") props.Note = makeRichText(data.note)

  const projectIds = [
    ...(Array.isArray(data.projectIds) ? data.projectIds : []),
    typeof data.projectId === "string" ? data.projectId : ""
  ].filter((id): id is string => Boolean(id))
  if (projectIds.length > 0) props.Project = makeRelation(projectIds)

  const goalIds = [
    ...(Array.isArray(data.goalIds) ? data.goalIds : []),
    typeof data.goalId === "string" ? data.goalId : ""
  ].filter((id): id is string => Boolean(id))
  if (goalIds.length > 0) props.Goals = makeRelation(goalIds)

  return props
}

const buildActionPatch = (patch: Record<string, unknown>): Record<string, unknown> =>
  toActionProperties(patch)

const parseActionPriority = (text: string): string => inferPriority(text)

export async function handleActionCreate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureActionEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const validation = validate(schemas.actionCreate, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [issue.path.join(".") || "unknown", issue.message])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as Record<string, unknown>
    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const resolvedText = typeof data.title === "string" ? data.title : ""
    const inferredPillar = typeof data.pillar === "string" ? data.pillar : inferPillar(resolvedText)
    const inferredPriority = typeof data.priority === "string" ? data.priority : inferPriority(resolvedText)
    const relations = await inferRelationsFromText(notion, typedEnv as Environment, resolvedText)

    const created = (await notion.createPage({
      parent: { database_id: typedEnv.NOTION_DB_ACTIONS_ID },
      properties: toActionProperties({
        ...data,
        status: typeof data.done === "boolean" && data.done ? "✅ Done" : "🔄 Active",
        priority: inferredPriority,
        pillar: inferredPillar,
        date: typeof data.date === "string" ? data.date : new Date().toISOString().split("T")[0],
        dueDate: typeof data.dueDate === "string" ? data.dueDate : undefined,
        note: typeof data.note === "string" ? data.note : undefined,
        projectIds: Array.isArray(data.projectIds) && data.projectIds.length > 0 ? data.projectIds : relations.projectIds,
        goalIds: Array.isArray(data.goalIds) && data.goalIds.length > 0 ? data.goalIds : relations.goalIds
      })
    })) as { id: string }

    return success({ actionId: created.id }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleActionUpdate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureActionEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const validation = validate(schemas.actionUpdate, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [issue.path.join(".") || "unknown", issue.message])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as { actionId: string; patch: Record<string, unknown> }
    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    if (typeof data.patch.title === "string" && !data.patch.pillar) {
      data.patch.pillar = inferPillar(data.patch.title)
    }

    await notion.updatePage(data.actionId, { properties: buildActionPatch(data.patch) })
    return success({ updated: true, actionId: data.actionId }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleActionCompleteByTitle(
  title: string,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureActionEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const page = await queryActionByTitle(notion, typedEnv.NOTION_DB_ACTIONS_ID, title)
    if (!page) {
      return error("NOT_FOUND", "Action not found", { title }, 404)
    }

    await notion.updatePage(page.id, {
      properties: {
        Status: makeStatus("✅ Done"),
        Done: makeCheckbox(true)
      }
    })

    return success({ updated: true, actionId: page.id }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleActionSearch(
  searchParams: URLSearchParams,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureActionEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const date = searchParams.get("date") || undefined
    const response = (await notion.queryDatabase(typedEnv.NOTION_DB_ACTIONS_ID, {
      page_size: 100,
      ...(date
        ? {
            filter: {
              property: "Do Date",
              date: { equals: date }
            }
          }
        : {})
    })) as { results?: unknown[] }

    const items = (Array.isArray(response.results) ? response.results : []).map((item) =>
      mapActionPage(item as NotionPage)
    )
    return success({ items }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export { mapActionPage, parseActionPriority }
