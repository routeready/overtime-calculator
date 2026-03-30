# YardBoss — Teen Lawn & Snow Removal App

## Project Plan (V1)

---

## 1. Product Overview

A mobile-first PWA that lets a teen start a lawn/snow removal business in their neighborhood. The teen signs up, drops a pin on their street, and gets a shareable flyer/link. Neighbors request service through the link, the teen confirms jobs, and can send "on my way" / "done" status updates via email. Free for up to 5 customers, with an upsell gate after that.

### V1 Features

| # | Feature | User |
|---|---------|------|
| 1 | Sign up + drop pin on street | Teen |
| 2 | Generate shareable flyer/link | Teen |
| 3 | Request service through link | Neighbor |
| 4 | Confirm job → appears on job list | Teen |
| 5 | One-tap "on my way" / "done" + auto-email | Teen |
| 6 | Free ≤ 5 customers, upsell gate | System |

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 14 (App Router) | SSR, file-based routing, API routes, great PWA support |
| **Language** | TypeScript | Type safety, better DX |
| **Styling** | Tailwind CSS | Utility-first, fast to build mobile UIs |
| **UI Components** | shadcn/ui | Accessible, composable, no vendor lock-in |
| **Backend / DB** | Supabase (Postgres + Auth + Edge Functions) | Free tier, row-level security, real-time |
| **Maps** | Mapbox GL JS | Free tier (50k loads/mo), smooth mobile UX |
| **Email** | Supabase Edge Functions + Resend | Transactional email (free tier: 3k/mo) |
| **Hosting** | Vercel | Zero-config Next.js deploys, free tier |
| **PWA** | next-pwa | Installable on phone, offline shell |

---

## 3. Database Schema (Supabase / Postgres)

```sql
-- Teen provider accounts (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  phone text,
  pin_lat double precision not null,
  pin_lng double precision not null,
  pin_address text,
  slug text unique not null,           -- for shareable link: /s/{slug}
  created_at timestamptz default now()
);

-- Customers (neighbors who request service)
create table customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  name text not null,
  email text not null,
  address text not null,
  created_at timestamptz default now()
);

-- Service requests / jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  customer_id uuid references customers(id) not null,
  service_type text not null check (service_type in ('lawn', 'snow')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'on_my_way', 'done', 'cancelled')),
  requested_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4. File Structure

```
/
├── public/
│   ├── icons/                    # PWA icons
│   └── manifest.json             # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (mobile viewport, fonts)
│   │   ├── page.tsx              # Landing / marketing page
│   │   ├── login/
│   │   │   └── page.tsx          # Auth (sign up / sign in)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx        # Auth-gated layout
│   │   │   ├── page.tsx          # Job list (home for teen)
│   │   │   ├── setup/
│   │   │   │   └── page.tsx      # Onboarding: drop pin, set name
│   │   │   ├── flyer/
│   │   │   │   └── page.tsx      # View/share flyer + link
│   │   │   └── jobs/
│   │   │       └── [id]/
│   │   │           └── page.tsx  # Single job detail + status actions
│   │   └── s/
│   │       └── [slug]/
│   │           └── page.tsx      # Public: neighbor request form
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── map-pin-picker.tsx    # Mapbox pin-drop component
│   │   ├── job-card.tsx          # Job list item
│   │   ├── flyer-preview.tsx     # Shareable flyer card
│   │   ├── status-button.tsx     # "On my way" / "Done" button
│   │   └── upsell-gate.tsx       # Customer limit modal
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   ├── server.ts         # Server Supabase client
│   │   │   └── middleware.ts     # Auth middleware
│   │   ├── mapbox.ts             # Mapbox helpers
│   │   ├── email.ts              # Email sending via Resend
│   │   └── constants.ts          # FREE_CUSTOMER_LIMIT = 5, etc.
│   ├── hooks/
│   │   ├── use-profile.ts        # Current user profile
│   │   ├── use-jobs.ts           # Job list queries
│   │   └── use-customers.ts      # Customer count (for upsell gate)
│   └── types/
│       └── index.ts              # Shared TypeScript types
├── supabase/
│   ├── migrations/               # SQL migration files
│   └── functions/
│       └── send-status-email/    # Edge function: sends email on status change
│           └── index.ts
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 5. Sequenced Build Steps

### Phase 1 — Scaffold & Auth (Steps 1–3)

| Step | Task | Key Files |
|------|------|-----------|
| 1 | Init Next.js + TypeScript + Tailwind + shadcn/ui | `package.json`, `tailwind.config.ts` |
| 2 | Configure PWA (manifest, icons, next-pwa) | `public/manifest.json`, `next.config.js` |
| 3 | Set up Supabase client + auth (sign up / sign in) | `lib/supabase/*`, `app/login/page.tsx` |

**Milestone:** Teen can sign up and log in.

### Phase 2 — Onboarding & Pin Drop (Steps 4–5)

| Step | Task | Key Files |
|------|------|-----------|
| 4 | Build Mapbox pin-drop picker component | `components/map-pin-picker.tsx` |
| 5 | Create onboarding page (name + pin + slug) → save to `profiles` | `app/dashboard/setup/page.tsx` |

**Milestone:** Teen drops a pin and creates their profile.

### Phase 3 — Shareable Flyer & Request Form (Steps 6–8)

| Step | Task | Key Files |
|------|------|-----------|
| 6 | Generate flyer preview with share link (`/s/{slug}`) | `components/flyer-preview.tsx`, `app/dashboard/flyer/page.tsx` |
| 7 | Add native share / copy-link functionality | `app/dashboard/flyer/page.tsx` |
| 8 | Build public neighbor request form | `app/s/[slug]/page.tsx` |

**Milestone:** Neighbor can open a link and request lawn or snow service.

### Phase 4 — Job Management (Steps 9–11)

| Step | Task | Key Files |
|------|------|-----------|
| 9 | Create DB migration for `customers` + `jobs` + RLS policies | `supabase/migrations/` |
| 10 | Build job list dashboard (pending / confirmed / done) | `app/dashboard/page.tsx`, `components/job-card.tsx` |
| 11 | Add confirm / decline actions on pending jobs | `app/dashboard/jobs/[id]/page.tsx` |

**Milestone:** Teen sees incoming requests and can confirm them.

### Phase 5 — Status Updates & Email (Steps 12–14)

| Step | Task | Key Files |
|------|------|-----------|
| 12 | Build "On my way" / "Done" one-tap buttons | `components/status-button.tsx` |
| 13 | Create Supabase Edge Function to send status email via Resend | `supabase/functions/send-status-email/` |
| 14 | Wire status change → triggers email to neighbor | `lib/email.ts` |

**Milestone:** Neighbor receives email when teen is en route or finished.

### Phase 6 — Upsell Gate (Step 15)

| Step | Task | Key Files |
|------|------|-----------|
| 15 | Add customer count check + upsell modal at ≤ 5 limit | `hooks/use-customers.ts`, `components/upsell-gate.tsx` |

**Milestone:** App is free for 5 customers; upsell shown after.

### Phase 7 — Polish & Ship (Steps 16–18)

| Step | Task | Key Files |
|------|------|-----------|
| 16 | Mobile UX polish (touch targets, loading states, empty states) | All pages |
| 17 | Add Supabase RLS policies for all tables | `supabase/migrations/` |
| 18 | Deploy to Vercel + Supabase, test end-to-end | `next.config.js` |

**Milestone:** V1 live and usable.

---

## 6. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
RESEND_API_KEY=
```

---

## 7. Free Tier Budget

| Service | Free Tier | V1 Usage |
|---------|-----------|----------|
| Supabase | 50k auth users, 500MB DB | Well under |
| Mapbox | 50k map loads/mo | Well under |
| Resend | 3k emails/mo | Well under |
| Vercel | 100GB bandwidth | Well under |

**Total cost to launch V1: $0**
