# Asset Setup (Expo)

This app uses static icon and splash assets via Expo config.

## Active paths
- App icon: `assets/brand/icon/app_icon.png`
- Splash image: `assets/brand/splash/splash_universal.png`

Configured in `app.json`:
- `expo.icon`
- `expo.splash.image`
- `expo.splash.resizeMode = "contain"`
- `expo.splash.backgroundColor = "#000000"`
- `expo.android.adaptiveIcon.backgroundColor = "#000000"`

## Supported source sizes (current)
- App icon: `1024x1024` PNG
- Splash universal: `2048x2048` PNG
- Optional reference animation: `assets/brand/animations/splash_animation_reference.gif`

## Safe replacement steps
1. Replace files at the same paths and keep exact filenames:
   - `assets/brand/icon/app_icon.png`
   - `assets/brand/splash/splash_universal.png`
2. Keep PNG format and the target dimensions above.
3. Run validation:
   - `npx tsc --noEmit`
   - `npx expo export`
4. Rebuild app binaries/dev client to see updated native icon and splash.

## Notes
- Animated splash is not implemented in native code in this phase.
- iOS and Android native launch assets are generated from Expo config during build.
