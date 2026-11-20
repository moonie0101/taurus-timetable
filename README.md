# Taurus 합주실 예약 · 시간 조율 통합 웹앱 (전달용 최종본)

기존 Taurus 합주실 예약 웹사이트에 **시간 조율(`Timetable`) 기능 추가** 및 **예약/관리자 UX 개선**을 반영한 최종 프론트엔드·연동 가이드 패키지입니다.

---

## 포함된 주요 자료

* **[BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md)** — 원작자 서버 이식 가이드 (`src/features/timetable/` 독립 모듈 구조, REST API 6종 명세, Prisma DB 스키마 예시)
* **[docs/Taurus_Update_Presentation.pptx](docs/Taurus_Update_Presentation.pptx)** — 원본 홈페이지 대비 추가·수정 사항(Before vs After) 요약 PPT
* **[server/index.mjs](server/index.mjs)** — 로컬/테스트 구동 및 백엔드 구현 참고용 Node.js API 서버 (최초 실행 시 `server/data/db.json` 자동 생성)

---

## 로컬 테스트 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. (터미널 1) 참고용 API 서버 실행 (http://127.0.0.1:3001)
npm run server

# 3. (터미널 2) 프론트엔드 개발 서버 실행 (/api 자동 프록시)
npm run dev
```

* 기본 `.env`는 로컬 테스트용(`VITE_API_MODE=remote`, `VITE_API_BASE_URL=/api`)으로 설정되어 있습니다.
* 원작자 실서버에 연동하려면 `.env`의 `VITE_API_BASE_URL`을 실제 API 주소로 변경하세요. (`.env.example` 참고)
* 백엔드 없이 브라우저 단독으로 UI만 보려면 `VITE_API_MODE=mock`으로 변경하면 됩니다.

---

## 주요 변경·추가 위치 요약

1. **시간 조율 신규 모듈**: `src/features/timetable/` (`TimetableCreatePage`, `TimetableDetailPage`, `TimeGrid`, `GoldenTimePanel`, `MultiDateCalendar`, `ParticipantModal`, `SlotDetailPopover`)
2. **네비게이션 & 레이아웃**: `src/components/layout/Layout.tsx`, `src/constants/routes.ts`, `src/App.tsx`
3. **바로 예약 · 미리 예약 직접 변경/취소**: `src/components/reservation/ReservationComponents.tsx`, `src/pages/InstantReservationPage.tsx`, `src/pages/PreReservationPage.tsx`
4. **관리자 페이지(매주 반복 예약 · 시간 범위 · 모바일 대응)**: `src/pages/AdminPage.tsx`, `src/components/ui/Modal.tsx`
