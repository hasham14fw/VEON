# HORIZON 1440 — Project Directory Structure & Architecture Guide

This document outlines the organized directory hierarchy of **HORIZON 1440 (VEON GEO-EW System)**, detailing the purpose and architectural role of each folder and file.

---

## High-Level Directory Overview

```
HORIZON-1440/
├── app/                        # Next.js App Router (RSC + Client Components)
│   ├── api/                    # API Route Handlers (Edge & D1 mutations)
│   │   ├── auth/               # Authentication (login, logout, me)
│   │   ├── market-sync/        # Market quotes provider ingestion & rule engine
│   │   ├── moon/               # USNO Astronomical moon phase ephemeris
│   │   ├── situations/         # Situation dossiers and scenario persistence
│   │   └── workspace/          # Central workspace state & audit log mutations
│   ├── login/                  # Dedicated Executive Login Portal (VEON Yellow)
│   │   └── page.tsx            # Split-screen centered authentication page
│   ├── brand-fonts.css         # Self-hosted typography (Montserrat & Open Sans)
│   ├── globals.css             # Tailwind v4 styles, themes, and executive design tokens
│   ├── layout.tsx              # Root HTML/Head structure and metadata
│   └── page.tsx                # Protected Early-Warning Workspace Dashboard
│
├── components/                 # React UI Component Hierarchy
│   ├── auth/                   # Authentication & security presentation components
│   ├── ui/                     # Reusable Shadcn UI primitives (buttons, dialogs, etc.)
│   ├── workspace/              # Modular Domain Intelligence Panels
│   │   ├── alert-queue.tsx     # Tier-ranked incident & candidate review queue
│   │   ├── assessment-desk.tsx # Threat scoring, corroboration gating & evidence
│   │   ├── brief-archive.tsx   # Executive situation brief generator & archive
│   │   ├── country-domains.tsx # Country-level exposure by political/kinetic driver
│   │   ├── coverage-map.tsx    # Natural Earth geospatial footprint & gap tracker
│   │   ├── market-signals.tsx  # Financial market quotes, charts & candidate reviews
│   │   ├── moon-control.tsx    # Ephemeris moon phase astronomical context
│   │   ├── situation-filters.tsx # Real-time filtering by driver, tier, and freshness
│   │   ├── source-registry.tsx # 23-source operational onboarding & readiness
│   │   ├── use-workspace.tsx   # Workspace state management hook and mutation actions
│   │   ├── validation-lab.tsx  # Historical baseline replay and audit log inspector
│   │   ├── workspace-status.tsx# Global error and notice feedback toasts
│   │   └── index.ts            # Barrel export of all modular workspace panels
│   └── horizon-workspace.tsx   # Facade re-exporting modular workspace components
│
├── db/                         # Database Configuration & ORM Schemas
│   ├── index.ts                # Drizzle ORM client initialization
│   ├── schema.ts               # Drizzle table definitions (situations, records, audit)
│   └── store.ts                # Cloudflare D1 database connection accessor
│
├── docs/                       # Project Documentation & Architecture Guides
│   ├── roadmaps/               # Detailed technical enhancement & integration roadmaps
│   │   ├── PROJECT_ANALYSIS_AND_IMPROVEMENT_ROADMAP.md
│   │   ├── enhancement_and_architecture_roadmap.md
│   │   └── HORIZON_1440_Enhancement_and_Architecture_Roadmap.docx
│   ├── BRAND-IMPLEMENTATION.md # VEON corporate design system guidelines
│   ├── DIRECTORY_STRUCTURE.md  # Detailed filesystem and architectural breakdown
│   ├── EXPORT-VALIDATION.md    # Pre-deployment validation procedures
│   └── IMPLEMENTATION.md       # Operational deployment & configuration guide
│
├── drizzle/                    # Cloudflare D1 SQL Schema Migrations
│   ├── 0000_init.sql           # Initial database tables schema
│   └── meta/                   # Migration metadata snapshots
│
├── hooks/                      # Shared React Utilities
│   └── use-mobile.ts           # Responsive screen-breakpoint hook
│
├── lib/                        # Business Logic, Data Models & Rule Engine
│   ├── horizon/                # Core Geopolitical Intelligence Engine
│   │   ├── auth.ts             # Edge authentication, session tokens & timing guards
│   │   ├── engine.ts           # 3-Domain Clue Gate, risk math & anomaly detection
│   │   ├── model.ts            # Zod validation schemas and TypeScript definitions
│   │   └── storage.ts          # Key-value record abstraction over Cloudflare D1
│   ├── situations.ts           # Seed dossiers across Ukraine, Pakistan, etc.
│   └── utils.ts                # Shared Tailwind `cn` utility helper
│
├── public/                     # Static Assets Served at Edge
│   ├── brand/                  # VEON Yellow logos, patterns & brand typography
│   │   ├── fonts/              # Self-hosted Montserrat & Open Sans TTF fonts
│   │   ├── veon-logo-yellow.svg# Official VEON Yellow logo vector (#FFC836)
│   │   ├── veon-logo-black.svg # VEON Black logo vector for print
│   │   └── veon-pattern.svg    # Geometric corporate background watermark
│   ├── data/                   # Static Geospatial Datasets
│   │   └── world.json          # Natural Earth world country geometry GeoJSON
│   ├── references/             # Authoritative concept and methodology whitepapers
│   └── favicon.svg             # Application favicon vector
│
├── tests/                      # Automated Test Suites
│   └── horizon-engine.test.mjs # Unit tests for math, clue gating & tier boundaries
│
├── worker.ts                   # Cloudflare Worker Edge Handler (Auth Guard & Routing)
├── wrangler.jsonc              # Cloudflare Workers & D1 database configuration
├── vite.config.ts              # Vite + Vinext Next.js App Router compiler config
├── tsconfig.json               # TypeScript compiler options and `@/*` path mapping
└── package.json                # Project dependencies, engines and run scripts
```

---

## Detailed Directory Responsibilities

### 1. `app/` — Application Pages & API Routes
Built using React Server Components (RSC) and Client Components compiled with **Vinext**:
- **`app/page.tsx`**: Main secure dashboard displaying situations, scenarios, matrix heatmaps, and evidence.
- **`app/login/page.tsx`**: Brand-new executive split-panel Login Page matching VEON Yellow branding with "VEON GEO-EW System" identity.
- **`app/api/auth/`**:
  - `login/route.ts`: Validates operator credentials, generates session token, sets HTTP-only `horizon_session` cookie.
  - `logout/route.ts`: Clears session cookie.
  - `me/route.ts`: Returns current operator identity and session status.
- **`app/api/workspace/route.ts`**: Aggregates state and orchestrates mutations for situations, evidence, alerts, sources, and audit logs.
- **`app/api/market-sync/route.ts`**: Ingests normalized FX/futures feeds and evaluates market anomaly triggers.
- **`app/globals.css`**: Comprehensive design system tokens, Tailwind v4 utilities, dark mode colors, and glowing VEON Yellow styling.

### 2. `components/` — Modular Presentation Layer
Structured into focused directories:
- **`components/ui/`**: Standard, reusable UI primitives (Dialog, Button, Select, Tabs, etc.).
- **`components/workspace/`**: Cleanly modularized components extracted from the formerly monolithic workspace file:
  - `alert-queue.tsx`: Ranked threat candidates and escalation approvals.
  - `assessment-desk.tsx`: Situation risk and confidence scoring with the 48h Clue Gate.
  - `coverage-map.tsx`: World map highlighting the 5 core operating markets.
  - `market-signals.tsx`: Macro futures and local FX monitoring charts.
  - `brief-archive.tsx`: Board and executive brief generation.
  - `source-registry.tsx`: Management of 23 intelligence sources across 8 domains.
  - `validation-lab.tsx`: Historical anomaly replays and audit trails.
- **`components/horizon-workspace.tsx`**: Unified facade re-exporting all modular panels to ensure 100% backward compatibility for existing code.

### 3. `lib/horizon/` — Core Intelligence Engine
Houses all mathematical and regulatory rules:
- **`engine.ts`**: Pure functions for:
  - Risk formula: $R = 0.25S + 0.20P + 0.25B + 0.15V + 0.15C$
  - Multi-domain clue gate: Requires 3 distinct qualifying domains within 48h for $\ge$ Warning tier.
  - Price anomaly threshold detection and statistical z-score baselines.
- **`model.ts`**: Complete Zod validation schemas (`assessmentSchema`, `evidenceSchema`, `quoteSchema`) and TypeScript definitions for all 23 sources.
- **`auth.ts`**: Edge credentials verification supporting both HTTP Basic headers and secure `horizon_session` cookies with constant-time string comparison (`safeCompare`).
- **`storage.ts`**: Generic typed D1 database storage operations (`readRecord`, `writeRecord`, `records`).

### 4. `docs/` — Documentation & Specifications
Organized into dedicated subdirectories:
- **`docs/roadmaps/`**: Enhancement roadmaps, free API connection guides, and AI Copilot architecture.
- **`docs/BRAND-IMPLEMENTATION.md`**: Official typography, color palette, and logo usage guidelines.
- **`docs/IMPLEMENTATION.md`**: Instructions for environment setup, D1 migrations, and Cloudflare deployment.

---

## Verification & Integrity
The directory reorganization preserves 100% build integrity:
- `tsc --noEmit`: 0 TypeScript compiler errors.
- `node --test tests/*.test.mjs`: 10/10 automated tests passing.
