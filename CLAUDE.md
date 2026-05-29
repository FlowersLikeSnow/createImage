# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI image generation web application built with Next.js 16, featuring multi-image generation, prompt expansion via LLM, and local image storage. Chinese language UI.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 3001

# Production
npm run build        # Build for production
npm run start        # Start production server on port 3001

# Quality
npm run lint         # Run ESLint
```

## Architecture

### Adapter Pattern for AI Image Generation

The AI image generation uses an adapter pattern located in [lib/ai/](lib/ai/):

- `adapter.ts` - Defines `ImageGenAdapter` interface with `generate()`, `isAvailable()`, `name`, `modelId`
- `openai-gpt-image.ts` - OpenAI-compatible adapter using `NEWAPI_*` env vars
- `index.ts` - Registry system: `registerAdapter()`, `getAdapter()`, `generateImage()` convenience function

To add a new AI provider, implement `ImageGenAdapter` interface and register via `registerAdapter()`.

### In-Memory Database

Uses global JavaScript Map storage in [lib/db/index.ts](lib/db/index.ts) to solve Next.js hot reload data loss:

- `conversationsStore` - Stores conversation metadata
- `messagesStore` - Stores messages per conversation
- Operations: `conversations.create/get/getAll/update`, `messages.create/getByConversation/update/delete/getAllImages`

Data persists only during server runtime; resets on server restart.

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/generate` | Generate images, handles multi-image requests (1-10 images) |
| `/api/images` | GET: list all images, DELETE: remove image |
| `/api/conversations` | CRUD for conversations |
| `/api/conversations/[id]/messages` | Get messages for a conversation |
| `/api/prompt/expand` | Expand short prompts into detailed English prompts via LLM |

### Component Structure

- [components/chat/ChatContainer.tsx](components/chat/ChatContainer.tsx) - Main container with image grid display, input area, and controls
- Input area uses `@ant-design/x` Sender component with footer customization

### Hooks

- `useGenerate` - Handles image generation API calls, returns `generate()` function
- `useConversation` - Manages conversation state, loading, and selection

### Image Storage

Generated images are downloaded from external URLs and saved to `public/images/` via [lib/utils/image-storage.ts](lib/utils/image-storage.ts). Functions: `saveImageLocally()`, `deleteLocalImage()`, `getLocalImages()`.

### Image Size Configuration

[lib/utils/size-config.ts](lib/utils/size-config.ts) defines size presets across three resolution levels (1K, 2K, 4K) with various aspect ratios (1:1, 2:3, 16:9, etc.).

## Environment Variables

Required in `.env.local`:

```
# Image Generation (OpenAI-compatible API)
NEWAPI_API_KEY=your-api-key
NEWAPI_BASE_URL=https://your-api-endpoint
NEWAPI_MODEL=model-name

# Prompt Expansion LLM
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=glm-5
```

## Key Types

See [types/](types/):

- `GenParams`, `GenResult` - AI generation request/response types
- `Message`, `Conversation` - Data model types with `status` field for processing states
- `MessageStatus` - `'pending' | 'processing' | 'completed' | 'failed'`

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Ant Design X (chat UI), Ant Design 6
- Tailwind CSS 4
- OpenAI SDK (for both image generation and LLM calls)