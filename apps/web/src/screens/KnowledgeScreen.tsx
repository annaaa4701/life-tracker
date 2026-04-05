import { useEffect, useState } from "preact/hooks"
import { knowledgeApi, type KnowledgeType, type NeurobitItem, type TopicItem } from "../features/knowledge/api"

const TYPE_LABEL: Record<KnowledgeType, string> = {
  MEDIA: "미디어",
  NOTE: "노트",
  DOC: "문서"
}

const formatDate = (value?: string): string => {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed)
}

export function KnowledgeScreen() {
  const [type, setType] = useState<KnowledgeType>("NOTE")
  const [title, setTitle] = useState("")
  const [topicId, setTopicId] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [notes, setNotes] = useState("")

  const [topics, setTopics] = useState<TopicItem[]>([])
  const [recentItems, setRecentItems] = useState<NeurobitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("지식 데이터를 불러오는 중...")

  const load = async () => {
    setLoading(true)
    const [topicsResponse, recentResponse] = await Promise.all([
      knowledgeApi.getTopics(),
      knowledgeApi.getRecentNeurobits(10)
    ])

    if (!topicsResponse.ok || !topicsResponse.data) {
      setMessage(topicsResponse.error?.message || "토픽 목록을 불러오지 못했습니다.")
      setLoading(false)
      return
    }

    if (!recentResponse.ok || !recentResponse.data) {
      setMessage(recentResponse.error?.message || "최근 지식 목록을 불러오지 못했습니다.")
      setLoading(false)
      return
    }

    setTopics(topicsResponse.data.items)
    setRecentItems(recentResponse.data.items)
    setLoading(false)
    setMessage("Knowledge가 최신 상태입니다.")
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    if (!title.trim()) {
      setMessage("제목을 입력해 주세요.")
      return
    }

    setSaving(true)
    setMessage("저장 중...")

    const response = await knowledgeApi.createNeurobit({
      type,
      title: title.trim(),
      topicId: topicId || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      notes: notes.trim() || undefined
    })

    setSaving(false)

    if (!response.ok) {
      setMessage(response.error?.message || "저장에 실패했습니다.")
      return
    }

    setTitle("")
    setSourceUrl("")
    setNotes("")
    setMessage("Neurobit가 저장되었습니다.")
    await load()
  }

  return (
    <section class="screen">
      <article class="panel">
        <p class="panel-title">⚗️ 지식 저장</p>
        <div class="quick-buttons knowledge-type-buttons">
          {(["MEDIA", "NOTE", "DOC"] as KnowledgeType[]).map((itemType) => (
            <button
              type="button"
              key={itemType}
              class={itemType === type ? "is-active" : ""}
              onClick={() => setType(itemType)}
            >
              {TYPE_LABEL[itemType]}
            </button>
          ))}
        </div>

        <label>
          제목
          <input
            class="text-input"
            placeholder="예: Deep Work 관련 아티클"
            value={title}
            onInput={(event) => setTitle((event.currentTarget as HTMLInputElement).value)}
          />
        </label>

        <label>
          Topic
          <select class="text-input" value={topicId} onInput={(event) => setTopicId((event.currentTarget as HTMLSelectElement).value)}>
            <option value="">선택 안 함</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
        </label>

        <label>
          URL
          <input
            class="text-input"
            placeholder="https://..."
            value={sourceUrl}
            onInput={(event) => setSourceUrl((event.currentTarget as HTMLInputElement).value)}
          />
        </label>

        <label>
          메모
          <textarea
            class="text-input text-area"
            rows={4}
            placeholder="핵심 요약"
            value={notes}
            onInput={(event) => setNotes((event.currentTarget as HTMLTextAreaElement).value)}
          />
        </label>
      </article>

      <article class="panel">
        <p class="panel-title">최근 저장 10개</p>
        {loading ? (
          <p>불러오는 중...</p>
        ) : recentItems.length ? (
          <ul class="stack-list">
            {recentItems.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>[{TYPE_LABEL[item.type]}] {item.title}</strong>
                  <p>{item.topicName ? `${item.topicName} · ` : ""}{formatDate(item.createdTime)}</p>
                  {item.notes ? <p>{item.notes}</p> : null}
                  {item.sourceUrl ? <p>{item.sourceUrl}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>아직 저장된 항목이 없습니다.</p>
        )}
      </article>

      <p class="helper-text">{message}</p>

      <button type="button" class="cta-button" onClick={() => void save()} disabled={saving}>
        {saving ? "저장 중..." : "저장"}
      </button>
    </section>
  )
}
