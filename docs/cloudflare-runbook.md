# Cloudflare 런북 (Pages + Workers)

이 문서는 Life Tracker를 Cloudflare에 배포할 때 바로 따라할 수 있는 최소 절차만 정리한다.

## 1) 배포 구조
- Web: Cloudflare Pages
- API: Cloudflare Workers
- API 경로: `/api/*`
- Web 호출 기준: `VITE_API_BASE_URL=/api`

## 2) Worker 설정값
### wrangler.toml
- `name = "life-tracker-worker"`
- `main = "src/index.ts"`
- `compatibility_date = "2026-04-05"`
- `NOTION_VERSION = "2022-06-28"`

### Cloudflare Secret / Environment
다음 값은 Worker Secret으로 넣는다.
- `NOTION_API_KEY`
- `NOTION_DB_ACTIONS_ID`
- `NOTION_DB_DAILY_ID`
- `NOTION_DB_PROJECTS_ID`
- `NOTION_DB_ROUTINES_ID`
- `NOTION_DB_GOALS_ID`
- `NOTION_DB_NEUROBITS_ID`
- `NOTION_DB_TOPICS_ID`
- `AI_API_KEY` 사용 시 추가

## 3) Pages 설정값
- `VITE_API_BASE_URL=/api`

같은 도메인에서 Pages와 Worker를 붙이면 CORS 문제를 줄일 수 있다.

## 4) 배포 순서
1. Notion Integration 생성 또는 기존 Integration 확인
2. 각 Notion DB를 Integration에 공유
3. Worker Secret 입력
4. Pages 환경변수 입력
5. Worker 배포
6. Pages 배포
7. `/api/health` 확인
8. Today / Daily / Knowledge 화면 스모크 테스트

## 5) 배포 전 체크리스트
- Worker Secret이 모두 입력됐는가
- Notion DB 공유가 되어 있는가
- `GET /api/health`가 200을 반환하는가
- `OPTIONS` 프리플라이트가 정상 응답하는가
- `GET /api/today`가 데이터를 반환하는가
- `GET /api/daily?date=YYYY-MM-DD`가 데이터를 반환하는가
- `GET /api/topics`와 `GET /api/neurobits`가 데이터를 반환하는가
- `POST /api/neurobit/create`가 저장되는가

## 6) 오프라인 큐 확인
현재 클라이언트는 POST/PATCH 실패 시 localStorage 큐에 저장한다.

확인 포인트:
- 네트워크 끊김 상태에서 작업 실행
- 온라인 복귀 시 자동 재전송 여부 확인
- 중복 요청 방지 키(`requestId`, `x-idempotency-key`)가 붙는지 확인

## 7) 자주 나는 장애
### Notion 401
- `NOTION_API_KEY` 확인
- Integration이 해당 DB와 공유됐는지 확인

### Notion 429
- 요청 속도 과다
- 재시도/백오프 정책 검토

### Worker 500
- Cloudflare Logs에서 최근 배포 확인
- Notion 응답 메시지 확인
- DB 속성명 변경 여부 확인

### CORS / OPTIONS 실패
- Worker가 `OPTIONS`를 처리하는지 확인
- `access-control-allow-origin`
- `access-control-allow-methods`
- `access-control-allow-headers`

## 8) 스모크 테스트 명령
브라우저나 curl에서 아래 순서로 확인한다.
- `GET /api/health`
- `GET /api/today`
- `GET /api/daily?date=YYYY-MM-DD`
- `GET /api/topics`
- `GET /api/neurobits?limit=10`
- `POST /api/neurobit/create`

## 9) 운영 원칙
- Notion API Key는 클라이언트에 두지 않는다.
- DB 속성명은 하드코딩보다 런타임 해석을 우선한다.
- 실패 시 재시도 전에 `requestId` 중복 여부를 먼저 본다.
