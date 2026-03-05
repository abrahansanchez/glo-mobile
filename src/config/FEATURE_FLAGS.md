# Feature Flags

## Current flags

`FEATURE_FLAGS.ELITE_ONBOARDING`

- Purpose: gate Elite onboarding rollout and allow instant rollback to stable onboarding.
- Production default: `false` unless explicitly enabled in Expo config (`expo.extra.featureFlags.ELITE_ONBOARDING`).
- Backend remains source of truth for onboarding state; this flag only controls which mobile onboarding navigator is used.

## Local/dev override

In dev builds, a persisted override is available from **Settings -> Feature Flags (Dev)**.

- Toggle ON: routes onboarding users to `EliteOnboardingNavigator`.
- Toggle OFF: routes onboarding users to `StableOnboardingNavigator`.

The dev override is persisted in `SecureStore` and survives app restarts.

## Safe rollout

1. Keep production default OFF.
2. Test with dev toggle ON in internal QA.
3. When ready, explicitly enable in Expo config for release builds.
4. If issues appear, flip OFF (rollback) and redeploy.

## Notes

- No backend APIs are changed by this flag.
- Existing auth and onboarding-resume flow remains intact.
