# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resume optimization web app for job searching. Reads a resume from Notion, analyzes a job description with Claude, proposes targeted edits, lets the user accept/reject each one, then writes accepted changes directly back to the Notion page and downloads a .docx.

## Architecture

Single Next.js 15 app (App Router) deployed on Vercel. No database — persistence is handled by Upstash Redis for few-shot learning only.

```
/app
  page.jsx                  — full UI (single page, client component)
  layout.jsx                — minimal root layout
  globals.css               — all styles
  /api
    /analyze/route.js       — reads Notion resume + calls Claude
    /apply/route.js         — writes accepted changes back to Notion
    /download/route.js      — generates .docx from modified resume text
    /feedback/route.js      — saves accepted/rejected examples to Upstash Redis
```

## User Flow

1. User opens the app — Notion page URL is hardcoded (no input needed)
2. Pastes a job description → clicks Analyze
3. Backend reads resume from Notion, calls Claude Haiku, returns suggestions
4. User accepts/rejects each suggestion; preview tab shows colored diff
5. Clicks "Apply to Notion & Download" — changes written to Notion live + .docx downloaded
6. Accept/reject decisions saved to Redis for few-shot learning on future runs

## Key Design Decisions

- **Notion URL is hardcoded** in `app/page.jsx` (`localStorage` default) — no URL input shown to user
- **No OAuth** — Notion uses a simple integration token; resume page must be shared with the integration
- **Few-shot learning** — last 5 approved + 3 rejected suggestions are injected into the Claude prompt to match the user's style over time. Stored in Upstash Redis under key `examples` (capped at 50)
- **Write-back strategy** — `apply/route.js` finds the Notion block containing `original` text and updates it via `notion.blocks.update()`. Preserves block type but replaces rich_text with a single plain text run
- **Approval invariant** — nothing is written to Notion until the user explicitly clicks "Apply to Notion & Download"
- **Claude model** — `claude-haiku-4-5-20251001`, max 6 suggestions per analysis

## Development Commands

```bash
# From project root (~/Projects/Operation job search)
npm run dev        # starts on http://localhost:3000
npm run build      # production build
```

## Environment Variables

In `/env.local` (local) and Vercel dashboard (production):

```
ANTHROPIC_API_KEY=
NOTION_API_KEY=          # secret_... or ntn_... from notion.so/my-integrations
UPSTASH_REDIS_REST_URL=  # from Vercel Marketplace → Upstash Redis (optional, enables few-shot)
UPSTASH_REDIS_REST_TOKEN=
```

## Deployment

- **Vercel** — auto-deploys on push to `main` branch of `github.com/imperfectsunset29/New-job-search-tool`
- **Live URL** — https://new-job-search-tool.vercel.app

## Notion Setup (one-time)

1. notion.so/my-integrations → create "Resume Optimizer" integration → copy token
2. Open resume Notion page → Share → Invite the integration
3. The page ID is extracted automatically from the hardcoded URL

## Key Constraints

- **Block update limitation** — `apply/route.js` replaces the entire rich_text of a block with a single plain text run, which strips any inline formatting (bold, italic, links) in that block. Acceptable tradeoff for simplicity.
- **Claude API calls server-side only** — API key never reaches the client.
- **iCloud Drive is broken for this project** — project must stay at `~/Projects/Operation job search`, not in iCloud Drive. Running from iCloud causes `.env.local` to not be read and npm to fail.
