# GitHub Pages + Cloudflare Worker 최종 배포 설정

이 문서는 GitHub Pages로 웹앱을 배포하고, API는 Cloudflare Worker로 붙이는 최종 구성을 정리한다.

## 결론
- 웹 정적 호스팅: GitHub Pages
- API: Cloudflare Worker
- GitHub Pages에서 API는 상대경로 `/api`가 아니라 Worker의 절대 URL을 사용한다

중요:
- GitHub Pages만으로는 `/api`를 Cloudflare Worker로 path proxy 할 수 없다
- `/api`를 진짜 같은 오리진 경로로 쓰려면 Cloudflare가 앞단 프록시가 되어야 한다
- 따라서 GitHub Pages 조합에서는 `VITE_API_BASE_URL`을 Worker 절대 URL로 넣는 방식이 현실적인 최종안이다

## 1) GitHub Pages 워크플로우
워크플로우 파일:
- [.github/workflows/github-pages.yml](../.github/workflows/github-pages.yml)

동작:
- `main` 브랜치 push 시 빌드
- `apps/web/dist`를 Pages 아티팩트로 업로드
- GitHub Pages에 배포

## 2) Pages 환경변수
GitHub repository variables 또는 workflow env로 넣는다.

### 필수
- `VITE_API_BASE_URL`

예시:
- `https://life-tracker-worker.<your-subdomain>.workers.dev/api`
- 또는 `https://api.example.com/api`

### 선택
- `VITE_PUBLIC_BASE`

현재 워크플로우는 project pages 기준으로 기본값을 `/life-tracker/`로 쓴다.
커스텀 도메인 루트에서 서비스하면 `/`로 바꿀 수 있다.

## 3) Cloudflare Worker 쪽 설정
Worker는 지금처럼 별도 배포한다.

필수 Secret/vars:
- `NOTION_API_KEY`
- `NOTION_DB_ACTIONS_ID`
- `NOTION_DB_DAILY_ID`
- `NOTION_DB_PROJECTS_ID`
- `NOTION_DB_ROUTINES_ID`
- `NOTION_DB_GOALS_ID`
- `NOTION_DB_NEUROBITS_ID`
- `NOTION_DB_TOPICS_ID`
- `NOTION_VERSION`
- `AI_API_KEY` 사용 시 추가

## 4) SPA deep link fallback
GitHub Pages는 history mode deep link에서 404가 날 수 있다.
이를 피하려고 다음 fallback을 넣었다.
- [apps/web/public/404.html](../apps/web/public/404.html)
- [apps/web/src/app.tsx](../apps/web/src/app.tsx)

## 5) 배포 순서
1. Cloudflare Worker 배포
2. Worker URL을 `VITE_API_BASE_URL`로 등록
3. GitHub Pages Actions 활성화
4. `main` 브랜치 push
5. GitHub Pages 주소에서 `/today`, `/daily`, `/knowledge` 확인
6. API 호출이 Worker로 가는지 네트워크 탭에서 확인

## 6) 확인할 것
- 화면 로드 시 자산 경로가 깨지지 않는가
- 새로고침해도 탭 라우트가 복원되는가
- `GET /api/health`가 Worker에서 응답하는가
- `Today / Daily / Knowledge` 조회와 저장이 되는가

## 7) 운영 메모
- GitHub Pages에는 비밀값을 넣지 않는다
- Notion 키는 전부 Cloudflare Worker Secret으로만 둔다
- 프론트는 API base URL만 알고 있으면 된다
