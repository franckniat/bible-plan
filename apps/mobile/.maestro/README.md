# End-to-end flows (Maestro)

The paths that must never break, run on a simulator or an emulator where
the app is installed: [Maestro](https://maestro.mobile.dev) drives it by the
`testID`s of its controls, so the flows do not depend on the language.

```bash
APP_ID=<bundle identifier> pnpm --filter mobile test:e2e
```

`APP_ID` is the identifier of the installed app (Android package, iOS
bundle id). Each flow starts from a fresh install (`clearState`).

- `flows/first-launch.yaml`: welcome, onboarding, the five tabs.
- `flows/offline-plan.yaml`: a plan from a template and a reading ticked
  off, in airplane mode on Android.
- `shared/`: steps the flows share, not run on their own.
