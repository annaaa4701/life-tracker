import { error, success } from "../lib/response"
import { validate, schemas } from "../lib/validators"
import { NotionClient } from "../services/notion/client"
import {
  getPlainText,
  getSelectName,
  getRelationIds,
  makeRelation,
  makeRichText,
  makeSelect,
  makeStatus,
  makeTitle
} from "../lib/notion-properties"
import type { ProjectItem } from "../domain/dto"

type Env = {
  NOTION_API_KEY: string
  NOTION_VERSION?: string
  NOTION_DB_PROJECTS_ID: string
}

type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

type ResolvedProjectSchema = {
  titleProperty: string
  statusProperty?: string
  notesProperty?: string
  pillarProperty?: string
  goalsProperty?: string
}

const isMissing = (value?: string): boolean =>
  !value || value.trim() === "" || value.includes("replace-with-")

const ensureProjectEnv = (env: Env): string[] => {
  const missing: string[] = []
  if (isMissing(env.NOTION_API_KEY)) missing.push("NOTION_API_KEY")
  if (isMissing(env.NOTION_DB_PROJECTS_ID)) missing.push("NOTION_DB_PROJECTS_ID")
  return missing
}

const resolveProjectSchema = async (
  notion: NotionClient,
  projectsDbId: string
): Promise<ResolvedProjectSchema> => {
  const database = (await notion.getDatabase(projectsDbId)) as {
    properties?: Record<string, { type?: string }>
  }

  const properties = database.properties || {}
  const entries = Object.entries(properties)

  const titleProperty =
    entries.find(([, property]) => property?.type === "title")?.[0] || "Project"

  const selectProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "select")

  const richTextProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "rich_text")

  const relationProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "relation")

  return {
    titleProperty,
    statusProperty: selectProperty(["Status", "상태"]),
    notesProperty: richTextProperty(["Notes", "Note", "메모"]),
    pillarProperty: selectProperty(["🧭 Pillars", "Pillars", "Pillar"]),
    goalsProperty: relationProperty(["Goals", "🎯 Goals"])
  }
}

const mapProjectPage = (page: NotionPage, schema: ResolvedProjectSchema): ProjectItem => {
  const props = page.properties
  return {
    id: page.id,
    title: getPlainText(props, [schema.titleProperty, "Project", "Name", "Title", "이름"]) || "(프로젝트)",
    status: getSelectName(props, [schema.statusProperty || "", "Status", "상태"]) || "Active",
    notes: getPlainText(props, [schema.notesProperty || "", "Notes", "Note", "메모"]),
    goalIds: getRelationIds(props, [schema.goalsProperty || "", "Goals", "🎯 Goals"])
  }
}

const toProjectProperties = (
  data: Record<string, unknown>,
  schema: ResolvedProjectSchema
): Record<string, unknown> => {
  const props: Record<string, unknown> = {}
  if (typeof data.title === "string") props[schema.titleProperty] = makeTitle(data.title)
  if (typeof data.status === "string" && schema.statusProperty) props[schema.statusProperty] = makeStatus(data.status)
  if (typeof data.pillar === "string" && schema.pillarProperty) props[schema.pillarProperty] = makeSelect(data.pillar)
  if (typeof data.notes === "string" && schema.notesProperty) props[schema.notesProperty] = makeRichText(data.notes)
  if (Array.isArray(data.goalIds) && data.goalIds.length > 0 && schema.goalsProperty) props[schema.goalsProperty] = makeRelation(data.goalIds)
  return props
}

export async function handleProjectCreate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureProjectEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const validation = validate(schemas.projectCreate, payload)
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
    const schema = await resolveProjectSchema(notion, typedEnv.NOTION_DB_PROJECTS_ID)

    const created = (await notion.createPage({
      parent: { database_id: typedEnv.NOTION_DB_PROJECTS_ID },
      properties: toProjectProperties({
        ...data,
        status: typeof data.status === "string" ? data.status : "Active"
      }, schema)
    })) as { id: string }

    return success({ projectId: created.id }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleProjectUpdate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureProjectEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const validation = validate(schemas.projectUpdate, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [issue.path.join(".") || "unknown", issue.message])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as { projectId: string; patch: Record<string, unknown> }
    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })
    const schema = await resolveProjectSchema(notion, typedEnv.NOTION_DB_PROJECTS_ID)

    await notion.updatePage(data.projectId, {
      properties: toProjectProperties(data.patch, schema)
    })

    return success({ updated: true, projectId: data.projectId }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleProjectList(
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureProjectEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })
    const schema = await resolveProjectSchema(notion, typedEnv.NOTION_DB_PROJECTS_ID)

    const response = (await notion.queryDatabase(typedEnv.NOTION_DB_PROJECTS_ID, {
      page_size: 100
    })) as { results?: unknown[] }

    const items = (Array.isArray(response.results) ? response.results : []).map((item) =>
      mapProjectPage(item as NotionPage, schema)
    )

    return success({ items }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}
