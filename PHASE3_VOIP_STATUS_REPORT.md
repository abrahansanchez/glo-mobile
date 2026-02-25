# Phase 3 VoIP Status Report

## Files changed
- `src/voice/voipPushService.js`
- `src/voice/CallManager.js`
- `src/notifications/pushNotifications.js`
- `src/auth/authContext.js`
- `src/screens/TranscriptDetailScreen.js`
- `src/screens/TranscriptsScreen.js`
- `src/utils/transcriptTimeline.js` (new)

## What was fixed
- VoIP listener hardening:
  - Twilio listeners now attach once and earlier in init.
  - App state transitions are logged.
  - Added invite queue if invite arrives before `deviceReady`; queue is drained on `deviceReady`.
  - Added `deviceReady` watchdog timeout warning.
  - Added structured diagnostics log:
    - `[VOIP_DIAG] { appState, deviceReady, hasInvite, callSid, isForeground }`
  - Added incoming payload call sid mapping logs.
- Foreground/background UI routing:
  - Foreground invite logs and routes to in-app overlay.
  - Background/locked invite logs and skips overlay.
  - Explicit routing markers:
    - `[CALL_UI_ROUTE] foreground_overlay`
    - `[CALL_UI_ROUTE] background_native`
- Answer / Let AI Handle reliability:
  - Added in-flight per-invite action guard (double-tap safe).
  - Added backend result marker for AI takeover:
    - `[AI_HANDLE_RESULT] { ok, status, callSid }`
  - On AI takeover backend failure, user-visible alert is shown and invite remains actionable.
- Push registration robustness:
  - Registration still skips when token+projectId are unchanged.
  - Added retry/backoff for backend register (2 retries max).
  - Added required logs:
    - `[PUSH_REGISTER] attempt n`
    - `[PUSH_REGISTER] success`
    - `[PUSH_REGISTER] failed`
  - Added token refresh listener path and app-active recheck path.
- Transcript compatibility:
  - Added shared timeline normalizer that prefers `messages[]`.
  - Fallback to legacy `transcript[]` + `aiResponses[]` with synthesized timeline by index.
  - Added render mode logs:
    - `[TRANSCRIPT_RENDER_MODE] messages`
    - `[TRANSCRIPT_RENDER_MODE] legacy`
  - Null/missing field handling hardened to avoid crashes.
- Expo notifications deprecation cleanup:
  - Removed deprecated `shouldShowAlert` from notification handler.
  - Kept banner/list/sound/badge behavior equivalent.

## What remains blocked by native rebuild
- Locked-screen/background incoming call UX verification remains dependent on native iOS binary/runtime state (CallKit/PushKit entitlements, signing, VoIP cert/config, native module runtime).
- JS routing/logging is now explicit, but final locked-screen native call UI confirmation still requires testing on a rebuilt/reinstalled native app.

## Manual test script
1. Foreground incoming + Answer
- Ensure app is open and active.
- Trigger inbound call.
- Tap `Answer` once; also try rapid double tap.
- Verify only one action is executed and overlay dismisses cleanly.

2. Foreground incoming + Let AI Handle
- Ensure app is open and active.
- Trigger inbound call.
- Tap `Let AI Handle` once; also try rapid double tap.
- Verify one backend request path, one local dismiss path, and overlay state remains sane.
- Simulate backend failure and confirm alert appears; invite remains actionable.

3. Background/locked incoming call
- Put app in background or lock device.
- Trigger inbound call.
- Verify no in-app overlay route is attempted.
- Verify native call UI path/logging branch is selected.

4. Transcript list/detail rendering
- Open Transcripts list.
- Verify rows render when payloads have `messages[]` and when only legacy fields are present.
- Open transcript detail for both payload types.
- Verify role-based timeline renders and no crash on null/missing fields.

## Expected log markers by test
- Foreground incoming:
  - `[CALL_UI_ROUTE] foreground_overlay`
  - `[VOIP_DIAG] { ... isForeground: true ... }`
- Background/locked incoming:
  - `[CALL_UI_ROUTE] background_native`
  - `[VOIP_DIAG] { ... isForeground: false ... }`
- Device readiness diagnostics:
  - `[VOIP] ✅ deviceReady (VoIP push registered)`
  - or watchdog warning if delayed
- AI takeover path:
  - `[AI_HANDLE_RESULT] { ok, status, callSid }`
- Push registration:
  - `[PUSH_REGISTER] attempt n`
  - `[PUSH_REGISTER] success` or `[PUSH_REGISTER] failed`
- Transcript rendering mode:
  - `[TRANSCRIPT_RENDER_MODE] messages|legacy`

## Validation run
- `npx tsc --noEmit` -> passed
- `npm run` -> no lint/test scripts are configured in `package.json` (only start/platform scripts)
