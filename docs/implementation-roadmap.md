# Life Tracker 구현 로드맵 (주차별)

## 목표
모바일 퍼스트 PWA를 기준으로 4개 탭(오늘, 추가, 로그, 지식)과 Notion 연동 백엔드(Cloudflare Worker)를 단계적으로 구현한다.

## 범위 원칙
- MVP 우선: 핵심 입력/저장/조회 플로우를 먼저 완성한다.
- 모바일 UX 우선: 하단 탭바, 큰 터치 타겟, 단일 컬럼 레이아웃을 기본으로 한다.
- 데이터 단일 진실원: 영구 저장은 Notion DB에만 수행한다.
- 보안: Notion API Key는 Worker 환경변수(Secret)로만 사용한다.

## 8주 구현표

### Week 1 - 프로젝트 부트스트랩 + 앱 셸
- 목표
  - Vite + Preact 기반 프로젝트 초기화
  - 모바일 퍼스트 레이아웃 + 하단 탭바 4개 뼈대 구성
  - PWA 기본 파일(`manifest.json`, service worker 등록, 아이콘 자리) 구성
- 작업
  - 공통 레이아웃: Header + Main + Bottom TabBar
  - 라우팅 구성: `/today`, `/add`, `/daily`, `/knowledge`
  - 디자인 토큰(CSS 변수) 및 터치 타겟 최소 규칙 적용
- 완료 기준
  - 모바일 뷰포트에서 4개 탭 이동 가능
  - PWA 설치 가능 조건 충족(HTTPS 환경에서 manifest 인식)

### Week 2 - Worker 기반 API 골격 + Notion 클라이언트
- 목표
  - Cloudflare Worker에서 API 라우트 골격 완성
  - Notion API 공통 유틸/에러 처리/스키마 검증 도입
- 작업
  - `/api/today`, `/api/daily`, `/api/daily/create`, `/api/daily/update` 1차 구현
  - 입력 검증(필수 필드, 날짜/시간 형식) 및 표준 에러 응답 정의
  - `.dev.vars`/Secrets 관리 규칙 정리
- 완료 기준
  - 로컬/스테이징에서 Notion 조회/생성/수정 API 호출 성공

### Week 3 - Today 탭 MVP
- 목표
  - 오늘 할 일 조회/완료/미루기/삭제를 모바일에서 빠르게 처리
- 작업
  - Deep Focus 카드(최대 2개)
  - Today Queue 정렬(우선순위 규칙 적용)
  - 스와이프 액션(오른쪽 완료, 왼쪽 미루기/삭제)
  - 시간대 타임라인 기본 뷰(07:00-22:00)
- 완료 기준
  - Today 화면에서 조회와 상태 변경이 전부 Notion에 반영

### Week 4 - Add 탭 MVP + 규칙 기반 파서
- 목표
  - 자연어 빠른 입력 후 저장하는 메인 캡처 플로우 완성
- 작업
  - Prefix 버튼(액션/루틴/프로젝트/로그/뉴로비트)
  - 규칙 기반 파서(날짜, 시간, 타입, priority 추출)
  - 미리보기 카드(수정 후 저장)
  - 저장 대상 DB 분기 처리
- 완료 기준
  - 대표 입력 문장 15개 이상에서 파싱/저장 성공

### Week 5 - Daily 탭(아침) 구현
- 목표
  - Daily Log 생성/조회와 아침 입력 플로우 완성
- 작업
  - 오늘 날짜 기준 Daily Log upsert
  - 수면 입력(시작/종료/질) + 수면 시간 자동 계산
  - Today Focus/Morning Note/Weather/Morning Mood 저장
- 완료 기준
  - 아침 데이터가 Daily Log DB에 정상 저장되고 재진입 시 복원

### Week 6 - Daily 탭(저녁) + 루틴/Pillar 회고
- 목표
  - 루틴 체크와 Pillar 점수/메모, 내일 준비까지 저녁 플로우 완성
- 작업
  - 활성 루틴 조회 + 완료 카운트 집계
  - Pillar 4종 점수/텍스트 입력
  - Tomorrow First 저장 + Actions DB에 내일 첫 작업 생성
  - 하단 고정 저장 CTA 최적화
- 완료 기준
  - 저녁 회고 입력값 일괄 저장 성공

### Week 7 - Knowledge 탭 + Topic Vault 연동
- 목표
  - 지식 캡처와 최근 저장 조회 플로우 완성
- 작업
  - 타입별(미디어/노트/문서) 입력 폼 전환
  - Topic 드롭다운 연동
  - Neurobits 저장 + 최근 저장 10개 표시
- 완료 기준
  - Knowledge 탭에서 생성/조회가 일관되게 동작

### Week 8 - 오프라인/성능/릴리즈 준비
- 목표
  - PWA 사용성 완성도와 운영 안정성 확보
- 작업
  - 앱 셸 캐시 + 읽기 캐시 + 쓰기 큐잉(재시도)
  - 장애 케이스 처리(네트워크 불안정, 중복 요청)
  - 모바일 QA(Android/iOS), Lighthouse 점검
  - 배포 파이프라인 정리(Cloudflare Pages + Worker)
- 완료 기준
  - 오프라인 진입/복귀 시 핵심 플로우 유지
  - 배포 후 기본 모니터링 지표 수집 가능

### Week 8.5 - Cloudflare 운영 고정값 문서화
- 목표
  - Pages + Workers 실배포에 필요한 Cloudflare 설정값을 팀 공용 문서로 고정
- 작업
  - Worker 환경변수/Secret 목록 확정
  - Pages 프로젝트 `VITE_API_BASE_URL` 정책 확정(같은 도메인 `/api` 우선)
  - CORS, 라우트 충돌, 프리플라이트(OPTIONS) 확인 체크리스트 작성
  - 장애 대응(runbook): Notion 401/429/5xx, Worker 에러율, 오프라인 큐 적체 대응
- 완료 기준
  - 신규 환경(스테이징/프로덕션)에서 문서만으로 1회 배포 가능
  - 핵심 API 상태 확인 절차(`/api/health`)와 복구 절차가 문서화됨

## 병행 트랙 (지속 작업)
- 테스트
  - 단위: 파서, 날짜/시간 변환, payload 매퍼
  - 통합: Worker endpoint + Notion mock
  - E2E: 모바일 탭 핵심 시나리오
- 품질
  - 접근성(탭 포커스, aria, 색 대비)
  - 성능(초기 로딩, 탭 전환, 입력 지연)
- 운영
  - 에러 로깅, API 실패율 모니터링, 재시도 정책 튜닝

## 리스크 및 대응
- Notion 속성명 변경 위험
  - 대응: 런타임 스키마 체크 + 미스매치 에러 메시지 표준화
- iOS PWA 설치 UX 편차
  - 대응: 수동 설치 안내 배너 제공
- 오프라인 중복 저장
  - 대응: 클라이언트 요청 ID(idempotency key) 적용
