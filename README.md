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

## GitHub 이미지 배포

이 repo의 GitHub Actions는 `main` push 때 Docker 이미지를 빌드해서 GHCR에 올립니다.

DB 연결값이 확정되면 GitHub repository variables에 등록합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

발행 이미지:

- `ghcr.io/min1336/emotion-s2:latest`
- `ghcr.io/min1336/emotion-s2:sha-<commit>`

PR에서는 검사와 Docker 빌드만 수행하고, 이미지는 올리지 않습니다.
변수가 비어 있어도 이미지는 빌드됩니다. 이 경우 Supabase 연결 기능은 비활성 상태로 뜹니다.
