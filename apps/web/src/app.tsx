import { useEffect, useMemo, useState } from "preact/hooks"
import { BottomTabBar } from "./components/common/BottomTabBar"
import { Header } from "./components/common/Header"
import { AddScreen } from "./screens/AddScreen"
import { DailyScreen } from "./screens/DailyScreen"
import { KnowledgeScreen } from "./screens/KnowledgeScreen"
import { TodayScreen } from "./screens/TodayScreen"
import { TAB_ITEMS, type TabKey } from "./types"

const APP_BASE = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")

const stripAppBase = (pathname: string): string => {
  if (APP_BASE === "/") {
    return pathname || "/"
  }

  if (pathname.startsWith(APP_BASE)) {
    const stripped = pathname.slice(APP_BASE.length - 1)
    return stripped.startsWith("/") ? stripped : `/${stripped}`
  }

  return pathname || "/"
}

const toAppPath = (pathname: string): string => {
  const normalized = pathname.startsWith("/") ? pathname.slice(1) : pathname
  return APP_BASE === "/" ? `/${normalized}` : `${APP_BASE}${normalized}`
}

const tabFromPath = (pathname: string): TabKey => {
  const found = TAB_ITEMS.find((item) => item.path === pathname)
  return found ? found.key : "today"
}

const titleFromTab = (tab: TabKey): string => {
  switch (tab) {
    case "today":
      return "오늘 실행"
    case "add":
      return "빠른 추가"
    case "daily":
      return "Daily Log"
    case "knowledge":
      return "지식 저장"
    default:
      return "오늘 실행"
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => tabFromPath(stripAppBase(window.location.pathname)))

  useEffect(() => {
    const redirectPath = window.sessionStorage.getItem("lt-spa-redirect")
    if (redirectPath) {
      window.sessionStorage.removeItem("lt-spa-redirect")
      const targetPath = stripAppBase(redirectPath)
      window.history.replaceState({}, "", toAppPath(targetPath))
      setActiveTab(tabFromPath(targetPath))
      return
    }

    if (stripAppBase(window.location.pathname) === "/") {
      window.history.replaceState({}, "", toAppPath("/today"))
      setActiveTab("today")
      return
    }

    const onPopState = () => {
      setActiveTab(tabFromPath(stripAppBase(window.location.pathname)))
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const subtitle = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", {
      weekday: "long",
      month: "numeric",
      day: "numeric"
    }).format(new Date())
  }, [])

  const onTabChange = (nextTab: TabKey) => {
    const target = TAB_ITEMS.find((item) => item.key === nextTab)
    if (!target) {
      return
    }

    window.history.pushState({}, "", toAppPath(target.path))
    setActiveTab(nextTab)
  }

  return (
    <div class="app-shell">
      <Header title={titleFromTab(activeTab)} subtitle={subtitle} />

      <main class="app-main">
        {activeTab === "today" && <TodayScreen />}
        {activeTab === "add" && <AddScreen />}
        {activeTab === "daily" && <DailyScreen />}
        {activeTab === "knowledge" && <KnowledgeScreen />}
      </main>

      <BottomTabBar activeTab={activeTab} onChange={onTabChange} />
    </div>
  )
}
