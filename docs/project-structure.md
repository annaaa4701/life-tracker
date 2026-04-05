# 파일 구조 계획 (Monorepo)

모바일 PWA 프런트엔드와 Cloudflare Worker API를 분리한 모노레포 구조를 권장한다.

## 제안 구조

```txt
life-tracker/
  apps/
    web/                        # Vite + Preact PWA 앱
      public/
        icons/
          icon-192.png
          icon-512.png
        manifest.json
      src/
        app/
          App.tsx
          routes.tsx
        components/
          common/
            Header.tsx
            BottomTabBar.tsx
            PillarStatusBar.tsx
            StickyActionBar.tsx
          today/
            DeepFocusCard.tsx
            TodayQueueList.tsx
            TimelineView.tsx
            AddScheduleSheet.tsx
          add/
            QuickPrefixButtons.tsx
            ParsePreviewCard.tsx
          daily/
            MorningSleepSection.tsx
            MorningFocusSection.tsx
            EveningRoutineSection.tsx
            EveningPillarSection.tsx
            TomorrowPrepSection.tsx
          knowledge/
            KnowledgeTypeTabs.tsx
            KnowledgeForm.tsx
            RecentKnowledgeList.tsx
        features/
          today/
            api.ts
            hooks.ts
            types.ts
          add/
            parser.ts
            api.ts
            types.ts
          daily/
            api.ts
            sleep.ts
            types.ts
          knowledge/
            api.ts
            types.ts
        lib/
          http.ts
          date.ts
          storage.ts
          offlineQueue.ts
          constants.ts
        styles/
          tokens.css
          base.css
          layout.css
        sw/
          register-sw.ts
        main.tsx
      index.html
      vite.config.ts
      tsconfig.json

    worker/                     # Cloudflare Worker (BFF)
      src/
        index.ts                # router entry
        routes/
          today.ts
          daily.ts
          action.ts
          routines.ts
          neurobit.ts
          topics.ts
          parse.ts
        services/
          notion/
            client.ts
            actions.repo.ts
            daily.repo.ts
            routines.repo.ts
            neurobits.repo.ts
            topics.repo.ts
          parser/
            ruleBasedParser.ts
            aiFallback.ts
        domain/
          dto.ts
          models.ts
          enums.ts
        lib/
          validators.ts
          mapper.ts
          errors.ts
          response.ts
          logger.ts
      wrangler.toml
      package.json
      tsconfig.json

  packages/
    shared/                     # 공용 타입/유틸 (선택)
      src/
        api-types.ts
        priorities.ts
        pillars.ts
      package.json
      tsconfig.json

  docs/
    implementation-roadmap.md
    api-endpoints.md
    project-structure.md

  .gitignore
  package.json                  # workspace root
  pnpm-workspace.yaml           # 또는 npm workspaces
  README.md
```

## 디렉터리 설계 원칙
- `apps/web`
  - UI, 상태, 오프라인 큐 처리, 탭 UX를 담당
  - `features/*` 단위로 API/타입/비즈니스 로직을 캡슐화
- `apps/worker`
  - 입력 검증, Notion 매핑, 키 보호, 에러 표준화 담당
  - 라우트(`routes`)와 저장소(`services/notion`) 분리
- `packages/shared`
  - 클라이언트/서버 공용 enum, 타입을 중복 없이 사용

## 화면 라우트 계획
- `/today` -> Today 탭
- `/add` -> Add 탭
- `/daily` -> Daily Log 탭
- `/knowledge` -> Knowledge 탭
- `/` 진입 시 `/today` 리다이렉트

## 환경 변수 계획
- Web (`apps/web`)
  - `VITE_API_BASE_URL`
- Worker (`apps/worker`)
  - `NOTION_API_KEY` (secret)
  - `NOTION_VERSION`
  - `NOTION_DB_ACTIONS_ID`
  - `NOTION_DB_DAILY_ID`
  - `NOTION_DB_PROJECTS_ID`
  - `NOTION_DB_ROUTINES_ID`
  - `NOTION_DB_GOALS_ID`
  - `NOTION_DB_NEUROBITS_ID`
  - `NOTION_DB_TOPICS_ID`
  - `AI_API_KEY` (fallback parser)

## PPV 데이터 모델 반영
- `Pillars`: 4개 축(⚡ 실행, 🌱 성장, 🎨 창조, 💚 건강)
- `Projects`: 완료형 프로젝트 단위, 필요 시 Actions와 relation으로 연결
- `Goals`: 루틴/프로젝트의 상위 목표 집합, Projects 및 Routines의 relation 대상
- `Actions`: 오늘 실행 단위, 날짜/상태/우선순위/피라미드 축을 가진 기본 작업

## 파일 네이밍 규칙
- 컴포넌트: `PascalCase.tsx`
- 훅/유틸: `camelCase.ts`
- 라우트 핸들러: `<resource>.ts`
- 테스트: `*.test.ts` / `*.test.tsx`

## 테스트 구조 계획

```txt
apps/web/src/**/__tests__/
apps/worker/src/**/__tests__/
```

권장 우선순위:
1. 파서 규칙 테스트
2. Daily 수면 시간 계산 테스트
3. Worker endpoint 입력 검증 테스트
4. Today 정렬 규칙 테스트

## 배포 구조 계획
- Web: Cloudflare Pages
- Worker: Cloudflare Workers
- 연결 방식
  - 같은 도메인 하위 경로(`/api`)로 Worker 바인딩
  - Web은 `VITE_API_BASE_URL=/api`로 호출

## 초기 생성 순서 제안
1. 모노레포 워크스페이스 파일 생성
2. `apps/web` 생성(Vite + Preact + PWA)
3. `apps/worker` 생성(router + health endpoint)
4. 공용 타입 패키지 도입
5. `today`/`daily` API부터 수직 슬라이스로 기능 개발
