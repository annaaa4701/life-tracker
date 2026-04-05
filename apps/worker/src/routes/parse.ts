import { error, success } from "../lib/response"
import { validate, schemas } from "../lib/validators"
import { handleActionCompleteByTitle, handleActionCreate } from "./action"
import { handleDailyCreate, upsertDailyPatchByDate } from "./daily"
import { handleProjectCreate } from "./project"
import { parseActionPriority } from "./action"
import type { ParseResult } from "../domain/dto"
import { NotionClient } from "../services/notion/client"
import { getPlainText } from "../lib/notion-properties"

type Env = Record<string, unknown>

type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

const today = (tz?: string): string => {
  if (!tz) {
    return new Date().toISOString().split("T")[0]
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date())
}

const extractScore = (text: string, label: string): number | undefined => {
  const match = text.match(new RegExp(`${label}\\s*([1-5])`))
  return match ? Number(match[1]) : undefined
}

const inferPillar = (text: string): string => {
  if (/운동|걷기|헬스|수영|건강|잠|식사/i.test(text)) return "💚 건강"
  if (/공부|학습|읽기|리서치|스터디|개념/i.test(text)) return "🌱 성장"
  if (/창작|작성|디자인|그리기|영상|글쓰기|만들/i.test(text)) return "🎨 창조"
  return "⚡ 실행"
}

const inferKeywords = (text: string): string[] =>
  text
    .replace(/[#:,()/]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

const matchDatabaseItems = async (
  notion: NotionClient,
  databaseId: string | undefined,
  propertyNames: string[],
  keywords: string[]
): Promise<string[]> => {
  if (!databaseId) return []
  const response = (await notion.queryDatabase(databaseId, { page_size: 100 })) as {
    results?: unknown[]
  }

  const pages = (Array.isArray(response.results) ? response.results : []) as NotionPage[]
  return pages
    .filter((page) => {
      const title = getPlainText(page.properties, propertyNames)
      return !!title && keywords.some((keyword) => title.includes(keyword) || keyword.includes(title))
    })
    .map((page) => page.id)
}

export async function handleParse(payload: unknown, env: Env): Promise<Response> {
  try {
    const validation = validate(schemas.parseRequest, payload)
    if (!validation.ok) {
      const details = Object.fromEntries(
        validation.errors.issues.map((issue) => [issue.path.join(".") || "unknown", issue.message])
      )
      return error("VALIDATION_ERROR", "Invalid request body", details, 400)
    }

    const data = validation.data as {
      text: string
      locale?: string
      tz?: string
      persist?: boolean
    }
    const text = data.text.trim()
    const currentDate = today(data.tz)
    const keywords = inferKeywords(text)
    const notion = new NotionClient({
      apiKey: (env as Record<string, string>).NOTION_API_KEY,
      version: (env as Record<string, string>).NOTION_VERSION || "2022-06-28"
    })
    const inferredPillar = inferPillar(text)
    const inferredProjectIds = await matchDatabaseItems(
      notion,
      (env as Record<string, string>).NOTION_DB_PROJECTS_ID,
      ["Project", "Name", "Title", "이름"],
      keywords
    )
    const inferredGoalIds = await matchDatabaseItems(
      notion,
      (env as Record<string, string>).NOTION_DB_GOALS_ID,
      ["Goal", "Name", "Title", "이름"],
      keywords
    )

    let result: ParseResult

    if (text.startsWith("프로젝트 추가:")) {
      const title = text.replace("프로젝트 추가:", "").trim()
      result = {
        strategy: "RULE_BASED",
        intent: "PROJECT_CREATE",
        confidence: 0.96,
        parsed: {
          title,
          status: "Active",
          notes: "",
          pillar: inferredPillar,
          projectIds: inferredProjectIds,
          goalIds: inferredGoalIds
        }
      }

      if (data.persist) {
        return handleProjectCreate(
          {
            title,
            status: "Active",
            pillar: inferredPillar,
            goalIds: inferredGoalIds
          },
          env
        )
      }
    } else if (text.startsWith("할 일 추가:")) {
      const title = text.replace("할 일 추가:", "").trim()
      result = {
        strategy: "RULE_BASED",
        intent: "ACTION_CREATE",
        confidence: 0.96,
        parsed: {
          title,
          status: "🔄 Active",
          priority: "⚡ Quick",
          date: currentDate,
          pillar: inferredPillar,
          projectIds: inferredProjectIds,
          goalIds: inferredGoalIds
        }
      }

      if (data.persist) {
        return handleActionCreate(
          {
            title,
            date: currentDate,
            status: "🔄 Active",
            priority: "⚡ Quick",
            done: false,
            pillar: inferredPillar,
            projectIds: inferredProjectIds,
            goalIds: inferredGoalIds
          },
          env
        )
      }
    } else if (text.startsWith("오늘 할 일:")) {
      const title = text.replace("오늘 할 일:", "").trim()
      result = {
        strategy: "RULE_BASED",
        intent: "ACTION_CREATE",
        confidence: 0.96,
        parsed: {
          title,
          status: "🔄 Active",
          priority: "⚡ Quick",
          date: currentDate,
          pillar: inferredPillar,
          projectIds: inferredProjectIds,
          goalIds: inferredGoalIds
        }
      }

      if (data.persist) {
        return handleActionCreate(
          {
            title,
            date: currentDate,
            status: "🔄 Active",
            priority: "⚡ Quick",
            done: false,
            pillar: inferredPillar,
            projectIds: inferredProjectIds,
            goalIds: inferredGoalIds
          },
          env
        )
      }
    } else if (text.startsWith("긴급:")) {
      const title = text.replace("긴급:", "").trim()
      result = {
        strategy: "RULE_BASED",
        intent: "ACTION_CREATE",
        confidence: 0.96,
        parsed: {
          title,
          status: "🔄 Active",
          priority: "🚨 Urgent",
          date: currentDate,
          pillar: inferredPillar,
          projectIds: inferredProjectIds,
          goalIds: inferredGoalIds
        }
      }

      if (data.persist) {
        return handleActionCreate(
          {
            title,
            date: currentDate,
            status: "🔄 Active",
            priority: "🚨 Urgent",
            done: false,
            pillar: inferredPillar,
            projectIds: inferredProjectIds,
            goalIds: inferredGoalIds
          },
          env
        )
      }
    } else if (text.includes("완료 처리")) {
      const title = text.replace("완료 처리", "").trim()
      result = {
        strategy: "RULE_BASED",
        intent: "ACTION_COMPLETE",
        confidence: 0.88,
        parsed: { title }
      }

      if (data.persist) {
        return handleActionCompleteByTitle(title, env)
      }
    } else if (text.startsWith("오늘 점수:")) {
      const execute = extractScore(text, "실행")
      const growth = extractScore(text, "성장")
      const create = extractScore(text, "창조")
      const health = extractScore(text, "건강")

      result = {
        strategy: "RULE_BASED",
        intent: "DAILY_SCORE_UPDATE",
        confidence: 0.95,
        parsed: {
          date: currentDate,
          pillarExecute: execute,
          pillarGrowth: growth,
          pillarCreate: create,
          pillarHealth: health
        }
      }

      if (data.persist) {
        const { created, dailyId } = await upsertDailyPatchByDate(env, currentDate, {
          pillarExecute: execute,
          pillarGrowth: growth,
          pillarCreate: create,
          pillarHealth: health
        })

        return success({ updated: true, created, dailyId }, 200)
      }
    } else if (text === "오늘 데일리 로그 작성") {
      result = {
        strategy: "RULE_BASED",
        intent: "DAILY_UPSERT",
        confidence: 0.99,
        parsed: { date: currentDate }
      }

      if (data.persist) {
        return handleDailyCreate({ date: currentDate, name: `${currentDate} Daily Log` }, env)
      }
    } else {
      result = {
        strategy: "RULE_BASED",
        intent: "ACTION_CREATE",
        confidence: 0.7,
        parsed: {
          title: text,
          status: "🔄 Active",
          priority: parseActionPriority(text),
          date: currentDate,
          pillar: inferredPillar,
          projectIds: inferredProjectIds,
          goalIds: inferredGoalIds
        }
      }
    }

    return success(result, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return error("INTERNAL_ERROR", msg, {}, 500)
  }
}
