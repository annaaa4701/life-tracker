export type TabKey = "today" | "add" | "daily" | "knowledge"

export type TabItem = {
  key: TabKey
  label: string
  icon: string
  path: string
}

export const TAB_ITEMS: TabItem[] = [
  { key: "today", label: "Today", icon: "🏠", path: "/today" },
  { key: "add", label: "Add", icon: "✏️", path: "/add" },
  { key: "daily", label: "Log", icon: "📓", path: "/daily" },
  { key: "knowledge", label: "Know", icon: "🧠", path: "/knowledge" }
]
