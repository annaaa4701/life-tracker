export const formatDate = (date: Date = new Date()): string => {
  return date.toISOString().split("T")[0]
}

export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr + "T00:00:00Z")
}

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const getTodayDate = (): string => {
  return formatDate(new Date())
}
