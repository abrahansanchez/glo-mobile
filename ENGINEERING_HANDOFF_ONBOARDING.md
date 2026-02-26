# Engineering Handoff: Elite Onboarding + Trial + Number Porting

## Scope
Implement the new onboarding funnel defined in `ONBOARDING_ELITE_BLUEPRINT.md` with backend-first state, free trial integration, and number porting path.

## Non-Negotiables
1. Backend is source of truth for onboarding/trial/porting status.
2. Mobile SecureStore is cache/fallback only.
3. All mutating endpoints are idempotent.
4. Event tracking schema is frozen before implementation.
5. Number porting UX includes clear timeline and failure recovery.

## Owners
- Product: final copy, legal disclosures, pricing/trial terms
- Design: final Figma flow + component specs + motion
- Backend: onboarding/trial/porting APIs + statuses + ops hooks
- Mobile: flow UI, navigation, API integration, analytics wiring
- QA: cross-path validation matrix + release signoff
- Ops/Support: porting SLA + carrier rejection playbook

## Critical Decisions To Lock Before Coding
1. Go-live policy while porting is pending:
   - Option A: allow temporary number + call forwarding
   - Option B: block go-live until port complete
2. Trial policy:
   - trial length
   - payment method required upfront or not
   - renewal amount/date disclosure text
3. Porting provider/process:
   - API-driven vs manual ops queue
4. Required legal docs:
   - LOA format, signature flow, retention requirements

## API Contracts (Must Be Finalized First)
1. `GET /onboarding/status`
- Returns step completion map + next step.
- Includes trial and phone setup states.

2. `POST /onboarding/step`
- Body: `{ step, data, completedAt, idempotencyKey }`
- Idempotent update.

3. `POST /phone/number-strategy`
- Body: `{ strategy: "port_existing" | "new_number" }`

4. `POST /phone/porting/start`
- Body: `{ phoneNumber, carrier, accountNumber, pin, billingZip, contactName, contactEmail, idempotencyKey }`

5. `POST /phone/porting/documents`
- Multipart: bill + signed LOA

6. `GET /phone/porting/status`
- Returns: `draft | submitted | carrier_review | approved | completed | rejected`
- Includes actionable `blockers[]`

7. `POST /billing/trial/start`
- Body: `{ planId, paymentMethodId?, idempotencyKey }`

8. `GET /launch/checklist`
- Returns readiness booleans + blocker reasons.

## Analytics Events (Freeze Names/Props)
- `onboarding_step_viewed`
- `onboarding_step_completed`
- `onboarding_step_skipped`
- `onboarding_drop_off`
- `trial_start_clicked`
- `trial_started`
- `trial_start_failed`
- `porting_started`
- `porting_submitted`
- `porting_failed_validation`
- `porting_status_updated`
- `onboarding_completed`

Required common props:
- `barberId`, `sessionId`, `step`, `platform`, `appVersion`, `timestamp`

## Sprint Plan

### Sprint 1 (Core Conversion)
Backend:
1. Ship onboarding status + step endpoints.
2. Ship trial start endpoint.
3. Ship number strategy endpoint.

Mobile:
1. Reorder onboarding funnel.
2. Implement Number Strategy screen.
3. Implement Trial Start screen and call backend.
4. Add event tracking wiring for new screens.

QA:
1. Validate fresh signup and returning-user resume.
2. Validate trial success/failure paths.

Acceptance Criteria (Sprint 1):
1. User can complete onboarding and start trial end-to-end.
2. Resume opens correct next step from backend status.
3. Analytics events fire with required props.

### Sprint 2 (Porting + Go Live)
Backend:
1. Ship porting start/documents/status endpoints.
2. Integrate carrier/ops path and rejection reasons.
3. Ship launch checklist endpoint.

Mobile:
1. Implement Number Porting screens and status tracker.
2. Implement Go Live checklist with blockers.
3. Add support entry points for rejected porting cases.

QA:
1. Validate porting happy path and rejection/retry flow.
2. Validate go-live gating behavior per final policy.

Acceptance Criteria (Sprint 2):
1. Porting flow works end-to-end with clear statuses.
2. Checklist correctly reflects readiness and blockers.
3. Users understand next actions without contacting support.

## QA Matrix (Required)
1. New-number path + trial started
2. Port-existing path + submitted + pending review
3. Port-existing path + rejected + resubmitted
4. Trial start fails + retry
5. App reinstall + resume onboarding
6. Offline during step submit + retry on reconnect
7. Multi-device same account state sync

## Release Guardrails
1. Feature-flag the new onboarding.
2. Roll out to internal users first, then beta cohort.
3. Daily funnel dashboard review during first 14 days.
4. Rollback switch must route users to current stable onboarding.

## Launch KPIs
1. Onboarding completion rate
2. Time-to-go-live median
3. Trial start rate
4. Trial conversion rate
5. Port submission completion rate
6. Port approval cycle time
7. D7 retention

