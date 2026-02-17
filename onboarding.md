LO MOBILE — ONBOARDING PROCESS CHECKLIST (BARBER-FIRST + TRIAL)

(Mobile-only onboarding. Backend remains source of truth. No UI polish yet — architecture + flow only.)

🧭 PHASE M0.5 — ONBOARDING (FOUNDATION FLOW)

⏱️ 2–4 days
🎯 Goal: A barber can install the app, complete setup fast, and reach the dashboard with a trial active.

M0.5.1 — Onboarding State + Entry Routing
Create onboarding state flags

onboardingComplete (boolean)

onboardingStep (string or number, optional but recommended for resume)

trialStatus (read-only from backend)

App launch routing rules

If NOT logged in → WelcomeScreen

If logged in AND onboardingComplete === false → OnboardingNavigator

If logged in AND onboardingComplete === true → Dashboard

✅ Exit Condition:
Cold start always routes correctly (no loops, no blank screens).

M0.5.2 — Welcome Screen (Value Framing)

Screen 1

Must include

Headline (barber-specific)

2–3 bullet benefits

CTA buttons:

Get Started

Log In

Navigation

Get Started → PhoneSignupScreen

Log In → existing LoginScreen

✅ Exit Condition:
User can enter onboarding or login intentionally.

M0.5.3 — Phone Signup (OTP) OR “Continue With Login”

Screen 2

Inputs

Phone number

OTP code

Behavior

If new barber → create account + issue JWT

If existing barber → login + issue JWT

Rules

No surveys

No long forms

Phone is primary identity

✅ Exit Condition:
Barber becomes authenticated and proceeds to onboarding.

M0.5.4 — Profile Basics Setup

Screen 3

Inputs

Display name

Timezone

Preferred language

Save to backend

Name used in AI greeting

Language used for call handling

Timezone used for availability rules

✅ Exit Condition:
Profile saved successfully and persists after app restart.

M0.5.5 — Availability Setup

Screen 4

Inputs (v1 simple)

Working days (Mon–Sun toggles)

Start time / End time

Optional: “Days off” (can be skipped)

Save to backend

Must be enforced by AI booking logic (already built)

✅ Exit Condition:
Availability saved and confirmed by backend response.

M0.5.6 — Phone Number Choice (Critical Decision)

Screen 5

Question

“Which number should Glō answer for you?”

Options

A: Use my current barber number (Recommended)

B: Get a new Glō number

C: I’ll set this up later (Skip)

✅ Exit Condition:
User selects A/B/C and app routes to correct next step.

M0.5.7 — Number Setup Execution

Screen 6

Path A — Use existing number (Forwarding Wizard)

Choose carrier

Show forwarding code + “Copy” button

Show “Test Forwarding” instruction

Confirm success (simple)

Path B — Get new Glō number

Select area code (optional)

Assign Twilio number (backend)

Confirm assigned number

Path C — Skip

Save “setup pending”

Continue onboarding (but warn later)

✅ Exit Condition:
Backend has a saved routing state:

forwarding enabled OR number assigned OR pending.

M0.5.8 — Permissions Screen

Screen 7

Request permissions (v1)

Notifications (required)

Microphone (required for voice features)

Contacts (optional)

Rules

If required permission denied → show “Enable in Settings” instructions and block next step until allowed (or allow “skip for now” only if you want softer onboarding)

✅ Exit Condition:
Required permissions either granted OR properly handled with a clear UX.

M0.5.9 — Go Live Screen

Screen 8

Copy

“Glō is now ready to answer your calls.”

Actions

“Call my number to test”

“Enter Dashboard”

✅ Exit Condition:
User reaches dashboard route successfully.

M0.5.10 — Trial Activation (Smart Placement)

NO NEW SCREEN
This is a backend action triggered immediately after Go Live (or first dashboard entry).

Backend sets

subscriptionStatus = TRIAL

trialEndsAt = now + 7 days (or your chosen trial duration)

Mobile behavior

Reads and displays trial status (read-only)

Does NOT handle billing logic

✅ Exit Condition:
A newly onboarded barber sees trial active and can access paid features during the trial.

M0.5.11 — Onboarding Completion Lock + Resume Support
Behavior

Set onboardingComplete = true when user finishes Go Live

If user closes app mid-onboarding, resume at last step using onboardingStep

✅ Exit Condition:
Onboarding runs once, resumes reliably if interrupted.

✅ PHASE M0.5 EXIT CONDITIONS (FINAL)

A first-time barber can:

Install app

Sign up / log in

Set profile + availability

Choose number strategy (or defer)

Grant permissions

Go live

Enter dashboard

Automatically start trial

🔒 SCOPE GUARDS (DO NOT DO YET)

Not in this phase:

UI polish / branding

Animations

CallKit / lock screen calls

APNs / Push certificates

TestFlight / App Store prep

Those are later phases.