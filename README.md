# LifeOS

Personal life operating system — a single app for tasks, time, habits, journal, study, goals, and finance.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (`new-york` style, `slate` base color)
- **Prisma 6** + **SQLite** (local dev)
- **NextAuth v5** + `@auth/prisma-adapter`
- `zod`, `zustand`, `recharts`, `date-fns`, `lucide-react`, `bcryptjs`

## Folder layout

```
app/          Next.js routes (App Router)
components/   Shared UI (sidebar, etc.) + shadcn primitives under components/ui
features/     Feature modules — one folder per domain (tasks, habits, journal, ...)
lib/          Utilities, db client, auth config
types/        Shared TypeScript types
prisma/       Prisma schema + SQLite dev database
```

## Prerequisites

- Node.js 18.18+ (22 recommended)
- npm 10+

## Setup

```bash
# 1. Install deps
npm install

# 2. Copy the env file and fill in values
cp .env.example .env

# 3. Create the SQLite database + generate the Prisma client
npx prisma migrate dev --name init
```

`DATABASE_URL` is preset to `file:./dev.db`, which puts the SQLite file at `prisma/dev.db`.

## Run

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). You should see the sidebar shell with Dashboard / Tasks / Time / Habits / Journal / Study / Goals / Finance / Settings.

## Useful scripts

```bash
npm run dev        # start Next.js dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint

npx prisma studio            # open Prisma Studio (db GUI)
npx prisma migrate dev       # create + apply a migration
npx prisma generate          # regenerate the Prisma client
```

## Adding shadcn components

```bash
npx shadcn@latest add button card input
```

The shadcn config lives in `components.json`; generated primitives go in `components/ui/`.
