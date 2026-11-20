# 토러스(Taurus) 시간 조율 기능 — 제작자 백엔드 연동 & 통합 가이드

이 프로젝트는 기존 **Taurus(`taurus-client.vercel.app`)** 프론트엔드 디자인 시스템과 라우팅 규격을 그대로 유지하면서, **모바일/PC 겸용 시간 조율(`src/features/timetable/`)** 기능을 모듈식으로 추가한 코드입니다.

---

## 1. 기존 Taurus 코드베이스에 시간 조율 기능만 이식하기

기존 원본 저장소에 시간 조율 기능만 넣고 싶다면 아래 파일/폴더만 복사하면 됩니다.

1. **폴더 복사**: `src/features/timetable/` 전체를 기존 프로젝트 `src/features/timetable/`로 복사
2. **스타일 추가**: `src/index.css` 하단의 `.timetable-golden-stripe` 클래스 1개 추가
3. **라우트 & 메뉴 연결**:
   - `src/constants/routes.ts`에 `TIMETABLE: "/timetable"`, `TIMETABLE_DETAIL: "/timetable/:id"` 추가
   - `src/App.tsx` 라우터 children에 `<TimetableCreatePage />`, `<TimetableDetailPage />` 등록
   - `Layout` 드로어 메뉴 배열에 `{ label: "시간 조율", path: ROUTES.TIMETABLE }` 추가
4. **환경 변수 전환**:
   - 로컬 테스트/임시 공유 서버 사용 시: `.env`에 `VITE_API_MODE=remote`, `VITE_API_BASE_URL=/api` 설정 후 `npm run server` (`server/index.mjs`) 실행
   - 원작자 Railway 백엔드 연결 시: `.env`에 `VITE_API_MODE=remote`, `VITE_API_BASE_URL=https://taurus-production-39be.up.railway.app` 설정
   - 서버 없이 브라우저 단독 테스트 시: `VITE_API_MODE=mock` (`localStorage` 사용)

> 참고: [server/index.mjs](server/index.mjs) 파일에 아래 명세 6개와 기존 토러스 API를 모두 구현한 참고용 Node.js 서버가 포함되어 있으므로, 백엔드 구현 시 그대로 참고하실 수 있습니다.

---

## 2. 백엔드 REST API 명세 (`src/features/timetable/api/timetableApi.ts`)

`VITE_API_MODE=remote` 모드 활성화 시 프론트엔드는 기존 `apiClient` (`baseURL` + `Bearer` 인터셉터)를 통해 아래 6개 엔드포인트를 호출합니다.

> 모든 응답은 기존 토러스 백엔드 규격(`{ code: "SUCCESS", data: ... }`)에 맞추면 인터셉터가 자동으로 `data`만 추출합니다.

### ① 최근/생성된 시간표 목록 조회
* `GET /timetables`
* **Response `data`**: `Timetable[]`

### ② 시간표 단건 조회
* `GET /timetables/:id`
* **Response `data`**: `Timetable | null`

```json
{
  "id": "taurus-demo",
  "title": "가을 정기공연 합주 시간 조율",
  "dates": ["2026-11-18", "2026-11-19", "2026-11-20"],
  "startHour": 14,
  "endHour": 23,
  "intervalMinutes": 60,
  "lockedSlots": ["2026-11-18|16:00"],
  "createdAt": "2026-11-18T10:00:00.000Z",
  "participants": [
    {
      "id": "p-1",
      "name": "김영훈",
      "availableSlots": ["2026-11-18|19:00", "2026-11-18|20:00"],
      "updatedAt": "2026-11-18T12:00:00.000Z"
    }
  ]
}
```
> **보안 참고**: `GET /timetables` 및 `GET /timetables/:id` 응답에서는 `participants[].password` 필드를 내려주지 않도록 백엔드에서 제외해 주세요.

### ③ 새 시간표 생성
* `POST /timetables`
* **Request Body**:
```json
{
  "title": "정기 합주 시간 조율",
  "dates": ["2026-11-19", "2026-11-20"],
  "startHour": 9,
  "endHour": 23,
  "intervalMinutes": 60,
  "lockedSlots": ["2026-11-19|18:00"]
}
```
* **Response `data`**: 생성된 `Timetable` 객체 (짧은 `id` 포함)

### ④ 참여자 인증 확인 (기존 이름 수정 여부 판별)
* `POST /timetables/:id/participants/verify`
* **Request Body**: `{ "name": "김영훈", "password": "1234" }`
* **동작**:
  * 해당 `name`이 없으면 `{ "participant": null, "isNew": true }` 반환
  * 해당 `name`이 있고 `password`(해시 검증)가 일치하면 `{ "participant": { ... }, "isNew": false }` 반환
  * 비밀번호 불일치 시 `401` 또는 `400` 에러 반환

### ⑤ 참여자 가능 시간 저장 / 수정 (Upsert)
* `POST /timetables/:id/entries`
* **Request Body**:
```json
{
  "name": "김영훈",
  "password": "1234",
  "availableSlots": ["2026-11-19|19:00", "2026-11-19|20:00"]
}
```
* **동작**: 비밀번호 해시 검증 후 신규 생성 또는 `availableSlots` 덮어쓰기 → 갱신된 전체 `Timetable` 객체 반환

### ⑥ 참여자 일정 삭제
* `DELETE /timetables/:id/entries`
* **Request Body**: `{ "name": "김영훈", "password": "1234" }`
* **동작**: 비밀번호 검증 후 해당 참여자 레코드 삭제 → 갱신된 전체 `Timetable` 객체 반환

### ⑦ 관리자 예약(`POST /admin/reservations`) 생성 시 권장 연동
* 기존에 생성된 `Timetable` 중 관리자 예약 날짜가 포함된 표가 있다면, 해당 시간대 슬롯(`YYYY-MM-DD|HH:00`, 30분 단위 표는 `:30` 포함)을 참여자들의 `availableSlots`에서 제거해 주세요.
* 잠금 상태 자체는 프론트엔드가 활성 `CONFIRMED_ADMIN` 예약과 실시간 동기화하므로 `Timetable.lockedSlots`에 영구 추가하지 않는 것을 권장합니다. (그래야 관리자가 추후 해당 예약을 취소했을 때 잠금도 자동으로 해제됩니다.)

---

## 3. 권장 DB 테이블 스키마 (PostgreSQL / Prisma 기준 예시)

```prisma
model Timetable {
  id              String                 @id
  title           String
  dates           String[]               // ["2026-11-18", ...]
  startHour       Int
  endHour         Int
  intervalMinutes Int                    // 30 또는 60
  lockedSlots     String[]               // ["2026-11-18|16:00", ...]
  createdAt       DateTime               @default(now())
  participants    TimetableParticipant[]
}

model TimetableParticipant {
  id             String    @id @default(uuid())
  timetableId    String
  timetable      Timetable @relation(fields: [timetableId], references: [id], onDelete: Cascade)
  name           String
  passwordHash   String
  availableSlots String[]  // ["2026-11-18|19:00", ...]
  updatedAt      DateTime  @updatedAt

  @@unique([timetableId, name])
}
```
