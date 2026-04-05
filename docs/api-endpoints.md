# Cloudflare Worker API 엔드포인트 명세 (v1)

## 공통 규칙
- Base URL: `/api`
- 인증
  - 클라이언트 ↔ Worker: 초기에는 공개 호출(추후 세션/토큰 확장 가능)
  - Worker ↔ Notion: `NOTION_API_KEY` Secret 사용
- Cloudflare 운영 메모
  - Worker 런타임 기준으로 동작
  - `OPTIONS` 프리플라이트를 Worker에서 처리
  - POST/PATCH 요청은 클라이언트에서 `x-idempotency-key`와 `requestId`를 첨부(오프라인 큐 재전송 대비)
- 데이터 모델
  - PPV: Pillars → Projects → Values + Virtues → Actions
  - 핵심 DB: Action Items, Daily Log, Projects, Routines, Goals
- 포맷
  - 요청/응답: `application/json`
  - 날짜: `YYYY-MM-DD`
  - 시간: `HH:mm` (24h)
- 에러 응답 표준

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date format",
    "details": { "field": "date" }
  }
}
```

- 성공 응답 표준

```json
{
  "ok": true,
  "data": {}
}
```

## 1) GET /api/today
오늘 기준 액션/루틴/딥포커스 후보를 조회한다.

### Query
- `date` (optional): `YYYY-MM-DD` (기본값: 오늘)
- `tz` (optional): 예: `Asia/Seoul`

### Response `200`
```json
{
  "ok": true,
  "data": {
    "date": "2026-04-06",
    "deepFocus": [
      { "id": "act_1", "title": "SCM 포트폴리오 정리", "priority": "Deep Focus 1", "done": false }
    ],
    "queue": [
      { "id": "act_2", "title": "병원 방문", "priority": "Urgent/Scheduled", "time": "10:30", "done": false }
    ],
    "routines": [
      { "id": "rut_1", "title": "듀오링고", "active": true, "doneToday": true }
    ]
  }
}
```

## 2) GET /api/daily
해당 날짜의 Daily Log를 조회한다.

### Query
- `date` (required): `YYYY-MM-DD`

### Response `200`
```json
{
  "ok": true,
  "data": {
    "exists": true,
    "daily": {
      "id": "daily_1",
      "date": "2026-04-06",
      "sleepStart": "23:50",
      "sleepEnd": "07:20",
      "sleepDuration": 450,
      "sleepQuality": 4,
      "todayFocus": "SCM 포트폴리오 마감",
      "routinesCompleted": 2,
      "routinesTotal": 4,
      "pillarExecute": 4,
      "pillarGrowth": 3,
      "pillarCreate": 2,
      "pillarHealth": 4,
      "tomorrowFirst": "병원 예약 확인"
    }
  }
}
```

## 3) POST /api/daily/create
오늘 날짜 Daily Log가 없으면 생성한다. 있으면 기존 값을 반환한다(upsert-like).

### Request
```json
{
  "date": "2026-04-06",
  "name": "2026-04-06 Daily Log"
}
```

### Response `200`
```json
{
  "ok": true,
  "data": {
    "created": true,
    "dailyId": "daily_1"
  }
}
```

## 4) PATCH /api/daily/update
Daily Log 속성을 부분 또는 전체 업데이트한다.

### Request
```json
{
  "dailyId": "daily_1",
  "patch": {
    "sleepStart": "23:50",
    "sleepEnd": "07:20",
    "sleepDuration": 450,
    "sleepQuality": 4,
    "todayFocus": "SCM 포트폴리오 마감",
    "morningNote": "컨디션 좋음",
    "weather": "SUNNY",
    "morningMood": 4,
    "routinesCompleted": 2,
    "routinesTotal": 4,
    "pillarExecute": 4,
    "executeNote": "핵심 작업 완료",
    "pillarGrowth": 3,
    "growthNote": "React 최적화 학습",
    "pillarCreate": 2,
    "createNote": "UI 시안 1개 제작",
    "pillarHealth": 4,
    "healthNote": "수영 40분",
    "tomorrowFirst": "영어 단어 복습",
    "tomorrowNote": "아침 30분 확보",
    "journal": "전체적으로 안정적"
  }
}
```

### Response `200`
```json
{
  "ok": true,
  "data": {
    "updated": true,
    "dailyId": "daily_1"
  }
}
```

## 5) POST /api/action/create
Action 항목을 생성한다(타임라인 추가 포함).

### Request
```json
{
  "title": "병원 방문",
  "date": "2026-04-06",
  "time": "10:30",
  "type": "ACTION",
  "priority": "Urgent/Scheduled",
  "estimateMin": 30,
  "source": "today_timeline"
}
```

### Response `201`
```json
{
  "ok": true,
  "data": {
    "actionId": "act_10"
  }
}
```

## 6) PATCH /api/action/update
Action 상태를 변경한다(완료/미루기/삭제).

### Request
```json
{
  "actionId": "act_10",
  "operation": "COMPLETE",
  "payload": {
    "doneAt": "2026-04-06T10:42:00+09:00"
  }
}
```

### `operation` enum
- `COMPLETE`
- `POSTPONE_TO_TOMORROW`
- `DELETE`
- `UPDATE_FIELDS`

### Response `200`
```json
{
  "ok": true,
  "data": {
    "updated": true,
    "actionId": "act_10"
  }
}
```

## 7) GET /api/routines
활성 루틴 목록과 오늘 완료 여부를 조회한다.

### Query
- `date` (optional): `YYYY-MM-DD`

### Response `200`
```json
{
  "ok": true,
  "data": {
    "items": [
      { "id": "rut_1", "title": "수영", "active": true, "doneToday": false },
      { "id": "rut_2", "title": "듀오링고", "active": true, "doneToday": true }
    ]
  }
}
```

## 8) POST /api/neurobit/create
지식(Neurobit)을 생성한다.

### Request
```json
{
  "type": "MEDIA",
  "title": "SCM 아티클",
  "topicId": "topic_ai_productivity",
  "sourceUrl": "https://example.com/article",
  "notes": "핵심 요약 메모"
}
```

### Response `201`
```json
{
  "ok": true,
  "data": {
    "neurobitId": "neu_22"
  }
}
```

## 9) GET /api/topics
Topic Vault 목록을 조회한다.

### Response `200`
```json
{
  "ok": true,
  "data": {
    "items": [
      { "id": "topic_ai_productivity", "name": "AI & 생산성" },
      { "id": "topic_health", "name": "건강" }
    ]
  }
}
```

## 10) POST /api/parse
자연어 파싱. 1차 규칙 기반 실패 시 AI fallback 수행.

### Request
```json
{
  "text": "내일 병원 10시반 방문",
  "locale": "ko-KR",
  "tz": "Asia/Seoul"
}
```

### Response `200`
```json
{
  "ok": true,
  "data": {
    "strategy": "RULE_BASED",
    "confidence": 0.89,
    "parsed": {
      "title": "병원 방문",
      "date": "2026-04-07",
      "time": "10:30",
      "type": "ACTION",
      "priority": "Urgent/Scheduled",
      "targetDb": "Actions"
    }
  }
}
```

## 상태코드 정책
- `200`: 조회/수정 성공
- `201`: 생성 성공
- `400`: 요청 검증 실패
- `404`: 대상 리소스 없음
- `409`: 중복/충돌(예: 이미 동일 날짜 Daily 존재)
- `500`: 서버 내부 오류

## Cloudflare 배포 시 필수 확인
- Worker route 진입 확인: `GET /api/health`
- Secret 주입 확인: `NOTION_API_KEY`, 각 DB ID
- Pages API 경로 정책: `VITE_API_BASE_URL=/api`
- CORS/OPTIONS 응답 헤더 확인

## 서버 내부 모듈 권장
- `src/lib/notion-client.ts`: Notion API 래퍼
- `src/lib/validators.ts`: zod 등 입력 검증
- `src/lib/mappers.ts`: 앱 모델 ↔ Notion 속성 매핑
- `src/lib/errors.ts`: 에러 코드/응답 표준
