import { useState } from "preact/hooks"
import { addApi } from "../features/add/api"
import type { ParseResponse } from "../features/add/types"

const prefixButtons = [
  { label: "할 일", value: "할 일 추가: " },
  { label: "오늘 할 일", value: "오늘 할 일: " },
  { label: "프로젝트", value: "프로젝트 추가: " },
  { label: "긴급", value: "긴급: " },
  { label: "데일리", value: "오늘 데일리 로그 작성" }
]

const previewFromResponse = (response?: ParseResponse | null) => {
  if (!response) {
    return null
  }

  const parsed = response.parsed as Record<string, unknown>
  return (
    <>
      <p>intent: {response.intent}</p>
      <p>confidence: {Math.round(response.confidence * 100)}%</p>
      <p>title: {(parsed.title as string) || "-"}</p>
      <p>date: {(parsed.date as string) || "-"}</p>
      <p>priority: {(parsed.priority as string) || "-"}</p>
    </>
  )
}

export function AddScreen() {
  const [text, setText] = useState("내일 병원 10시반 방문")
  const [result, setResult] = useState<ParseResponse | null>(null)
  const [message, setMessage] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const insertPrefix = (value: string) => {
    setText(value)
  }

  const parse = async (persist: boolean) => {
    if (!text.trim()) {
      setMessage("입력문을 먼저 작성해 주세요.")
      return
    }

    setLoading(true)
    setMessage(persist ? "저장 중..." : "미리보기 생성 중...")

    const response = await addApi.parse(text, persist)
    setLoading(false)

    if (!response.ok || !response.data) {
      setMessage(response.error?.message || "처리에 실패했습니다.")
      return
    }

    setResult(response.data)
    setMessage(persist ? "저장 완료" : "미리보기 생성 완료")
  }

  return (
    <section class="screen">
      <article class="panel">
        <p class="panel-title">무엇을 추가할까요?</p>
        <textarea
          class="text-input text-area"
          rows={4}
          value={text}
          onInput={(event) => setText((event.currentTarget as HTMLTextAreaElement).value)}
          placeholder="내일 병원 10시반 방문"
          aria-label="quick add input"
        />
        <div class="quick-buttons">
          {prefixButtons.map((button) => (
            <button key={button.label} type="button" onClick={() => insertPrefix(button.value)}>
              {button.label}
            </button>
          ))}
        </div>
      </article>

      <article class="panel">
        <p class="panel-title">미리보기</p>
        {previewFromResponse(result) || <p>아직 파싱된 내용이 없습니다.</p>}
      </article>

      <p class="helper-text">{message}</p>

      <div class="sticky-actions">
        <button type="button" class="secondary-button" onClick={() => parse(false)} disabled={loading}>
          미리보기
        </button>
        <button type="button" class="cta-button" onClick={() => parse(true)} disabled={loading}>
          저장하기
        </button>
      </div>
    </section>
  )
}
