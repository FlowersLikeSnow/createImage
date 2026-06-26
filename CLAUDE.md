# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this codebase.

## Project Overview

AI image generation web application built with Next.js 16, featuring user authentication, credit-based image generation, admin panel, and redemption code system. Chinese language UI.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Ant Design 6 + Ant Design X 2 (chat UI)
- Tailwind CSS 4
- better-sqlite3 (SQLite database — native module)
- bcryptjs (password hashing)
- OpenAI SDK (image generation + LLM)
- Qiniu SDK (cloud image storage)
- big.js (credit calculations — avoid floating-point errors)
- sharp (image compression to WebP before upload)

## Path Alias

`@/*` maps to the project root. Use it everywhere: `import { db } from '@/lib/db'`.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 3001

# Production
npm run build        # Build for production
npm run start        # Start production server on port 3001 (must run from project root)

# Quality
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type check
```

**No test framework is configured.** There are no test files or test scripts.

## Architecture

### SQLite Database

Persistent storage using better-sqlite3 in [lib/db/sqlite.ts](lib/db/sqlite.ts). Database file at `data/users.db` relative to `process.cwd()`. Schema is auto-created on first run.

Main entities: `users`, `sessions`, `conversations`, `messages`, `redemption_codes`, `credit_records`.

All exports available via [lib/db/index.ts](lib/db/index.ts).

### Authentication System

Custom Bearer token auth (not JWT). Tokens are 32-byte crypto random + nanoid, stored in `sessions` table with 7-day expiry. Located in [lib/auth/](lib/auth/):
- `password.ts` - bcrypt hashing (cost 10)
- `token.ts` - Session token generation
- `middleware.ts` - `verifyAuth()` for API protection, `requireAdmin()` for admin routes

API routes under `/api/auth/*`: register (with captcha), login, me, logout, profile, avatar upload. Admin panel at `/admin/*` uses client-side role check in layout.

### API Client

[lib/api/client.ts](lib/api/client.ts) provides `fetchWithAuth()` for authenticated requests. Automatically adds Bearer token from localStorage and handles 401 responses.

### Credit System

Users have credits consumed per image generation. Configuration in [lib/utils/size-config.ts](lib/utils/size-config.ts):

| Resolution | Credit Cost |
|------------|-------------|
| 1K | 0.15 |
| 2K | 0.25 |
| 4K | 0.35 |

Default credits on registration: 0.15 (equals 1K generation).

Credit operations via `users.deductCredits()`, `users.refundCredits()`, `users.adjustCredits()`. All operations logged to `credit_records` table.

**All credit calculations use `big.js`** to avoid floating-point precision errors. Always use big.js when working with credit values.

### AI Image Generation

Adapter pattern in [lib/ai/](lib/ai/):
- `adapter.ts` - `ImageGenAdapter` interface (generate + edit)
- `openai-gpt-image.ts` - OpenAI-compatible adapter using `NEWAPI_*` env vars
- `index.ts` - Registry with auto-init: the default OpenAI adapter is registered on module import

`/api/generate` handles both text-to-image and image-to-image. Hook [hooks/useGenerate.ts](hooks/useGenerate.ts) handles client-side generation calls with loading state and error handling.

Prompt expansion: `/api/prompt/expand` uses a separate LLM (`LLM_*` env vars) to enhance user prompts before generation.

### Redemption Code System

Admin creates redemption codes via `/api/admin/redemption`. Users redeem via `/api/redemption/redeem`. Codes have optional expiration and batch tracking.

### Admin Panel

Routes under `/admin/*` (dashboard, users, redemption codes, credit records, messages). Protected by client-side role check in [app/admin/layout.tsx](app/admin/layout.tsx). Server-side admin routes use `requireAdmin()` middleware.

### Image Storage

Images uploaded to Qiniu Cloud Storage via [lib/utils/qiniu-upload.ts](lib/utils/qiniu-upload.ts). All images stored under configured folder (default: `GPT-Image-2`).

**Generated images are compressed to WebP via sharp** before upload to reduce storage and bandwidth.

Key functions: `uploadBuffer()`, `uploadFile()`, `downloadAndUpload()`, `deleteFile()`, `extractKeyFromUrl()`.

Image URLs use Qiniu domain format: `http://${QINIU_DOMAIN}/${folder}/${filename}`

User avatars stored in `GPT-Image-2/users/` subfolder with format `users/{userId}_{timestamp}_{nanoid}.{ext}`.

## Important Notes

### better-sqlite3 Native Module

`better-sqlite3` is a native Node.js module. It must be listed in `serverExternalPackages` in [next.config.ts](next.config.ts) to prevent bundling issues. If you add other native packages, add them there too.

### Ant Design X Hydration Issues

Ant Design X components (Sender, Attachments) can cause React hydration mismatches during SSR. Use the `useMounted` hook pattern to defer rendering until client-side:

```tsx
const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};

// In render:
{!mounted ? <Spin /> : <Sender ... />}
```

### User Avatar Updates

When updating user avatar via API, always return the complete user object including `role` field to prevent state loss in AuthContext. Old avatar should be deleted from Qiniu after successful upload of new one.

## Environment Variables

Required in `.env.local`:

```
# Image Generation (OpenAI-compatible API)
NEWAPI_API_KEY=your-api-key
NEWAPI_BASE_URL=https://your-api-endpoint
NEWAPI_MODEL=model-name

# Prompt Expansion LLM
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://your-api-endpoint
LLM_MODEL=model-name

# Qiniu Cloud Storage
QINIU_ACCESS_KEY=your-access-key
QINIU_SECRET_KEY=your-secret-key
QINIU_BUCKET=your-bucket
QINIU_ZONE=z2  # z0:华东, z1:华北, z2:华南
QINIU_DOMAIN=your-domain
QINIU_FOLDER=GPT-Image-2  # Upload folder path
```

## Key Types

- [types/ai.ts](types/ai.ts) - `GenParams`, `GenResult`, `EditParams`
- [types/user.ts](types/user.ts) - `User`, `Session`, `UserRole`
- [types/conversation.ts](types/conversation.ts) - `Message`, `Conversation`, `MessageStatus`
- [types/credit-record.ts](types/credit-record.ts) - `CreditRecord`, `CreditRecordType`
- [types/redemption.ts](types/redemption.ts) - `RedemptionCode`, `RedemptionCodeStatus`