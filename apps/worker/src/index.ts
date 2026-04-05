import { error, success } from "./lib/response"
import { handleToday } from "./routes/today"
import { handleDailyGet, handleDailyCreate, handleDailyUpdate } from "./routes/daily"
import { handleActionCreate, handleActionUpdate, handleActionSearch } from "./routes/action"
import { handleProjectCreate, handleProjectUpdate, handleProjectList } from "./routes/project"
import { handleParse } from "./routes/parse"
import { handleNeurobitCreate, handleNeurobitList, handleTopicList } from "./routes/knowledge"

interface Env {
  NOTION_API_KEY: string
  NOTION_VERSION: string
  NOTION_DB_ACTIONS_ID: string
  NOTION_DB_DAILY_ID: string
  NOTION_DB_PROJECTS_ID: string
  NOTION_DB_ROUTINES_ID: string
  NOTION_DB_GOALS_ID: string
  NOTION_DB_NEUROBITS_ID: string
  NOTION_DB_TOPICS_ID: string
  [key: string]: string
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const { pathname, searchParams } = url

  // OPTIONS 요청 CORS 처리
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type"
      }
    })
  }

  // 헬스 체크
  if (pathname === "/api/health") {
    return success({ service: "worker", status: "ready" })
  }

  // GET /api/today
  if (pathname === "/api/today" && request.method === "GET") {
    return handleToday(searchParams, env)
  }

  // GET /api/daily
  if (pathname === "/api/daily" && request.method === "GET") {
    return handleDailyGet(searchParams, env)
  }

  // GET /api/actions
  if (pathname === "/api/actions" && request.method === "GET") {
    return handleActionSearch(searchParams, env)
  }

  // GET /api/projects
  if (pathname === "/api/projects" && request.method === "GET") {
    return handleProjectList(env)
  }

  // GET /api/topics
  if (pathname === "/api/topics" && request.method === "GET") {
    return handleTopicList(env)
  }

  // GET /api/neurobits
  if (pathname === "/api/neurobits" && request.method === "GET") {
    return handleNeurobitList(searchParams, env)
  }

  // POST /api/daily/create
  if (pathname === "/api/daily/create" && request.method === "POST") {
    try {
      const payload = await request.json()
      return handleDailyCreate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // PATCH /api/daily/update
  if (pathname === "/api/daily/update" && request.method === "PATCH") {
    try {
      const payload = await request.json()
      return handleDailyUpdate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // POST /api/action/create
  if (pathname === "/api/action/create" && request.method === "POST") {
    try {
      const payload = await request.json()
      return handleActionCreate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // PATCH /api/action/update
  if (pathname === "/api/action/update" && request.method === "PATCH") {
    try {
      const payload = await request.json()
      return handleActionUpdate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // POST /api/project/create
  if (pathname === "/api/project/create" && request.method === "POST") {
    try {
      const payload = await request.json()
      return handleProjectCreate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // POST /api/neurobit/create
  if (pathname === "/api/neurobit/create" && request.method === "POST") {
    try {
      const payload = await request.json()
      return handleNeurobitCreate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // PATCH /api/project/update
  if (pathname === "/api/project/update" && request.method === "PATCH") {
    try {
      const payload = await request.json()
      return handleProjectUpdate(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  // POST /api/parse
  if (pathname === "/api/parse" && request.method === "POST") {
    try {
      const payload = await request.json()
      return handleParse(payload, env)
    } catch {
      return error("VALIDATION_ERROR", "Invalid JSON payload", {}, 400)
    }
  }

  return error("NOT_FOUND", "Route not found", { path: pathname }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      return error("INTERNAL_ERROR", msg, {}, 500)
    }
  }
}

