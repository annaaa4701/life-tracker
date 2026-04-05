import { useEffect, useMemo, useState } from "preact/hooks"
import { todayApi, type TodayData } from "../features/today/api"
import { dailyApi, type DailyLogData } from "../features/daily/api"
import { actionApi } from "../features/action/api"

const todayDate = (): string => new Date().toISOString().split("T")[0]

type PomodoroLine = {
  time: string
  summary: string
}

type TimelineHourRow = {
  hour: number
  items: Array<{ id: string; title: string; time?: string; priority: string }>
}

const parsePomodoroTimeline = (timeline?: string): PomodoroLine[] => {
  if (!timeline) return []

  return timeline
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [timePart, summaryPart] = line.split("|").map((part) => part.trim())
      return {
        time: timePart || "기록",
        summary: summaryPart || line
      }
    })
}

export function TodayScreen() {
  const [today, setToday] = useState<TodayData | null>(null)
  const [daily, setDaily] = useState<DailyLogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("불러오는 중...")
  const [savingActionId, setSavingActionId] = useState<string | null>(null)
  const [swipedActionId, setSwipedActionId] = useState<string | null>(null)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchTargetActionId, setTouchTargetActionId] = useState<string | null>(null)
  const [pointerStartX, setPointerStartX] = useState(0)
  const [pointerTargetActionId, setPointerTargetActionId] = useState<string | null>(null)

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const load = async () => {
    setLoading(true)
    setMessage("오늘 데이터를 불러오는 중...")

    const date = todayDate()
    const [todayResponse, dailyResponse] = await Promise.all([
      todayApi.getToday(date),
      dailyApi.getDaily(date)
    ])

    setLoading(false)

    if (!todayResponse.ok || !todayResponse.data) {
      setToday(null)
      setMessage(todayResponse.error?.message || "Today 데이터를 불러오지 못했습니다.")
    } else {
      setToday(todayResponse.data)
    }

    if (!dailyResponse.ok || !dailyResponse.data) {
      setDaily(null)
      if (!todayResponse.ok || !todayResponse.data) {
        return
      }
      setMessage(dailyResponse.error?.message || "Daily Log를 불러오지 못했습니다.")
      return
    }

    setDaily(dailyResponse.data)
    setMessage(`오늘 ${date} 데이터를 불러왔습니다.`)
  }

  useEffect(() => {
    void load()
  }, [])

  const completeAction = async (actionId: string) => {
    setSavingActionId(actionId)
    setMessage("완료 처리 중...")

    const response = await actionApi.updateAction(actionId, {
      status: "✅ Done",
      done: true
    })

    setSavingActionId(null)

    if (!response.ok) {
      if (response.error?.code === "OFFLINE_QUEUED") {
        setMessage("오프라인 상태라 완료 요청을 큐에 저장했습니다.")
        triggerHaptic([12, 28, 12])
      } else {
        setMessage(response.error?.message || "완료 처리 실패")
      }
      return
    }

    triggerHaptic(18)
    setMessage("완료 처리되었습니다. 다시 불러옵니다.")
    await load()
  }

  const postponeAction = async (actionId: string) => {
    setSavingActionId(actionId)
    setMessage("내일로 미루는 중...")

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split("T")[0]

    const response = await actionApi.updateAction(actionId, {
      date: tomorrowDate,
      done: false
    })

    setSavingActionId(null)
    setSwipedActionId(null)

    if (!response.ok) {
      if (response.error?.code === "OFFLINE_QUEUED") {
        setMessage("오프라인 상태라 미루기 요청을 큐에 저장했습니다.")
        triggerHaptic([12, 28, 12])
      } else {
        setMessage(response.error?.message || "미루기 실패")
      }
      return
    }

    triggerHaptic(14)
    setMessage("내일로 미뤘습니다. 다시 불러옵니다.")
    await load()
  }

  const deleteAction = async (actionId: string) => {
    setSavingActionId(actionId)
    setMessage("삭제 처리 중...")

    const response = await actionApi.updateAction(actionId, {
      done: true
    })

    setSavingActionId(null)
    setSwipedActionId(null)

    if (!response.ok) {
      if (response.error?.code === "OFFLINE_QUEUED") {
        setMessage("오프라인 상태라 삭제 요청을 큐에 저장했습니다.")
        triggerHaptic([12, 28, 12])
      } else {
        setMessage(response.error?.message || "삭제 처리 실패")
      }
      return
    }

    triggerHaptic(12)
    setMessage("삭제 처리되었습니다. 다시 불러옵니다.")
    await load()
  }

  const onSwipeStart = (actionId: string, event: any) => {
    setTouchTargetActionId(actionId)
    setTouchStartX(event.changedTouches[0]?.clientX || 0)
  }

  const onSwipeEnd = (actionId: string, event: any) => {
    if (touchTargetActionId !== actionId) {
      return
    }

    const endX = event.changedTouches[0]?.clientX || 0
    const deltaX = endX - touchStartX
    const threshold = 56

    setTouchTargetActionId(null)

    if (deltaX >= threshold) {
      triggerHaptic(10)
      void completeAction(actionId)
      return
    }

    if (deltaX <= -threshold) {
      triggerHaptic(8)
      setSwipedActionId((current) => (current === actionId ? null : actionId))
      return
    }

    setSwipedActionId(null)
  }

  const onPointerStart = (actionId: string, event: any) => {
    setPointerTargetActionId(actionId)
    setPointerStartX(event.clientX || 0)
  }

  const onPointerEnd = (actionId: string, event: any) => {
    if (pointerTargetActionId !== actionId) {
      return
    }

    const endX = event.clientX || 0
    const deltaX = endX - pointerStartX
    const threshold = 56

    setPointerTargetActionId(null)

    if (deltaX >= threshold) {
      triggerHaptic(10)
      void completeAction(actionId)
      return
    }

    if (deltaX <= -threshold) {
      triggerHaptic(8)
      setSwipedActionId((current) => (current === actionId ? null : actionId))
      return
    }

    setSwipedActionId(null)
  }

  const primaryActionId = today?.queue?.[0]?.id || today?.deepFocus?.[0]?.id || ""
  const pomodoroCards = parsePomodoroTimeline(daily?.daily?.pomodoroTimeline)
  const latestPomodoro = pomodoroCards[pomodoroCards.length - 1]
  const timelineRows = useMemo<TimelineHourRow[]>(() => {
    const hourMap = new Map<number, TimelineHourRow["items"]>()

    for (const item of today?.queue || []) {
      if (!item.time || !/^\d{2}:\d{2}$/.test(item.time)) continue
      const hour = Number(item.time.split(":")[0])
      if (!Number.isFinite(hour) || hour < 7 || hour > 22) continue

      const current = hourMap.get(hour) || []
      current.push({
        id: item.id,
        title: item.title,
        time: item.time,
        priority: item.priority
      })
      hourMap.set(hour, current)
    }

    return Array.from({ length: 16 }, (_, index) => 7 + index).map((hour) => ({
      hour,
      items: hourMap.get(hour) || []
    }))
  }, [today?.queue])

  return (
    <section class="screen">
      <article class="panel panel-focus">
        <p class="panel-title">Today</p>
        <h2>{today?.date || todayDate()}</h2>
      </article>

      <article class="panel panel-pomodoro-highlight">
        <p class="panel-title">🕐 Today Pomodoro</p>
        <div class="pomodoro-hero-top">
          <p class="pomodoro-hero-count">{pomodoroCards.length} sessions</p>
          <p class="helper-text">오늘 누적 세션</p>
        </div>
        {loading ? (
          <p>불러오는 중...</p>
        ) : pomodoroCards.length ? (
          <>
            <div class="pomodoro-hero-latest">
              <strong>{latestPomodoro?.time || "기록"}</strong>
              <p>{latestPomodoro?.summary || "최근 포모도로 기록"}</p>
            </div>
            <ul class="stack-list pomodoro-hero-list">
              {pomodoroCards.slice().reverse().map((item, index) => (
                <li key={`${item.time}-${index}`}>
                  <div>
                    <strong>{item.time}</strong>
                    <p>{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>오늘 포모도로 기록이 없습니다.</p>
        )}
      </article>

      <article class="panel">
        <p class="panel-title">⏱️ Today Timeline (07:00-22:00)</p>
        {loading ? (
          <p>불러오는 중...</p>
        ) : (
          <ul class="timeline-grid">
            {timelineRows.map((row) => (
              <li key={row.hour}>
                <span class="timeline-hour">{String(row.hour).padStart(2, "0")}:00</span>
                {row.items.length ? (
                  <div class="timeline-hour-items">
                    {row.items.map((item) => (
                      <span key={item.id} class="timeline-chip">{item.time} {item.title}</span>
                    ))}
                  </div>
                ) : (
                  <span class="timeline-empty">-</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article class="panel">
        <p class="panel-title">Deep Focus</p>
        {loading ? (
          <p>불러오는 중...</p>
        ) : today?.deepFocus?.length ? (
          <ul class="stack-list swipe-list">
            {today.deepFocus.map((item) => (
              <li
                key={item.id}
                class={swipedActionId === item.id ? "is-swiped" : ""}
                onTouchStart={(event) => onSwipeStart(item.id, event)}
                onTouchEnd={(event) => onSwipeEnd(item.id, event)}
                onMouseDown={(event) => onPointerStart(item.id, event)}
                onMouseUp={(event) => onPointerEnd(item.id, event)}
              >
                <div class="swipe-card-main">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.priority}</p>
                  </div>
                  <button type="button" class="secondary-button" onClick={() => completeAction(item.id)} disabled={savingActionId === item.id}>
                    완료
                  </button>
                </div>
                {swipedActionId === item.id ? (
                  <div class="swipe-actions">
                    <button type="button" class="secondary-button" onClick={() => postponeAction(item.id)} disabled={savingActionId === item.id}>
                      내일로
                    </button>
                    <button type="button" class="secondary-button" onClick={() => deleteAction(item.id)} disabled={savingActionId === item.id}>
                      삭제
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>오늘의 Deep Focus가 없습니다.</p>
        )}
      </article>

      <article class="panel">
        <p class="panel-title">Today Queue</p>
        {loading ? (
          <p>불러오는 중...</p>
        ) : today?.queue?.length ? (
          <ul class="stack-list swipe-list">
            {today.queue.map((item) => (
              <li
                key={item.id}
                class={swipedActionId === item.id ? "is-swiped" : ""}
                onTouchStart={(event) => onSwipeStart(item.id, event)}
                onTouchEnd={(event) => onSwipeEnd(item.id, event)}
                onMouseDown={(event) => onPointerStart(item.id, event)}
                onMouseUp={(event) => onPointerEnd(item.id, event)}
              >
                <div class="swipe-card-main">
                  <div>
                    <strong>{item.time ? `${item.time} · ` : ""}{item.title}</strong>
                    <p>{item.priority}</p>
                  </div>
                  <button type="button" class="secondary-button" onClick={() => completeAction(item.id)} disabled={savingActionId === item.id}>
                    완료
                  </button>
                </div>
                {swipedActionId === item.id ? (
                  <div class="swipe-actions">
                    <button type="button" class="secondary-button" onClick={() => postponeAction(item.id)} disabled={savingActionId === item.id}>
                      내일로
                    </button>
                    <button type="button" class="secondary-button" onClick={() => deleteAction(item.id)} disabled={savingActionId === item.id}>
                      삭제
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>오늘 할 일이 없습니다.</p>
        )}
        <p class="helper-text">오른쪽 스와이프: 완료 · 왼쪽 스와이프: 미루기/삭제</p>
      </article>

      <article class="panel">
        <p class="panel-title">Routines</p>
        {loading ? (
          <p>불러오는 중...</p>
        ) : today?.routines?.length ? (
          <ul class="stack-list">
            {today.routines.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.doneToday ? "오늘 완료" : "진행 전"}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>활성 루틴이 없습니다.</p>
        )}
      </article>

      <p class="helper-text">{message}</p>

      <div class="sticky-actions">
        <button type="button" class="secondary-button" onClick={() => void load()}>
          새로고침
        </button>
        <button
          type="button"
          class="cta-button"
          onClick={() => primaryActionId && completeAction(primaryActionId)}
          disabled={loading || !primaryActionId}
        >
          {primaryActionId ? "첫 항목 완료" : "완료할 항목 없음"}
        </button>
      </div>
    </section>
  )
}
