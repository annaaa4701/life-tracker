import { useEffect, useMemo, useState } from "preact/hooks"
import { dailyApi, type DailyLogData } from "../features/daily/api"

const todayDate = (): string => new Date().toISOString().split("T")[0]
const DEFAULT_FOCUS_MINUTES = 25
const DEFAULT_REST_MINUTES = 5

type PomodoroPhase = "focus" | "rest"

type PomodoroTimelineEntry = {
  time: string
  summary: string
}

const parsePomodoroTimeline = (value?: string): PomodoroTimelineEntry[] => {
  if (!value) return []

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [timePart, summaryPart] = line.split("|").map((part) => part.trim())
      return {
        time: timePart || "",
        summary: summaryPart || line
      }
    })
}

const stringifyPomodoroTimeline = (entries: PomodoroTimelineEntry[]): string =>
  entries
    .map((entry) => {
      const time = entry.time.trim()
      const summary = entry.summary.trim()

      if (time && summary) return `${time} | ${summary}`
      if (time) return time
      if (summary) return summary
      return ""
    })
    .filter(Boolean)
    .join("\n")

const sleepMinutes = (start?: string, end?: string): number | undefined => {
  if (!start || !end) return undefined

  const [startHour, startMinute] = start.split(":").map(Number)
  const [endHour, endMinute] = end.split(":").map(Number)
  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute
  const diff = endTotal >= startTotal ? endTotal - startTotal : 24 * 60 - startTotal + endTotal
  return diff
}

export function DailyScreen() {
  const [dailyId, setDailyId] = useState<string | null>(null)
  const [exists, setExists] = useState(false)
  const [message, setMessage] = useState("데일리를 불러오는 중...")
  const [loading, setLoading] = useState(true)

  const [sleepStart, setSleepStart] = useState("")
  const [sleepEnd, setSleepEnd] = useState("")
  const [sleepQuality, setSleepQuality] = useState(3)
  const [todayFocus, setTodayFocus] = useState("")
  const [pillarExecute, setPillarExecute] = useState(3)
  const [pillarGrowth, setPillarGrowth] = useState(3)
  const [pillarCreate, setPillarCreate] = useState(3)
  const [pillarHealth, setPillarHealth] = useState(3)
  const [tomorrowFirst, setTomorrowFirst] = useState("")
  const [journal, setJournal] = useState("")
  const [pomodoroSessions, setPomodoroSessions] = useState(0)
  const [pomodoroMinutes, setPomodoroMinutes] = useState(0)
  const [pomodoroEntries, setPomodoroEntries] = useState<PomodoroTimelineEntry[]>([])
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES)
  const [restMinutes, setRestMinutes] = useState(DEFAULT_REST_MINUTES)
  const [phase, setPhase] = useState<PomodoroPhase>("focus")
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_FOCUS_MINUTES * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerBusy, setTimerBusy] = useState(false)

  const sleepDuration = useMemo(() => sleepMinutes(sleepStart, sleepEnd), [sleepStart, sleepEnd])

  const phaseLabel = phase === "focus" ? "집중" : "휴식"

  const applyTimerWindow = (nextPhase: PomodoroPhase) => {
    setPhase(nextPhase)
    setTimerSeconds((nextPhase === "focus" ? focusMinutes : restMinutes) * 60)
  }

  useEffect(() => {
    const storedFocus = Number(window.localStorage.getItem("ppv-pomodoro-focus") || DEFAULT_FOCUS_MINUTES)
    const storedRest = Number(window.localStorage.getItem("ppv-pomodoro-rest") || DEFAULT_REST_MINUTES)

    if (Number.isFinite(storedFocus) && storedFocus > 0) {
      setFocusMinutes(storedFocus)
      setTimerSeconds(storedFocus * 60)
    }

    if (Number.isFinite(storedRest) && storedRest > 0) {
      setRestMinutes(storedRest)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("ppv-pomodoro-focus", String(focusMinutes))
    if (!timerRunning && phase === "focus") {
      setTimerSeconds(focusMinutes * 60)
    }
  }, [focusMinutes])

  useEffect(() => {
    window.localStorage.setItem("ppv-pomodoro-rest", String(restMinutes))
    if (!timerRunning && phase === "rest") {
      setTimerSeconds(restMinutes * 60)
    }
  }, [restMinutes])

  const load = async () => {
    setLoading(true)
    setMessage("오늘 데일리 로그를 불러오는 중...")

    const date = todayDate()
    const response = await dailyApi.getDaily(date)
    setLoading(false)

    if (!response.ok || !response.data) {
      setMessage(response.error?.message || "데일리 로그를 불러오지 못했습니다.")
      return
    }

    const data: DailyLogData = response.data
    setExists(data.exists)
    setDailyId(data.daily?.id || null)
    setSleepStart(data.daily?.sleepStart || "")
    setSleepEnd(data.daily?.sleepEnd || "")
    setSleepQuality(Number(data.daily?.sleepQuality ?? 3))
    setTodayFocus(String(data.daily?.todayFocus ?? ""))
    setPillarExecute(Number(data.daily?.pillarExecute ?? 3))
    setPillarGrowth(Number(data.daily?.pillarGrowth ?? 3))
    setPillarCreate(Number(data.daily?.pillarCreate ?? 3))
    setPillarHealth(Number(data.daily?.pillarHealth ?? 3))
    setTomorrowFirst(String(data.daily?.tomorrowFirst ?? ""))
    setJournal(String(data.daily?.journal ?? ""))
    setPomodoroSessions(Number(data.daily?.pomodoroSessions ?? 0))
    setPomodoroMinutes(Number(data.daily?.pomodoroMinutes ?? 0))
    setPomodoroEntries(parsePomodoroTimeline(String(data.daily?.pomodoroTimeline ?? "")))
    setTimerSeconds(focusMinutes * 60)
    setTimerRunning(false)
    setMessage(data.exists ? "기존 데일리 로그를 불러왔습니다." : "오늘 데일리 로그가 없습니다. 저장 시 생성됩니다.")
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!timerRunning) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setTimerRunning(false)
          void recordPomodoroSession()
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timerRunning, phase])

  useEffect(() => {
    if (!timerRunning || timerSeconds > 0) {
      return
    }

    if (phase === "focus") {
      void completeFocusSession()
      return
    }

    setMessage("휴식 종료. 집중을 다시 시작합니다.")
    applyTimerWindow("focus")
  }, [timerSeconds, timerRunning, phase])

  const ensureDailyRecord = async (): Promise<string | null> => {
    const date = todayDate()
    if (exists && dailyId) {
      return dailyId
    }

    const createResponse = await dailyApi.createDaily(date, `${date} Daily Log`)
    if (!createResponse.ok || !createResponse.data) {
      setMessage(createResponse.error?.message || "데일리 로그 생성 실패")
      return null
    }

    const newDailyId = createResponse.data.dailyId
    setDailyId(newDailyId)
    setExists(true)
    return newDailyId
  }

  const saveCurrentFields = async (overridePatch?: Record<string, unknown>) => {
    const targetDailyId = await ensureDailyRecord()
    if (!targetDailyId) {
      return false
    }

    const patch =
      overridePatch || {
        sleepStart,
        sleepEnd,
        sleepDuration,
        sleepQuality,
        todayFocus,
        pillarExecute,
        pillarGrowth,
        pillarCreate,
        pillarHealth,
        tomorrowFirst,
        journal,
        pomodoroSessions,
        pomodoroMinutes,
        pomodoroTimeline: stringifyPomodoroTimeline(pomodoroEntries)
      }

    const updateResponse = await dailyApi.updateDaily(targetDailyId, patch)
    if (!updateResponse.ok) {
      setMessage(updateResponse.error?.message || "저장 실패")
      return false
    }

    return true
  }

  const recordPomodoroSession = async () => {
    if (timerBusy) return
    setTimerBusy(true)

    const targetDailyId = await ensureDailyRecord()
    if (!targetDailyId) {
      setTimerBusy(false)
      return
    }

    const nextSessions = pomodoroSessions + 1
    const nextMinutes = pomodoroMinutes + focusMinutes
    const nowLabel = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date())
    const nextEntries = [
      ...pomodoroEntries,
      {
        time: nowLabel,
        summary: `집중 ${focusMinutes}분 → 휴식 ${restMinutes}분`
      }
    ]
    const nextTimeline = stringifyPomodoroTimeline(nextEntries)

    const response = await dailyApi.updateDaily(targetDailyId, {
      pomodoroSessions: nextSessions,
      pomodoroMinutes: nextMinutes,
      pomodoroTimeline: nextTimeline
    })

    setTimerBusy(false)

    if (!response.ok) {
      setMessage(response.error?.message || "포모도로 기록 실패")
      return
    }

    setPomodoroSessions(nextSessions)
    setPomodoroMinutes(nextMinutes)
    setPomodoroEntries(nextEntries)
    applyTimerWindow("rest")
    setMessage(`포모도로 1세션 기록됨. 오늘 누적 ${nextSessions}세션 / ${nextMinutes}분`)
  }

  const completeFocusSession = async () => {
    await recordPomodoroSession()
  }

  const save = async () => {
    setLoading(true)
    setMessage("저장 중...")

    const saved = await saveCurrentFields()
    setLoading(false)

    if (!saved) {
      return
    }

    setMessage("데일리 로그가 저장되었습니다.")
  }

  const updatePomodoroEntry = (index: number, key: "time" | "summary", value: string) => {
    setPomodoroEntries((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry))
    )
  }

  const deletePomodoroEntry = (index: number) => {
    setPomodoroEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
  }

  const addPomodoroEntry = () => {
    const nowLabel = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date())

    setPomodoroEntries((current) => [...current, { time: nowLabel, summary: "" }])
  }

  const savePomodoroTimeline = async () => {
    setLoading(true)
    setMessage("포모도로 타임라인 저장 중...")

    const saved = await saveCurrentFields({
      pomodoroTimeline: stringifyPomodoroTimeline(pomodoroEntries),
      pomodoroSessions,
      pomodoroMinutes
    })

    setLoading(false)

    if (!saved) {
      return
    }

    setMessage("포모도로 타임라인이 저장되었습니다.")
  }

  const formatSeconds = (seconds: number): string => {
    const total = Math.max(seconds, 0)
    const minutes = Math.floor(total / 60)
    const remaining = total % 60
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
  }

  return (
    <section class="screen">
      <article class="panel panel-focus">
        <p class="panel-title">⏱️ 포모도로 · {phaseLabel}</p>
        <h2>{formatSeconds(timerSeconds)}</h2>
        <p class="helper-text">오늘 누적 {pomodoroSessions}세션 / {pomodoroMinutes}분</p>
        <div class="pomodoro-settings">
          <label>
            집중
            <input
              class="text-input"
              type="number"
              min={1}
              max={90}
              value={focusMinutes}
              onInput={(event) => setFocusMinutes(Number((event.currentTarget as HTMLInputElement).value))}
            />
          </label>
          <label>
            휴식
            <input
              class="text-input"
              type="number"
              min={1}
              max={30}
              value={restMinutes}
              onInput={(event) => setRestMinutes(Number((event.currentTarget as HTMLInputElement).value))}
            />
          </label>
        </div>
        <div class="quick-buttons">
          <button type="button" onClick={() => setTimerRunning((value) => !value)} disabled={loading || timerBusy}>
            {timerRunning ? "일시정지" : "시작"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerRunning(false)
              applyTimerWindow("focus")
            }}
            disabled={loading || timerBusy}
          >
            리셋
          </button>
          <button type="button" onClick={() => void (phase === "focus" ? recordPomodoroSession() : applyTimerWindow("focus"))} disabled={loading || timerBusy}>
            {phase === "focus" ? "집중 완료" : "휴식 종료"}
          </button>
        </div>
      </article>

      <article class="panel">
        <p class="panel-title">🕐 포모도로 타임라인</p>
        {pomodoroEntries.length ? (
          <div class="timeline-editor">
            {pomodoroEntries.map((entry, index) => (
              <div class="timeline-editor-row" key={`${entry.time}-${index}`}>
                <input
                  class="text-input timeline-time-input"
                  type="text"
                  value={entry.time}
                  onInput={(event) => updatePomodoroEntry(index, "time", (event.currentTarget as HTMLInputElement).value)}
                  placeholder="HH:mm"
                />
                <input
                  class="text-input"
                  type="text"
                  value={entry.summary}
                  onInput={(event) => updatePomodoroEntry(index, "summary", (event.currentTarget as HTMLInputElement).value)}
                  placeholder="세션 메모"
                />
                <button
                  type="button"
                  class="secondary-button timeline-delete-button"
                  onClick={() => deletePomodoroEntry(index)}
                  disabled={loading || timerBusy}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>아직 포모도로 기록이 없습니다.</p>
        )}
        <div class="quick-buttons timeline-actions">
          <button type="button" onClick={addPomodoroEntry} disabled={loading || timerBusy}>
            항목 추가
          </button>
          <button type="button" class="cta-button" onClick={() => void savePomodoroTimeline()} disabled={loading || timerBusy}>
            타임라인 저장
          </button>
        </div>
      </article>

      <article class="panel">
        <p class="panel-title">🌙 수면 체크</p>
        <label>
          취침 시간
          <input class="text-input" type="time" value={sleepStart} onInput={(event) => setSleepStart((event.currentTarget as HTMLInputElement).value)} />
        </label>
        <label>
          기상 시간
          <input class="text-input" type="time" value={sleepEnd} onInput={(event) => setSleepEnd((event.currentTarget as HTMLInputElement).value)} />
        </label>
        <label>
          수면 질
          <input class="text-input" type="number" min={1} max={5} value={sleepQuality} onInput={(event) => setSleepQuality(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <p class="helper-text">총 수면: {typeof sleepDuration === "number" ? `${Math.floor(sleepDuration / 60)}시간 ${sleepDuration % 60}분` : "-"}</p>
      </article>

      <article class="panel">
        <p class="panel-title">☀️ 오늘 핵심 / 회고</p>
        <label>
          오늘 핵심 목표
          <input class="text-input" type="text" value={todayFocus} onInput={(event) => setTodayFocus((event.currentTarget as HTMLInputElement).value)} />
        </label>
        <label>
          내일 최우선
          <input class="text-input" type="text" value={tomorrowFirst} onInput={(event) => setTomorrowFirst((event.currentTarget as HTMLInputElement).value)} />
        </label>
        <label>
          오늘 한줄 소감
          <textarea class="text-input text-area" rows={4} value={journal} onInput={(event) => setJournal((event.currentTarget as HTMLTextAreaElement).value)} />
        </label>
      </article>

      <article class="panel">
        <p class="panel-title">⚡🌱🎨💚 점수</p>
        <label>
          실행
          <input class="text-input" type="number" min={1} max={5} value={pillarExecute} onInput={(event) => setPillarExecute(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          성장
          <input class="text-input" type="number" min={1} max={5} value={pillarGrowth} onInput={(event) => setPillarGrowth(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          창조
          <input class="text-input" type="number" min={1} max={5} value={pillarCreate} onInput={(event) => setPillarCreate(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          건강
          <input class="text-input" type="number" min={1} max={5} value={pillarHealth} onInput={(event) => setPillarHealth(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
      </article>

      <p class="helper-text">{message}</p>

      <div class="sticky-actions">
        <button type="button" class="secondary-button" onClick={() => void load()} disabled={loading}>
          다시 불러오기
        </button>
        <button type="button" class="cta-button" onClick={() => void save()} disabled={loading}>
          Notion에 저장
        </button>
      </div>
    </section>
  )
}
