# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this codebase.

## Project Overview

AI image generation web application built with Next.js 16, featuring user authentication, credit-based image generation, admin panel, and redemption code system. Chinese language UI.

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

## Architecture

### SQLite Database

Persistent storage using better-sqlite3 in [lib/db/sqlite.ts](lib/db/sqlite.ts). Database file located at `data/users.db` relative to `process.cwd()`.

Main entities:
- `users` - User accounts with credits, roles, authentication, avatar
- `sessions` - Login sessions with token expiration
- `conversations` / `messages` - Chat history and generated images
- `redemption_codes` - Credit redemption codes
- `credit_records` - Credit transaction history

All exports available via [lib/db/index.ts](lib/db/index.ts).

### Authentication System

Located in [lib/auth/](lib/auth/):
- `password.ts` - bcrypt password hashing (cost factor 10) and verification
- `token.ts` - Session token generation using nanoid
- `middleware.ts` - `verifyAuth()` for API protection, `requireAdmin()` for admin routes

API routes:
- `/api/auth/register` - User registration with captcha verification
- `/api/auth/login` - Login returns Bearer token
- `/api/auth/me` - Get current user info
- `/api/auth/logout` - Delete session
- `/api/auth/profile` - Update nickname/avatar
- `/api/auth/avatar` - Upload avatar to Qiniu (stored in `GPT-Image-2/users/`)

Admin routes require `role === 'admin'`. Admin panel at `/admin/*` uses client-side auth check in layout.

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

### AI Image Generation

Located in [lib/ai/](lib/ai/):
- `adapter.ts` - `ImageGenAdapter` interface
- `openai-gpt-image.ts` - OpenAI-compatible adapter using `NEWAPI_*` env vars
- `index.ts` - Registry: `registerAdapter()`, `getAdapter()`, `generateImage()`

Hook [hooks/useGenerate.ts](hooks/useGenerate.ts) handles client-side generation calls with loading state and error handling.

### Redemption Code System

Admin can create redemption codes via `/api/admin/redemption`. Users redeem via `/api/redemption/redeem`. Codes have optional expiration and batch tracking.

### Admin Panel

Routes under `/admin/*`:
- `/admin` - Dashboard overview
- `/admin/users` - User management, credit adjustment
- `/admin/redemption` - Create/manage redemption codes
- `/admin/credit-records` - View all credit transactions
- `/admin/messages` - View all generated images/messages

Protected by role check in [app/admin/layout.tsx](app/admin/layout.tsx).

### Image Storage

Images uploaded to Qiniu Cloud Storage via [lib/utils/qiniu-upload.ts](lib/utils/qiniu-upload.ts). All images stored under configured folder (default: `GPT-Image-2`).

Key functions:
- `uploadBuffer()` - Upload Buffer to Qiniu
- `uploadFile()` - Upload File object to Qiniu
- `downloadAndUpload()` - Download from URL and re-upload to Qiniu
- `deleteFile()` - Delete file from Qiniu
- `extractKeyFromUrl()` - Extract file key from full URL

Image URLs use Qiniu domain format: `http://${QINIU_DOMAIN}/${folder}/${filename}`

User avatars stored in `GPT-Image-2/users/` subfolder with format `users/{userId}_{timestamp}_{nanoid}.{ext}`.

## Important Notes

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

When updating user avatar via API, always return complete user object including `role` field to prevent state loss in AuthContext. Old avatar should be deleted from Qiniu after successful upload of new one.

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

- [types/user.ts](types/user.ts) - `User`, `Session`, `UserRole`
- [types/conversation.ts](types/conversation.ts) - `Message`, `Conversation`, `MessageStatus`
- [types/credit-record.ts](types/credit-record.ts) - `CreditRecord`, `CreditRecordType`
- [types/redemption.ts](types/redemption.ts) - `RedemptionCode`, `RedemptionCodeStatus`
- [types/ai.ts](types/ai.ts) - `GenParams`, `GenResult`, `EditParams`

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- better-sqlite3 (SQLite database)
- bcryptjs (password hashing)
- Ant Design X (chat UI), Ant Design 6
- Tailwind CSS 4
- OpenAI SDK