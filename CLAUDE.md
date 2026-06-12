# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

App that projects all statistical markets for every 2026 World Cup match (result, goals, cards, scorers, corners) using a custom model. Framing: "this is how AI predicts the World Cup". Entertainment analysis only — NO betting platform: it shows probabilities, never processes bets.

## Stack

- Next.js 15 (App Router) + React + TypeScript
- Tailwind + shadcn/ui
- Recharts for visualizations
- SQLite (better-sqlite3) or local Postgres for data caching
- node-cron / Vercel Cron for daily recalculation
- Data source: API-Football (RapidAPI). Fallback: football-data.org

## Architecture

- **Server Actions** for data fetching — no standalone API routes except the cron endpoint.
- **`lib/model/`** is the prediction engine: isolated, fully testable, zero UI coupling.
- Every prediction is persisted with a timestamp to power the "prediction history" feature.
- Components are Server Components by default; `"use client"` only where there is interactivity.

## Commands

```bash
pnpm install
cp .env.example .env.local   # set RAPIDAPI_KEY
pnpm dev                      # localhost:3000
pnpm cron:run                 # manually trigger recalculation
```

## Design direction

The UI must look like a **sports data broadcast terminal** (Opta / Stats Perform aesthetic): dark background with one accent color, large numbers as the visual protagonist, custom visualizations. It must never look like a generic AI app (no Inter font, no purple gradients, no floating rounded cards, no default Recharts styling). Commit to this direction across every screen without deviation.

## Conventions

- No `--` (double dash) anywhere in code or text.
- Implementation detail lives in `PLAN.md`, not here.
