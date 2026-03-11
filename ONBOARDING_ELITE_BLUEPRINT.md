# Onboarding Elite Blueprint (Premium + Easy + Trial-First)

## 1) Target Funnel
1. Welcome
2. Account (login/register)
3. Business Snapshot
4. Number Strategy (Use existing number vs Get new number)
5. Number Porting (if existing number path selected)
6. AI Preview (value demo)
7. Calendar Connect (optional skip)
8. Permissions (just-in-time)
9. Start Free Trial
10. Go Live Checklist

## 2) Screen Specs (Copy + CTA)

### Welcome
- Header: "Never Miss a Call Again"
- Subcopy: "Glō answers, qualifies, and books clients while you cut hair."
- CTA: "Get Started"
- Secondary: "I already have an account"
- Event: `onboarding_welcome_continue`

### Account
- Header: "Create Your Glō Workspace"
- Subcopy: "Set up in about 3 minutes."
- CTA: "Continue"
- Event: `onboarding_account_submit`

### Business Snapshot
- Fields: business name, services category, timezone, business phone, opening hours preset
- Header: "Tell us about your shop"
- CTA: "Save & Continue"
- Event: `onboarding_business_snapshot_submit`

### Number Strategy
- Header: "Keep Your Current Business Number?"
- Options:
  - "Port my existing number" (recommended default for established businesses)
  - "Get a new Glō number"
- Subcopy: "Most barbers keep their current number so clients don’t need to update contacts."
- CTA: "Continue"
- Event: `onboarding_number_strategy_selected`

### Number Porting
- Header: "Port Your Number to Glō"
- Required fields:
  - current phone number
  - carrier name
  - account number
  - PIN/passcode
  - billing ZIP/postal code
  - authorized contact legal name + email
- Document upload:
  - recent phone bill (PDF/photo)
  - LOA (auto-generated and e-sign)
- UX details:
  - progress tracker: `draft -> submitted -> carrier_review -> approved -> completed`
  - timeline messaging: \"Usually 3-10 business days depending on carrier.\"
  - temporary forwarding instructions while port is pending
- Primary CTA: "Submit Port Request"
- Secondary CTA: "I'll do this later"
- Events:
  - `porting_started`
  - `porting_submitted`
  - `porting_failed_validation`
  - `porting_status_updated`

### AI Preview
- Header: "This is how Glō handles your calls"
- UI: sample transcript timeline + "Booked appointment" result card
- CTA: "Looks Good"
- Event: `onboarding_ai_preview_continue`

### Calendar Connect
- Header: "Connect your calendar"
- Subcopy: "So Glō books directly into your real availability."
- CTA: "Connect Calendar"
- Secondary: "Skip for now"
- Events: `onboarding_calendar_connect_start`, `onboarding_calendar_connected`, `onboarding_calendar_skipped`

### Permissions
- Header: "Enable Key Permissions"
- Items: microphone, notifications
- CTA: "Enable Permissions"
- Secondary: "Continue for now"
- Events: `onboarding_permissions_prompt`, `onboarding_permissions_result`

### Start Free Trial
- Header: "Start Your Free Trial"
- Subcopy: "Full access for 14 days. Cancel anytime."
- Disclosure: renewal date + amount + cancellation policy
- CTA: "Start Free Trial"
- Secondary: "Choose Plan Later"
- Events: `trial_start_clicked`, `trial_started`, `trial_start_failed`

### Go Live Checklist
- Header: "You’re Almost Live"
- Checklist:
  - Phone number ready
  - AI greeting configured
  - Calendar connected
  - Availability set
  - Test call completed
- CTA: "Go Live"
- Secondary: "Make a Test Call"
- Events: `onboarding_go_live_view`, `onboarding_test_call_started`, `onboarding_completed`

## 3) IA + Navigation Rules
- Hard blocks: Account, Business Snapshot, Number Strategy, Trial (if subscription model requires it before activation).
- Conditional hard block: Number Porting becomes hard block only if user selected \"Port my existing number\" and your business rule requires completion before full go-live.
- Soft blocks (skippable): Calendar, some permissions, and porting completion (if temporary number/forwarding is allowed).
- Resume rule: always open the first incomplete hard block.
- Post-onboarding route: Dashboard with a "Launch Health" banner until checklist all green.

## 4) Trial Model
- Recommended: 14-day full-feature trial.
- Store on backend:
  - `trialStatus`: `not_started | active | expired | converted`
  - `trialStartAt`, `trialEndAt`
  - `planId`, `autoRenew`
- In-app reminders:
  - Day 1 value summary
  - Day 7 midpoint value summary
  - 48h before expiry
  - day-of expiry

## 5) Event Schema (Minimum)
- `onboarding_step_viewed`
  - props: `step`, `barberId`, `sessionId`
- `onboarding_step_completed`
  - props: `step`, `durationMs`, `barberId`
- `onboarding_step_skipped`
  - props: `step`, `reason`
- `onboarding_drop_off`
  - props: `step`, `lastAction`
- `trial_started`
  - props: `planId`, `trialDays`
- `trial_converted`
  - props: `planId`, `daysToConvert`

## 6) Backend Contracts (Add/Adjust)
- `GET /onboarding/status`
  - returns completion flags and next step.
- `POST /onboarding/step`
  - body: `{ step, data, completedAt }` idempotent.
- `POST /phone/number-strategy`
  - body: `{ strategy: "port_existing" | "new_number" }`.
- `POST /phone/porting/start`
  - body: `{ phoneNumber, carrier, accountNumber, pin, billingZip, contactName, contactEmail }`.
- `POST /phone/porting/documents`
  - multipart upload for bill + signed LOA.
- `GET /phone/porting/status`
  - returns status and blocker reasons.
- `POST /billing/trial/start`
  - body: `{ planId, paymentMethodId? }`.
- `GET /launch/checklist`
  - returns readiness booleans + missing reasons.

## 7) Frontend State Strategy
- Backend is source of truth.
- Keep SecureStore as cache/fallback only.
- Reconcile at app start:
  1. fetch `/onboarding/status`
  2. map to navigator initial step
  3. only fallback to local cache when offline

## 8) Visual Direction (Premium)
- Typography: editorial heading + clean sans body (not default system feel).
- Layout: larger spacing, fewer controls per screen, sticky CTA.
- Motion: subtle screen transition + progress bar animation.
- Surfaces: card depth + calm neutral palette + one strong accent.

## 9) Rollout Plan (2 Sprints)

### Sprint 1 (Conversion Core)
- Implement new funnel ordering
- Add free trial screen + backend start endpoint wiring
- Add analytics events + dashboard reminders
- Add go-live checklist screen

### Sprint 2 (Quality + Optimization)
- Server-synced onboarding status
- A/B test trial placement and calendar step timing
- Copy optimization and polish animations
- Full instrumentation dashboard for funnel drop-off

## 10) Success Metrics
- Onboarding completion rate
- Median time-to-go-live
- Number strategy selection rate (`port_existing` vs `new_number`)
- Port submission completion rate
- Port approval cycle time
- Trial start rate
- Trial conversion rate
- D7 retention
- Calls handled in first 72h

## Status Audit (Code-Verified)
Legend:
- `🟢` completed with code-level certainty in this repo
- `⚪` not completed or not verifiable with 100% certainty from this repo alone

### Target Funnel
1. `🟢` Welcome
2. `🟢` Account (login/register)
3. `🟢` Business Snapshot
4. `🟢` Number Strategy
5. `🟢` Number Porting
6. `⚪` AI Preview
7. `⚪` Calendar Connect
8. `⚪` Permissions (just-in-time)
9. `🟢` Start Free Trial
10. `🟢` Go Live Checklist

### Backend Contracts (Mobile Wiring)
- `🟢` `GET /onboarding/status`
- `🟢` `POST /onboarding/step`
- `🟢` `POST /phone/number-strategy`
- `🟢` `POST /phone/porting/start`
- `⚪` `POST /phone/porting/documents` (current mobile uses `/phone/porting/:id/docs`)
- `🟢` `GET /phone/porting/status`
- `🟢` `POST /billing/trial/start`
- `🟢` `GET /launch/checklist`

### Frontend State Strategy
- `🟢` Backend-first onboarding status with local cache fallback
- `🟢` App-start reconciliation via `/onboarding/status`

### Not Verifiable Here
- `⚪` Visual direction completion
- `⚪` Rollout plan execution
- `⚪` Success metric outcomes
