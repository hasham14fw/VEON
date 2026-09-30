# HORIZON 1440 — Project Analysis, Missing Implementations & Enhancement Roadmap

---

## 1. Executive Overview

**HORIZON 1440** is an analytical intelligence platform designed for geopolitical risk monitoring, macroeconomic tracking, and corporate situational awareness across five core VEON operating markets:
- **Ukraine** (Kyivstar)
- **Pakistan** (Jazz)
- **Bangladesh** (Banglalink)
- **Kazakhstan** (Beeline KZ)
- **Uzbekistan** (Beeline UZ)
- **Global Situations & Macro Commodities** (Brent, WTI, Gold, EUR/USD)

### Technical Architecture
- **Language & Runtime:** TypeScript 5.9, Node.js (v22+), Cloudflare Workers (`workerd`).
- **Frontend:** React 19 (React Server Components — RSC) compiled with **Vinext** (Vite-based Next.js App Router runtime).
- **Styling:** Tailwind CSS v4 with custom corporate themes and dark mode tokens.
- **Database & Storage:** **Cloudflare D1** (Serverless distributed SQL / SQLite) paired with **Drizzle ORM** (`situations`, `workspace_records`, `audit_events`).
- **Security & Access:** HTTP Basic Authentication (`HORIZON_USERNAME`, `HORIZON_PASSWORD`) enforced at the Cloudflare Worker edge.

---

## 2. Further Implementation: Missing Integrations & Disconnected APIs

While the database schema, mathematical scoring engine, and audit ledger are operational, **the external data collection layer is currently non-functional and consists entirely of disconnected stubs and mocks.**

```
Current Reality:
┌────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│ 23 Source Metadata     │ ──X─ │ No Live API Ingestion   │ ──X─ │ Empty Tables / Stubs │
│ (ACLED, FIRMS, Radar)  │      │ (Status: "Unavailable") │      │ (Manual Import Only) │
└────────────────────────┘      └─────────────────────────┘      └──────────────────────┘

Target Architecture:
┌────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│ Free & Public APIs     │ ──── │ Cloudflare Cron Workers │ ──── │ Live D1 Database     │
│ (GDACS, OpenSky, GDELT)│      │ & Webhook Collectors    │      │ (Automated Records)  │
└────────────────────────┘      └─────────────────────────┘      └──────────────────────┘
```

### 2.1 The 23 Disconnected Source Stubs
In [`lib/horizon/model.ts`](file:///d:/HORIZON-1440/lib/horizon/model.ts), 23 intelligence sources across 8 domains are defined as static seeds:
- All sources have `status: 'Unavailable'`, `cadence: 'Not configured'`, and `retention: 'Pending rights review'`.
- No actual API clients, parsers, or webhook listeners exist to poll these sources.

#### Immediate Action Plan: Connect Free/Open Public APIs

| Domain | Source ID | Current Seed Name | Recommended Free API Connector | Implementation Task |
|---|---|---|---|---|
| **Conflict** | `acled` | ACLED Core / CAST | **ACLED Access API** | Free research registration. Build scheduled worker fetching events by ISO codes (`UA`, `PK`, `BD`, `KZ`, `UZ`). |
| **Conflict** | `ucdp` | UCDP | **UCDP API v2.1** | **100% Free & Open** (`https://ucdpapi.pcr.uu.se/api/events/24.1`). Ingest conflict events without API keys. |
| **Conflict** | `gdacs` | GDACS | **GDACS Live GeoJSON** | **Open Feed** (`https://www.gdacs.org/xml/rss.xml`). Ingest real-time earthquakes, floods, and cyclones. |
| **Connectivity** | `cloudflare` | Cloudflare Radar | **Cloudflare Radar API** | **Free with Cloudflare account**. Query `/radar/outages` and `/radar/traffic/anomalies` for monitored ASNs. |
| **Connectivity** | `ioda` | IODA | **CAIDA IODA API** | Free public REST API. Automatically ingest BGP and macro-connectivity outage signals. |
| **Earth Obs** | `firms` | NASA FIRMS | **NASA FIRMS REST API** | Free Map Key. Query satellite VIIRS/MODIS thermal anomalies within 15 km of network assets. |
| **Aviation** | `adsb` | ADS-B Exchange | **OpenSky Network API** | Free tier (4,000 req/day). Query commercial flight density drops across closed airspace corridors. |
| **Aviation** | `safeairspace` | Safe Airspace | **EASA CZIB Bulletins** | Open RSS feed of conflict zone bulletins (Black Sea, Middle East airspace closures). |
| **Maritime** | `portwatch` | IMF PortWatch | **IMF PortWatch API** | Open geospatial data tracking shipping disruption in Red Sea, Suez Canal, and Bab el-Mandeb. |
| **Media** | `gdelt` | GDELT 2.0 | **GDELT DOC 2.0 API** | **100% Free & Open**. Ingest global news mentions, crisis tone, and sentiment every 15 minutes. |
| **Financial** | `officialfx` | Official Rates | **Frankfurter API** | Free European Central Bank and central bank reference exchange rates. |
| **Financial** | `marketdata` | Market FX / Futures | **Yahoo Finance / AlphaVantage** | Free quotes for Brent (`BZ=F`), WTI (`CL=F`), Gold (`GC=F`), and EUR/USD (`EURUSD=X`). |

### 2.2 Disconnected Market Feed Adapter
- **Current State:** The market feed requires a manual JSON file upload or an external `MARKET_FEED_URL` which is currently unset (`connector.configured = false`).
- **Required Implementation:**
  1. Add a scheduled Cloudflare Worker (`scheduled` event / Cron Trigger) that runs every 15–60 minutes.
  2. Automatically fetch quotes from free market endpoints (Yahoo Finance / Frankfurter).
  3. Validate against `quoteSchema` and commit directly to D1 with origin `'connector'`.
  4. Automatically evaluate threshold rules to trigger `market-candidate` records without human intervention.

---

## 3. Major Improvements & Feature Innovations

### 3.1 AI Copilot (Chat with Workspace)

#### The Problem
Analysts and executives must manually cross-reference dozens of tables, situation matrices, and evidence rows to understand the current threat posture.

#### The Solution: Embedded RAG Copilot
Integrate an interactive AI Assistant panel directly into the workspace:

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 HORIZON AI COPILOT                     [Clear] [Close ✕] │
├─────────────────────────────────────────────────────────────┤
│ User: What is the current threat to Kyivstar's power        │
│ resilience and fuel supplies in Ukraine?                    │
│                                                             │
│ AI Copilot:                                                 │
│ Based on active workspace evidence:                         │
│ 1. Grid instability remains at SEVERE risk (Score: 82/100)  │
│    [Situation #SIT-UA-01].                                  │
│ 2. Recent thermal anomalies confirmed within 12km of core   │
│    substations [Evidence #ev-firms-2026-0928].              │
│ 3. Backup diesel fuel reserves are rated at 72h operating   │
│    autonomy across tier-1 data centers [Assessment rev 4].  │
│                                                             │
│ ⚠️ Recommendation: Escalate Alert candidate #ALT-0928-01    │
│ to 'Approved' for Board notification.                       │
│                                                             │
│ [Draft Board Brief] [View Cited Evidence]                   │
├─────────────────────────────────────────────────────────────┤
│ 💬 Ask about situations, evidence, or market trends...      │
└─────────────────────────────────────────────────────────────┘
```

#### Key Capabilities
1. **Zero Hallucination with Grounded RAG:**
   - The Copilot is grounded strictly in stored D1 records (`situations`, `assessments`, `evidence`, `quotes`).
   - If information is missing, the AI explicitly states: *"Insufficient verified evidence in workspace."*
2. **Clickable Citations:**
   - Mentions of evidence generate interactive pills (e.g. `[Evidence #ev-104]`) that instantly open and highlight the corresponding source record.
3. **One-Click Board Brief Drafting:**
   - Command: *"Draft a 200-word executive summary for the Audit Committee on Bangladesh telecom stability."*
   - Generates a formatted brief and populates a new `Draft` brief record ready for human review.
4. **Backend Options:**
   - **Zero-Egress Option:** Cloudflare Workers AI using `@cf/meta/llama-3.1-8b-instruct`.
   - **Advanced Multi-Modal Option:** Google Gemini 1.5 Pro / Flash via REST API.

---

### 3.2 AI-Assisted Decisions & Automated Triage

#### The Problem
Currently, every situation assessment, risk score calculation (severity, plausibility, velocity, corroboration), and candidate promotion requires extensive manual data entry, leading to analyst fatigue and delayed escalation.

#### AI Decision Capabilities to Implement
1. **Automated Risk Triage & Scoring Recommendations:**
   - When new evidence is ingested, the AI analyzes the stance (`Supports`, `Contradicts`, `Context`) and credibility, then suggests updated scores for:
     - **Plausibility** (0%, 25%, 50%, 75%, 100%)
     - **Velocity** (Hours vs Days vs Weeks)
     - **Corroboration** (Cross-domain evidence match)
2. **Automated Candidate Escalation Recommendations:**
   - The AI continuously runs the **Clue Gate Rule** (*three distinct qualifying domains within 48 hours*).
   - Once satisfied, it triggers an AI Recommendation: *"Clue gate verified across Conflict, Connectivity, and Aviation. Ready for human approval."*
3. **Human-in-the-Loop Governance Guardrails:**
   - **AI Proposes, Human Decides:** The AI **never** automatically marks an alert as `'Approved'`. It generates the recommendation with structured reasoning, requiring an authorized human approver to authenticate and sign off.
   - **Audit Trail Attribution:** All AI recommendations, suggested scores, and rationales are logged to `audit_events` with `actor: 'ai-copilot-engine'`.

---

### 3.3 Live Source Streaming (Real-Time Telemetry)

#### The Problem
The current system is entirely passive: users must reload the page or click manual refresh buttons. Data does not update dynamically when market prices swing or breaking news occurs.

#### Streaming Architecture
```
┌─────────────────────────────────┐
│ External Sources (GDELT, NASA) │
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ Cloudflare Scheduled Worker     │
│ (Polls feeds every 5-15 mins)   │
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ Server-Sent Events (SSE) Engine │  ──> /api/stream (Live Push)
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│ Browser Workspace Client        │
│ • Live Threat Ticker Scrolling  │
│ • Flash Badge on Incoming Clue  │
│ • Dynamic Map Pin Appearance    │
└─────────────────────────────────┘
```

#### Streaming Features to Implement
1. **Server-Sent Events (`/api/stream`):**
   - Lightweight, edge-friendly push mechanism to stream new evidence and quotes to active browser tabs without heavy WebSocket overhead.
2. **Breaking News & Threat Ticker:**
   - A live ticker banner across the top of the interface that flashes when a high-velocity event or currency threshold breach occurs.
3. **Sound / Visual Pulse Alerts:**
   - Subtle UI pulses on affected country maps when a Severe or Critical event arrives.

---

### 3.4 Interface Complexity & UX Redesign

#### The Problem
The current user interface is **overly dense, complex, and cognitively overwhelming**:
- Massive tables with dozens of columns and micro-text.
- Mathematical scoring forms (severity, plausibility, precision, velocity) displayed simultaneously.
- Heavy cognitive load for senior executives who only need high-level situational awareness.
- Key operational tools (e.g. moon controls, raw JSON quotes, manual imports) clutter the main view.

#### UX Solutions & Redesign Blueprint

```
Dual-Mode Switch:  [ 🏢 Executive War Room ]  |  [ 🔬 Analyst Workspace ]
```

#### 1. Executive War Room Mode (For C-Suite & Leadership)
- **High-Impact Visual HUD:** High-contrast dark styling designed for boardroom displays.
- **Top 3 Threat Cards:** Clean visual cards displaying only the most critical active situations (Score, Tier, 48h Trend).
- **Interactive Asset Map:** Full-screen GIS map showing:
  - Country threat heatmaps.
  - VEON critical infrastructure nodes (Kyivstar MSCs, Jazz headquarters, Banglalink submarine cable landing points).
  - Green / Amber / Red operational status indicators.
- **One-Click Executive Briefing View:** Read clean, curated daily summaries without raw database tables.

#### 2. Analyst Workspace Mode (For Risk & Intelligence Officers)
- **Progressive Disclosure:** Hide advanced calibration forms behind modal wizards or collapsible accordions.
- **Guided Assessment Wizard:** Replace the 12-input assessment form with a 3-step wizard:
  1. *Step 1: Impact Scope (People, Network, Revenue)*
  2. *Step 2: Threat Dynamics (Severity & Velocity sliders)*
  3. *Step 3: Verification (Evidence link check)*
- **Interactive Evidence Graph:** Replace flat evidence tables with an interactive **D3.js node graph** showing connections between Sources ➔ Clues ➔ Situations.

---

## 4. Phased Implementation Roadmap

```
Phase 1: UX Simplification & War Room Map (Weeks 1–2)
├── Build Executive War Room HUD & Dual-Mode Toggle
├── Integrate VEON Asset GeoJSON onto GIS Map
└── Add Live Operational Threat Ticker

Phase 2: Free Public Data Feed Connectors (Weeks 3–4)
├── Connect GDACS (Disasters) & NASA FIRMS (Fires/Explosions)
├── Connect Cloudflare Radar (Outages) & IODA (Network Drops)
└── Connect Yahoo Finance / Frankfurter (FX & Commodities)

Phase 3: AI Copilot & Decision Engine (Weeks 5–6)
├── Deploy Cloudflare Workers AI / Gemini API route
├── Build Grounded RAG Query Engine on D1 Database
├── Implement Clickable Evidence Citations in Chat
└── Add AI-Assisted Score & Escalation Suggestions

Phase 4: Live Streaming & Enterprise Governance (Weeks 7–8)
├── Implement Server-Sent Events (SSE) Live Feed Push
├── Implement Role-Based Access Control (RBAC: Viewer, Analyst, Approver)
└── Add Dual-Control (Two-Person) Rule for Alert Sign-off
```
