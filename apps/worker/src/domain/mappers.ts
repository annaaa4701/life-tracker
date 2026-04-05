import type { DailyLog } from "./dto"

interface NotionProperty {
  [key: string]: unknown
}

interface NotionPageObject {
  id: string
  properties: Record<string, NotionProperty>
}

const getPropertyValue = (prop: NotionProperty): unknown => {
  const propObj = prop as Record<string, unknown>

  if (propObj.rich_text && Array.isArray(propObj.rich_text)) {
    return propObj.rich_text.map((rt: any) => rt.plain_text).join("")
  }

  if (propObj.title && Array.isArray(propObj.title)) {
    return propObj.title.map((t: any) => t.plain_text).join("")
  }

  if (propObj.number !== undefined) {
    return propObj.number
  }

  if (propObj.date && typeof propObj.date === "object") {
    return (propObj.date as Record<string, unknown>).start
  }

  if (propObj.select && typeof propObj.select === "object") {
    return (propObj.select as Record<string, any>).name
  }

  return null
}

export const mapNotionPageToDailyLog = (page: NotionPageObject): DailyLog => {
  const props = page.properties

  return {
    id: page.id,
    date: (getPropertyValue(props.Date || {}) as string) || "",
    sleepStart: (getPropertyValue(props.SleepStart || {}) as string) || undefined,
    sleepEnd: (getPropertyValue(props.SleepEnd || {}) as string) || undefined,
    sleepDuration: (getPropertyValue(props.SleepDuration || {}) as number) || undefined,
    sleepQuality: (getPropertyValue(props.SleepQuality || {}) as number) || undefined,
    todayFocus: (getPropertyValue(props.TodayFocus || {}) as string) || undefined,
    morningNote: (getPropertyValue(props.MorningNote || {}) as string) || undefined,
    weather: (getPropertyValue(props.Weather || {}) as string) || undefined,
    morningMood: (getPropertyValue(props.MorningMood || {}) as number) || undefined,
    routinesCompleted: (getPropertyValue(props.RoutinesCompleted || {}) as number) || undefined,
    routinesTotal: (getPropertyValue(props.RoutinesTotal || {}) as number) || undefined,
    pillarExecute: (getPropertyValue(props.PillarExecute || {}) as number) || undefined,
    executeNote: (getPropertyValue(props.ExecuteNote || {}) as string) || undefined,
    pillarGrowth: (getPropertyValue(props.PillarGrowth || {}) as number) || undefined,
    growthNote: (getPropertyValue(props.GrowthNote || {}) as string) || undefined,
    pillarCreate: (getPropertyValue(props.PillarCreate || {}) as number) || undefined,
    createNote: (getPropertyValue(props.CreateNote || {}) as string) || undefined,
    pillarHealth: (getPropertyValue(props.PillarHealth || {}) as number) || undefined,
    healthNote: (getPropertyValue(props.HealthNote || {}) as string) || undefined,
    tomorrowFirst: (getPropertyValue(props.TomorrowFirst || {}) as string) || undefined,
    tomorrowNote: (getPropertyValue(props.TomorrowNote || {}) as string) || undefined,
    journal: (getPropertyValue(props.Journal || {}) as string) || undefined
  }
}
