# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
```

## Architecture

### SQLite Database

Persistent storage using better-sqlite3 in [lib/db/sqlite.ts](lib/db/sqlite.ts). Database file located at `data/users.db` relative to `process.cwd()`.

Main entities:
- `users` - User accounts with credits, roles, authentication
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

Admin routes require `role === 'admin'`. Admin panel at `/admin/*` uses client-side auth check in layout.

### Credit System

Users have credits consumed per image generation. Configuration in [lib/utils/size-config.ts](lib/utils/size-config.ts):

| Resolution | Credit Cost |
|------------|-------------|
| 1K | 0.15 |
| 2K | 0.25 |
| 4K | 0.35 |

Default credits on registration: 0.15 (equals 1K generation).

Credit operations via `users.deductCredits()`, `users.refundCredits()`, `users.adjustCredits()`. All operations logged to `credit_records` table.

### AI Image Generation Adapter Pattern

Located in [lib/ai/](lib/ai/):
- `adapter.ts` - `ImageGenAdapter` interface
- `openai-gpt-image.ts` - OpenAI-compatible adapter using `NEWAPI_*` env vars
- `index.ts` - Registry: `registerAdapter()`, `getAdapter()`, `generateImage()`

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

Generated images saved to `public/images/` via [lib/utils/image-storage.ts](lib/utils/image-storage.ts).

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
```

## Key Types

- [types/user.ts](types/user.ts) - `User`, `Session`, `UserRole`
- [types/conversation.ts](types/conversation.ts) - `Message`, `Conversation`, `MessageStatus`
- [types/credit-record.ts](types/credit-record.ts) - `CreditRecord`, `CreditRecordType`
- [types/redemption.ts](types/redemption.ts) - `RedemptionCode`, `RedemptionCodeStatus`

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- better-sqlite3 (SQLite database)
- bcryptjs (password hashing)
- Ant Design X (chat UI), Ant Design 6
- Tailwind CSS 4
- OpenAI SDK