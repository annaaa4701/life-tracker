export interface ParseResponse {
  strategy: "RULE_BASED" | "AI_FALLBACK"
  intent:
    | "ACTION_CREATE"
    | "PROJECT_CREATE"
    | "DAILY_UPSERT"
    | "ACTION_COMPLETE"
    | "DAILY_SCORE_UPDATE"
  confidence: number
  parsed: Record<string, unknown>
}
