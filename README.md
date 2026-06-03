# 정서S2민혁 WebApp

커플 일정, 사진, 투두, 채팅을 Supabase와 동기화하는 React/Vite 앱입니다.

## 개발

```bash
npm install
npm run dev
```

## 검증

```bash
npm run check
```

`npm run check`는 다음을 순서대로 실행합니다.

- `npm run lint`
- `npm test`
- `npm run check:functions`
- `npm run build`

## 환경 변수

`.env.example`을 기준으로 `.env.local`을 구성합니다.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`와 `VAPID_PRIVATE_KEY`는 클라이언트에 노출하지 말고 Supabase Edge Function secret으로 관리합니다.
