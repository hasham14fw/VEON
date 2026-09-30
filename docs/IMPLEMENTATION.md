# HORIZON 1440 — PRD implementation, 28 September 2026

This release extends the existing private Site. It is a working **owner-only analytical pilot**, not a live operational warning service. All existing situations and source links are preserved. New D1 migrations only add tables and indexes; existing situation values are unchanged. No outbound messages, subscriptions, paid data purchases, automated financial or field actions are enabled.

## Working functionality

| PRD area | Implemented |
|---|---|
| SIT 01–05 | Existing global/five-market cases and matrix; lifecycle distinct from legacy posture; explicit day bands; scenario assumptions, implications, evidence, owner and review fields; spillover rationales; append-only revision snapshots and conflict detection. |
| SRC 01–04 | Registry for all eight source domains; editable licensing, ownership, cadence, coverage, lineage, contact and retention; structured supporting/contrary/context evidence with three timestamps and immutable provenance. Candidate feeds are explicitly unavailable. |
| MKT 01–07 / UX 04 | Canonical watchlist for five local FX pairs, EUR/USD, Euro FX, Brent, WTI and gold with front/3M/6M points; local derivative availability placeholders; validated JSON imports, duplicate handling, date ranges, contract-specific charts, metadata, live/delayed/reference/stale/closed/imported/synthetic states. Normalized HTTPS provider adapter with server-only credential and explicit manual refresh. |
| DET / RISK | Weighted scores and confidence, incomplete-input protection, tier boundaries; maximum domain/lineage matching for three verified clues in 48 hours, geography/exposure checks, source availability-time restrictions, exclusion of synthetic/social-only evidence; diagnostic daily Z-score replay with 60/90-day guardrails. |
| Market candidates | Chronological provider evaluations, two consecutive crossings, four-hour cooldown, three evaluations below 80% to reset; duplicate/retry protection; deterministic Treasury review candidates. Imported snapshots and stale/expired/roll-due/nonpositive/incomparable quotes cannot trigger these candidates. |
| GOV | Candidate → Under review → Approved → Acknowledged → Action recorded → Closed, server-side transitions and approval checks, immutable evidence IDs/revision/approver at approval, documented emergency override, outcomes and feedback. Internal acknowledgment only, with no claim of delivery. |
| UX | Country coverage map from Natural Earth; five market drill-downs, approved-case ranking and domain summaries; time/driver/tier/confidence/freshness filters; explicit coverage gaps. |
| BRF | Editable daily/weekly drafts from current cases, saved archive, internal approval, JSON export, existing printable board brief. |
| LUN 01–06 | Signed-in persistent default-off moon toggle, IANA timezone presets, local-calendar-day event definition, replay date, next event, USNO phase API, cached verified 2026–27 ephemeris, weekly on-access refresh, midnight/resume refresh and unavailable handling. No lunar input in risk or alert logic. |
| ENG / NFR | Server API validation, owner authorization, same-origin mutation checks, durable records, optimistic concurrency, append-only audit, preserved legacy data, keyboard controls and responsive layouts. |
| VAL | Pure-rule regression tests and an interactive baseline replay diagnostic. These are software checks, not geopolitical predictive validation. |

## Activation dependencies / work not represented as complete

- **Live sources:** no provider subscriptions, entitlements, API keys or authorized asset datasets were supplied. No data feed from the seven geopolitical categories is connected. The market adapter expects a provider-normalized API; vendor-specific adapters and entitlement validation remain to be commissioned once a provider is selected. Imports are not live feeds.
- **Scheduling and delivery:** no scheduler, queue, notification channel, named recipients/deputies or business calendars are active. Market refresh is manual; lunar refresh runs on access. Daily/weekly briefs are manually generated. Background ingestion, retry queues, dead letters, outbox delivery receipts and timed escalation need production service integration.
- **Permissions:** platform access remains owner-only. Server APIs explicitly allow the verified owner. Team role/market access, independent approver separation and shared readers are not activated; do not broaden Site sharing without implementing that model.
- **Calibration:** inputs and thresholds are provisional, not approved Treasury limits or measured forecasts. No scoring dictionary, historical event labels, calibrated 7/30/90-day forecasts, holdout performance or guaranteed lead times are claimed.
- **AI:** no model provider is connected. No synthetic chatbot answers or automated approval are presented. Evidence-grounded AI Q&A remains P1 work after provider/key approval.
- **Operational map:** country geometry and approved-case drill-down are present; asset geometries, exact alert footprints, map clustering, actual network assets and exposure sensitivities require authorized data and additional implementation.
- **Financial details:** provider must supply validated session calendar, contract and comparison contract, expiry and roll date. Returns use supplied comparable settlement/cutoff baselines. Automatic exchange-calendar roll selection, vendor symbol administration, corrections/revision lineage beyond new event IDs, full raw-tick retention, unrestricted history pagination and trading-grade delivery/volume metadata require provider integration. No futures are invented for local currencies.
- **Governance:** source configurations and assessments are revisioned. Dedicated two-person rule/recipient approval, recipient calendars and operational delivery SLAs remain inactive. An approved alert in this release is an internal decision only.
- **Operations:** 99.5% availability, p95 load/latency, 50 concurrent users/10k cases, daily backup/restore drills, automatic retention enforcement, monitoring dashboards and RPO/RTO are PRD targets, not certified by this release.
- **Evidence capacity:** pilot reads latest 1,000 records per business kind, 3,000 market observations, 100 briefs and 200 audit events. Per-situation audit shows latest 100. Scale to cursor-paginated queries and archival storage before substantial live ingestion. Full immutable records remain in D1.

## Data and source notes

Natural Earth country outlines (public domain): https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . Country geometry is contextual, not a border-policy position.

USNO phase API: https://aa.usno.navy.mil/data/api . USNO publishes Universal Time at minute precision; the display maps it to UTC at that precision before applying IANA timezone conversion. The provider interval is validated; missing coverage cannot produce a false “No”.

## Provider adapter contract

Configure `MARKET_FEED_URL` as an HTTPS endpoint returning an array accepted by `quoteSchema` in `lib/horizon/model.ts`. Set optional `MARKET_FEED_TOKEN` as a server-only secret; it is sent as Bearer authorization to that endpoint. Never put tokens into client code, source records or query strings. Redirects are refused. Payload limit is 500 observations and 1 MB. A configured URL alone does not prove a feed is operational.

Every row identifies `eventId`, canonical `instrumentId`, price and unit, comparable session/five-session/hour baselines, source, observed and published timestamps, session, entitlement kind and delay, exact contract and comparison contract, expiry, roll date, optional volume/open interest and expected next reference release. Null baselines mean unavailable. The app stamps receipt time. Futures require contract metadata; quote direction must match the instrument registry. The upstream adapter must calculate roll dates from the verified exchange calendar and supply the appropriate front/3M/6M contracts. Zero and negative prices remain visible as exceptional observations but percentage alerts are suppressed.

Use the in-app import template for manual data. Imported and synthetic observations cannot be rebadged live. Repeated source/event IDs are idempotent; a correction must be a new event ID and should explain its relationship to the original upstream event.

## Verification

- `pnpm exec tsc --noEmit`
- `node --test tests/horizon-engine.test.mjs`
- Site production build
- Managed preview checks for persistent lunar preferences and replay, assessment saves, candidate transitions, synthetic approval blocking, evidence and source forms, board archive and market empty/import states.

Local preview data is isolated from the deployed database. Test records never enter production migrations.

Pre-deployment inspection confirmed the live DB had the `situations` table and zero saved rows. Existing seven examples remain source-defined and unchanged; additive migrations do not rewrite them.
