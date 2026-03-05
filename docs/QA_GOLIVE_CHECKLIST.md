# QA Go Live Checklist

## Scope
Manual QA for `GoLiveChecklistScreen` edge cases, blocker parsing, and safe action routing.

## Test Cases

1. All ready
- Mock response: readiness/checks values all `true`, no blockers.
- Expected: all rows show `✅ Ready`, blockers card hidden, `Go to Dashboard` enabled.

2. One blocker (porting)
- Mock response: blocker `"PORTING_REQUIRED"`.
- Expected: blockers card shows one item, `Fix` routes to `PortingStatus` or `PortingForm` fallback.

3. Multiple blockers
- Mock response: blockers include porting docs + trial + number strategy.
- Expected: each blocker row renders with independent `Fix` action and no navigation crash.

4. Missing/unknown blocker code
- Mock response: blocker object `{ code: "SOMETHING_NEW", message: "Unknown blocker" }`.
- Expected: generic blocker UI renders; `Fix` falls back safely to `Settings` or alert.

5. Offline / request fails
- Disable network or force API failure.
- Expected: error message shown, existing content cleared, manual refresh still available.

6. Pull-to-refresh
- On checklist screen, pull down.
- Expected: refresh indicator appears, API is called again, UI updates from latest payload.

## Payload Variants to Validate
- `readiness: { ... }`
- `checks: { ... }`
- top-level boolean keys only
- blockers as string array
- blockers as object array `{ code, message, action }`
