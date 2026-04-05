import { error, success } from "../lib/response"
import { validate, schemas } from "../lib/validators"
import { NotionClient } from "../services/notion/client"
import {
  getPlainText,
  getRelationIds,
  getSelectName,
  getUrl,
  makeRelation,
  makeRichText,
  makeSelect,
  makeTitle,
  makeUrl
} from "../lib/notion-properties"

type Env = {
  NOTION_API_KEY: string
  NOTION_VERSION?: string
  NOTION_DB_NEUROBITS_ID: string
  NOTION_DB_TOPICS_ID: string
}

type NotionPage = {
  id: string
  created_time?: string
  properties: Record<string, unknown>
}

type ResolvedTopicSchema = {
  titleProperty: string
}

type ResolvedNeurobitSchema = {
  titleProperty: string
  typeProperty?: string
  topicRelationProperty?: string
  topicTextProperty?: string
  sourceUrlProperty?: string
  notesProperty?: string
}

const isMissing = (value?: string): boolean =>
  !value || value.trim() === "" || value.includes("replace-with-")

const ensureKnowledgeEnv = (env: Env): string[] => {
  const missing: string[] = []
  if (isMissing(env.NOTION_API_KEY)) missing.push("NOTION_API_KEY")
  if (isMissing(env.NOTION_DB_NEUROBITS_ID)) missing.push("NOTION_DB_NEUROBITS_ID")
  if (isMissing(env.NOTION_DB_TOPICS_ID)) missing.push("NOTION_DB_TOPICS_ID")
  return missing
}

const resolveTopicSchema = async (
  notion: NotionClient,
  topicsDbId: string
): Promise<ResolvedTopicSchema> => {
  const database = (await notion.getDatabase(topicsDbId)) as {
    properties?: Record<string, { type?: string }>
  }

  const properties = database.properties || {}
  const entries = Object.entries(properties)

  const titleProperty =
    entries.find(([, property]) => property?.type === "title")?.[0] || "Name"

  return { titleProperty }
}

const resolveNeurobitSchema = async (
  notion: NotionClient,
  neurobitsDbId: string
): Promise<ResolvedNeurobitSchema> => {
  const database = (await notion.getDatabase(neurobitsDbId)) as {
    properties?: Record<string, { type?: string }>
  }

  const properties = database.properties || {}
  const entries = Object.entries(properties)

  const titleProperty =
    entries.find(([, property]) => property?.type === "title")?.[0] || "Title"

  const selectProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "select")

  const relationProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "relation")

  const richTextProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "rich_text")

  const urlProperty = (candidates: string[]) =>
    candidates.find((name) => properties[name]?.type === "url")

  return {
    titleProperty,
    typeProperty: selectProperty(["Type", "유형", "Kind"]),
    topicRelationProperty: relationProperty(["Topic", "Topics", "주제", "Topic Vault"]),
    topicTextProperty: richTextProperty(["Topic Name", "Topic", "주제"]),
    sourceUrlProperty: urlProperty(["Source URL", "URL", "Link", "출처"]),
    notesProperty: richTextProperty(["Notes", "Note", "요약", "Memo", "메모"])
  }
}

const mapTopicPage = (
  page: NotionPage,
  schema: ResolvedTopicSchema
): { id: string; name: string } => ({
  id: page.id,
  name: getPlainText(page.properties, [schema.titleProperty, "Name", "Topic", "Title", "이름"]) || "(주제)"
})

const toNeurobitProperties = (
  payload: {
    type: string
    title: string
    topicId?: string
    topicName?: string
    sourceUrl?: string
    notes?: string
  },
  schema: ResolvedNeurobitSchema
): Record<string, unknown> => {
  const properties: Record<string, unknown> = {
    [schema.titleProperty]: makeTitle(payload.title)
  }

  if (schema.typeProperty) {
    properties[schema.typeProperty] = makeSelect(payload.type)
  }

  if (payload.topicId && schema.topicRelationProperty) {
    properties[schema.topicRelationProperty] = makeRelation([payload.topicId])
  } else if (payload.topicName && schema.topicTextProperty) {
    properties[schema.topicTextProperty] = makeRichText(payload.topicName)
  }

  if (payload.sourceUrl && schema.sourceUrlProperty) {
    properties[schema.sourceUrlProperty] = makeUrl(payload.sourceUrl)
  }

  if (payload.notes && schema.notesProperty) {
    properties[schema.notesProperty] = makeRichText(payload.notes)
  }

  return properties
}

export async function handleTopicList(
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureKnowledgeEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const topicSchema = await resolveTopicSchema(notion, typedEnv.NOTION_DB_TOPICS_ID)
    const result = (await notion.queryDatabase(typedEnv.NOTION_DB_TOPICS_ID, {
      page_size: 100
    })) as { results?: unknown[] }

    const items = (Array.isArray(result.results) ? result.results : []).map((item) =>
      mapTopicPage(item as NotionPage, topicSchema)
    )

    return success({ items }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleNeurobitCreate(
  payload: unknown,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureKnowledgeEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const validation = validate(schemas.neurobitCreate, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [issue.path.join(".") || "unknown", issue.message])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as {
      type: "MEDIA" | "NOTE" | "DOC"
      title: string
      topicId?: string
      sourceUrl?: string
      notes?: string
    }

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const topicSchema = await resolveTopicSchema(notion, typedEnv.NOTION_DB_TOPICS_ID)
    const neurobitSchema = await resolveNeurobitSchema(notion, typedEnv.NOTION_DB_NEUROBITS_ID)

    let topicName: string | undefined
    if (data.topicId) {
      const page = (await notion.getPage(data.topicId)) as NotionPage
      topicName = getPlainText(page.properties, [topicSchema.titleProperty, "Name", "Topic", "Title", "이름"])
    }

    const created = (await notion.createPage({
      parent: { database_id: typedEnv.NOTION_DB_NEUROBITS_ID },
      properties: toNeurobitProperties(
        {
          ...data,
          topicName
        },
        neurobitSchema
      )
    })) as { id: string }

    return success({ neurobitId: created.id }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}

export async function handleNeurobitList(
  searchParams: URLSearchParams,
  env: Record<string, unknown>
): Promise<Response> {
  try {
    const typedEnv = env as Env
    const missing = ensureKnowledgeEnv(typedEnv)
    if (missing.length > 0) {
      return error("CONFIG_ERROR", "Worker environment variables are missing", { missing }, 500)
    }

    const notion = new NotionClient({
      apiKey: typedEnv.NOTION_API_KEY,
      version: typedEnv.NOTION_VERSION || "2022-06-28"
    })

    const neurobitSchema = await resolveNeurobitSchema(notion, typedEnv.NOTION_DB_NEUROBITS_ID)
    const limit = Number(searchParams.get("limit") || "10")

    const topicsSchema = await resolveTopicSchema(notion, typedEnv.NOTION_DB_TOPICS_ID)
    const topicsRaw = (await notion.queryDatabase(typedEnv.NOTION_DB_TOPICS_ID, {
      page_size: 100
    })) as { results?: unknown[] }

    const topicNameById = new Map<string, string>()
    for (const raw of Array.isArray(topicsRaw.results) ? topicsRaw.results : []) {
      const topic = raw as NotionPage
      const name = getPlainText(topic.properties, [topicsSchema.titleProperty, "Name", "Topic", "Title", "이름"])
      if (name) {
        topicNameById.set(topic.id, name)
      }
    }

    const result = (await notion.queryDatabase(typedEnv.NOTION_DB_NEUROBITS_ID, {
      page_size: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 10,
      sorts: [{ timestamp: "created_time", direction: "descending" }]
    })) as { results?: unknown[] }

    const items = (Array.isArray(result.results) ? result.results : []).map((item) => {
      const page = item as NotionPage
      const relationIds = getRelationIds(page.properties, [
        neurobitSchema.topicRelationProperty || "",
        "Topic",
        "Topics",
        "주제"
      ])

      const relatedTopicName = relationIds
        .map((id) => topicNameById.get(id))
        .find((name): name is string => Boolean(name))

      return {
        id: page.id,
        title: getPlainText(page.properties, [neurobitSchema.titleProperty, "Title", "Name"]) || "(지식)",
        type: getSelectName(page.properties, [neurobitSchema.typeProperty || "", "Type", "유형"]) || "NOTE",
        topicName:
          relatedTopicName ||
          getPlainText(page.properties, [neurobitSchema.topicTextProperty || "", "Topic Name", "Topic", "주제"]),
        sourceUrl: getUrl(page.properties, [neurobitSchema.sourceUrlProperty || "", "Source URL", "URL", "Link"]),
        notes: getPlainText(page.properties, [neurobitSchema.notesProperty || "", "Notes", "Note", "메모"]),
        createdTime: page.created_time
      }
    })

    return success({ items }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}
