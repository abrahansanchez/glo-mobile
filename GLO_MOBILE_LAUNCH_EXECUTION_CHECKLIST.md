# GLO MOBILE — LAUNCH EXECUTION CHECKLIST

Legend:
- 🟢 completed with code-level certainty
- ⚪ not completed / not verified yet

---

# PHASE 2 — MOBILE PORTING + GO LIVE

## 11. Porting Flow UI

🟢 Porting form  
🟢 Status tracker  
🟢 Rejection recovery flow  
🟢 Skip option (if policy allows temp number)

---

## 12. Go Live Checklist Screen

🟢 Shows blockers  
🟢 Shows readiness state  
🟢 Links to fix actions

---

# PHASE 3 — Navigation Refinement (No Full Redesign)

## 13. Navigation Consolidation

🟢 Home (command center)  
🟢 Schedule  
🟢 Inbox (calls + voicemail + transcripts)  
🟢 Insights (analytics)  
🟢 Settings  

No backend change required.

---

# PHASE 4 — UI Maturity Pass (High Impact, Low Risk)

## 14. Visual System Cleanup

🟢 Standardize spacing scale  
🟢 Increase card padding  
🟢 Normalize badge styling  
🟢 Improve typography hierarchy  
🟢 Remove placeholder text  
🟢 Add empty-state design

---

## 15. Remove “Junior” Signals

🟢 No debug labels  
🟢 No placeholder disclaimers  
🟢 No inconsistent button styles  
🟢 No misaligned icons

---

# PHASE 5 — Voice UX Verification (Light Audit Only)

## 16. Language Lock

⚪ Confirm no auto-language switching  
🟢 Confirm barber preference enforced

---

## 17. Stress Tests

⚪ Poor network  
⚪ Background → foreground  
⚪ Multiple calls  
⚪ Offline onboarding retry

---

# PHASE 6 — Branding & Store Readiness

## 18. Logo Direction

🟢 Define positioning (premium/minimal)  
🟢 Create wordmark  
🟢 Create icon mark  
🟢 Test dark/light modes

---

## 19. App Store Assets

🟢 Icon  
🟢 Splash screen  
⚪ Screenshots  
⚪ Description copy

---

# PHASE 7 — Launch Guardrails

## 20. Feature Flags

🟢 New onboarding behind flag  
🟢 Rollback switch

---

## 21. Metrics Dashboard

Track daily:

🟢 Onboarding completion rate  
🟢 Trial start rate  
🟢 Port submission rate  
🟢 D7 retention  
🟢 Calls handled in first 72h  

---

# ENGINEERING HANDOFF  
## Elite Onboarding + Trial + Number Porting

## Scope

Implement the new onboarding funnel defined in `ONBOARDING_ELITE_BLUEPRINT.md` with backend-first state, free trial integration, and number porting path.

---

# Non-Negotiables

1. 🟢 Backend is source of truth for onboarding/trial/porting status  
2. 🟢 Mobile SecureStore is cache/fallback only  
3. ⚪ All mutating endpoints are idempotent  
4. ⚪ Event tracking schema frozen before implementation  
5. 🟢 Number porting UX includes timeline and recovery

---

# Owners

Product  
Design  
Backend  
Mobile  
QA  
Ops/Support  

---

# Critical Decisions To Lock Before Coding

⚪ Go-live policy while porting pending  
- Option A: allow temporary number + call forwarding  
- Option B: block go-live until port complete  

⚪ Trial policy  
- trial length  
- payment method required upfront  
- renewal disclosure text  

⚪ Porting provider/process  
- API-driven vs manual ops  

⚪ Legal docs decisions  
- LOA format  
- signature flow  
- retention requirements  

---

# API Contracts (Must Be Finalized First)

🟢 `GET /onboarding/status`  
Returns step completion map + next step.

🟢 `POST /onboarding/step`  
Body:

{ step, data, completedAt, idempotencyKey }


🟢 `POST /phone/number-strategy`  
Body:

{ strategy: "port_existing" | "new_number" }


🟢 `POST /phone/porting/start`

Body:

{ phoneNumber, carrier, accountNumber, pin, billingZip, contactName, contactEmail, idempotencyKey }


⚪ `POST /phone/porting/documents`

Multipart upload:
- phone bill
- signed LOA

🟢 `GET /phone/porting/status`

Returns:

draft
submitted
carrier_review
approved
completed
rejected


🟢 `POST /billing/trial/start`

Body:

{ planId, paymentMethodId?, idempotencyKey }


🟢 `GET /launch/checklist`

Returns readiness booleans + blockers.

---

# Analytics Events (Freeze Names)

🟢 onboarding_step_viewed  
🟢 onboarding_step_completed  
🟢 onboarding_step_skipped  
⚪ onboarding_drop_off  
🟢 trial_start_clicked  
🟢 trial_started  
🟢 trial_start_failed  
🟢 porting_started  
🟢 porting_submitted  
🟢 porting_failed_validation  
🟢 porting_status_updated  
🟢 onboarding_completed  

Required props:


barberId
sessionId
step
platform
appVersion
timestamp


---

# Sprint Plan

## Sprint 1 — Core Conversion

### Backend

⚪ Ship onboarding status endpoint  
⚪ Ship trial start endpoint  
⚪ Ship number strategy endpoint  

### Mobile

🟢 Reorder onboarding funnel  
🟢 Implement Number Strategy screen  
🟢 Implement Trial Start screen  

🟢 Complete analytics event wiring

### QA

⚪ Validate fresh signup  
⚪ Validate returning user resume  
⚪ Validate trial success/failure  

---

# Sprint 2 — Porting + Go Live

### Backend

⚪ Ship porting start/documents/status endpoints  
⚪ Integrate carrier/ops rejection handling  
⚪ Ship launch checklist endpoint  

### Mobile

🟢 Implement porting screens  
🟢 Implement porting status tracker  
🟢 Implement Go Live checklist  

### QA

⚪ Validate porting happy path  
⚪ Validate port rejection recovery  
⚪ Validate go-live gating rules  

---

# QA Matrix

⚪ New-number path + trial started  
⚪ Port-existing path + submitted + pending review  
⚪ Port-existing path + rejected + resubmitted  
⚪ Trial start fails + retry  
⚪ App reinstall + resume onboarding  
⚪ Offline step submit + reconnect retry  
⚪ Multi-device state sync  

---

# Release Guardrails

🟢 Feature-flag new onboarding  
⚪ Internal rollout → beta rollout  
⚪ Daily funnel review first 14 days  
🟢 Rollback switch to stable onboarding  

---

# Launch KPIs

🟢 Onboarding completion rate  
⚪ Time-to-go-live median  
🟢 Trial start rate  
⚪ Trial conversion rate  
🟢 Port submission completion rate  
⚪ Port approval cycle time  
🟢 D7 retention  

---

# ONBOARDING ELITE BLUEPRINT

## Target Funnel

🟢 Welcome  
🟢 Account  
🟢 Business Snapshot  
🟢 Number Strategy  
🟢 Number Porting  

⚪ AI Preview  
⚪ Calendar Connect  
⚪ Permissions  

🟢 Start Free Trial  
🟢 Go Live Checklist  

---

# Frontend State Strategy

🟢 Backend is source of truth  
🟢 SecureStore is fallback cache  

App start reconciliation:

1. fetch `/onboarding/status`
2. map to navigator step
3. fallback to cache only if offline

---

# Visual Direction

⚪ Editorial typography  
⚪ Premium spacing  
⚪ Subtle motion transitions  
⚪ Calm neutral palette with single accent  

---

# Rollout Plan

## Sprint 1

🟢 Funnel ordering  
🟢 Trial screen integration  
🟢 Analytics events  
🟢 Go-live checklist  

## Sprint 2

⚪ Server-synced onboarding state  
⚪ A/B test trial placement  
⚪ Copy optimization  
🟢 Funnel analytics dashboard  

---

# Success Metrics

🟢 Onboarding completion rate  
⚪ Median time-to-go-live  
⚪ Number strategy selection rate  
🟢 Port submission completion rate  
⚪ Port approval cycle time  
🟢 Trial start rate  
⚪ Trial conversion rate  
🟢 D7 retention  
🟢 Calls handled in first 72h
