type AnyRecord = Record<string, unknown>

const asRecord = (value: unknown): AnyRecord =>
  (typeof value === "object" && value !== null ? (value as AnyRecord) : {})

const firstExisting = (
  props: Record<string, unknown>,
  candidates: string[]
): AnyRecord => {
  for (const key of candidates) {
    if (props[key] !== undefined) {
      return asRecord(props[key])
    }
  }
  return {}
}

export const getPlainText = (
  props: Record<string, unknown>,
  candidates: string[]
): string | undefined => {
  const prop = firstExisting(props, candidates)
  const title = prop.title
  if (Array.isArray(title) && title[0]) {
    return asRecord(title[0]).plain_text as string | undefined
  }

  const richText = prop.rich_text
  if (Array.isArray(richText) && richText[0]) {
    return asRecord(richText[0]).plain_text as string | undefined
  }

  return undefined
}

export const getNumber = (
  props: Record<string, unknown>,
  candidates: string[]
): number | undefined => {
  const prop = firstExisting(props, candidates)
  const value = prop.number
  return typeof value === "number" ? value : undefined
}

export const getDateStart = (
  props: Record<string, unknown>,
  candidates: string[]
): string | undefined => {
  const prop = firstExisting(props, candidates)
  const date = asRecord(prop.date)
  return date.start as string | undefined
}

export const getSelectName = (
  props: Record<string, unknown>,
  candidates: string[]
): string | undefined => {
  const prop = firstExisting(props, candidates)
  const select = asRecord(prop.select)
  return select.name as string | undefined
}

export const getUrl = (
  props: Record<string, unknown>,
  candidates: string[]
): string | undefined => {
  const prop = firstExisting(props, candidates)
  return typeof prop.url === "string" ? (prop.url as string) : undefined
}

export const getCheckbox = (
  props: Record<string, unknown>,
  candidates: string[]
): boolean | undefined => {
  const prop = firstExisting(props, candidates)
  return typeof prop.checkbox === "boolean" ? (prop.checkbox as boolean) : undefined
}

export const makeTitle = (text: string): AnyRecord => ({
  title: [{ text: { content: text } }]
})

export const makeRichText = (text: string): AnyRecord => ({
  rich_text: [{ text: { content: text } }]
})

export const makeNumber = (value: number): AnyRecord => ({ number: value })

export const makeDate = (start: string): AnyRecord => ({ date: { start } })

export const makeSelect = (name: string): AnyRecord => ({ select: { name } })

export const makeStatus = (name: string): AnyRecord => ({ status: { name } })

export const makeCheckbox = (value: boolean): AnyRecord => ({ checkbox: value })

export const makeUrl = (value: string): AnyRecord => ({ url: value })

export const makeRelation = (ids: string[]): AnyRecord => ({
  relation: ids.map((id) => ({ id }))
})

export const makeMultiSelect = (names: string[]): AnyRecord => ({
  multi_select: names.map((name) => ({ name }))
})

export const getRelationIds = (
  props: Record<string, unknown>,
  candidates: string[]
): string[] => {
  const prop = firstExisting(props, candidates)
  const relation = prop.relation
  if (!Array.isArray(relation)) {
    return []
  }

  return relation
    .map((item) => asRecord(item).id)
    .filter((id): id is string => typeof id === "string")
}
