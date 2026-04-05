# Cloudflare 설정 가이드 (Pages + Workers)

이 문서는 Life Tracker의 Cloudflare 배포/운영 시 필요한 최소 설정을 정리한다.

## 1) Worker 기본 정보
- 파일: `apps/worker/wrangler.toml`
- 현재 값
  - `name = "life-tracker-worker"`
  - `main = "src/index.ts"`
  - `compatibility_date = "2026-04-05"`

## 2) Worker 환경변수와 Secret
로컬(`.dev.vars`)과 Cloudflare Dashboard/CLI 값을 동일하게 맞춘다.

### 일반 변수 (vars)
- `NOTION_VERSION` (예: `2022-06-28`)

### Secret (반드시 Secret으로 관리)
- `NOTION_API_KEY`
- `NOTION_DB_ACTIONS_ID`
- `NOTION_DB_DAILY_ID`
- `NOTION_DB_PROJECTS_ID`
- `NOTION_DB_ROUTINES_ID`
- `NOTION_DB_GOALS_ID`
- `NOTION_DB_NEUROBITS_ID`
- `NOTION_DB_TOPICS_ID`
- `AI_API_KEY` (사용 시)

## 3) Worker API 라우트 (현재 구현 기준)
- `GET /api/health`
- `GET /api/today`
- `GET /api/daily`
- `POST /api/daily/create`
- `PATCH /api/daily/update`
- `GET /api/actions`
- `POST /api/action/create`
- `PATCH /api/action/update`
- `GET /api/projects`
- `POST /api/project/create`
- `PATCH /api/project/update`
- `GET /api/topics`
- `GET /api/neurobits`
- `POST /api/neurobit/create`
- `POST /api/parse`

## 4) Pages와 Worker 연결 원칙
- Web 앱은 `VITE_API_BASE_URL=/api` 기준으로 호출한다.
- 권장 배포 형태:
  - 같은 도메인에서 프론트와 API를 제공
  - `/api/*` 경로는 Worker로 라우팅
- 장점:
  - CORS 이슈 최소화
  - 모바일 PWA에서 네트워크 정책 단순화

## 5) CORS/프리플라이트 점검
Worker는 `OPTIONS`를 처리해야 하며 아래 헤더가 있어야 한다.
- `access-control-allow-origin`
- `access-control-allow-methods`
- `access-control-allow-headers`

점검 순서:
1. `GET /api/health` 200 확인
2. 브라우저 네트워크 탭에서 `OPTIONS` 응답 확인
3. 실제 POST/PATCH 요청 성공 여부 확인

## 6) 오프라인 쓰기 큐와 멱등 키
클라이언트 최소 구현 반영 상태:
- POST/PATCH 요청에 `x-idempotency-key` 헤더 추가
- body에 `requestId` 포함
- 오프라인 시 요청을 localStorage 큐에 저장 후 online 이벤트에서 재전송

운영 권장(다음 단계):
- Worker에서 `requestId` 중복을 차단하도록 KV/D1 기반 멱등 저장소 추가

## 7) 배포 전 체크리스트
1. Worker Secret 누락 여부 확인
2. Notion Integration 권한(각 DB 공유) 확인
3. `GET /api/health` 성공
4. Today/Daily/Knowledge 핵심 API 호출 스모크 테스트
5. Pages에서 `VITE_API_BASE_URL` 값 확인

## 8) 장애 대응 Runbook (요약)
- Notion `401`:
  - `NOTION_API_KEY` 재확인, Integration 연결 상태 확인
- Notion `429`:
  - 요청량 감소, 재시도/backoff 적용 검토
- Worker `500` 증가:
  - Cloudflare 로그에서 에러 코드별 분류
  - 최근 배포 롤백 여부 판단
- 오프라인 큐 적체:
  - 온라인 전환 후 자동 flush 확인
  - 중복 요청 여부(`requestId`) 점검
