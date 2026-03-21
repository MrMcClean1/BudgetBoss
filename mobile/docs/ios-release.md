# iOS Release Pipeline — BudgetBoss

EAS Build handles signing, provisioning, and upload to TestFlight/App Store.

## Prerequisites

1. **EAS CLI** — install globally: `npm install -g eas-cli`
2. **Apple Developer account** (paid) linked to Expo
3. **App Store Connect app** created for `com.budgetboss.app`
4. Set real values in `eas.json` → `submit.production.ios`:
   - `appleId` — your Apple ID email
   - `ascAppId` — the numeric App ID from App Store Connect
   - `appleTeamId` — your 10-character team ID

## One-time setup

```bash
eas login            # Log in with your Expo account
eas credentials      # Let EAS generate/manage your certificate + provisioning profile
```

EAS stores credentials in the Expo cloud by default. Run `eas credentials` interactively to generate or import existing certificates.

## Build profiles

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Dev client for simulator | Local simulator |
| `preview` | Internal QA / ad-hoc | TestFlight internal |
| `production` | App Store release | TestFlight → public |

## Release workflow

### Full release (build + submit in one command)
```bash
make release-and-submit
# or: npm run release:ios
```

This builds a production IPA and automatically submits it to TestFlight via `--auto-submit`.

### Manual two-step flow
```bash
make release   # Build production IPA
make submit    # Submit the latest build to App Store Connect
```

### Quick preview / internal TestFlight
```bash
make preview
```

## Build number auto-increment

`eas.json` sets `autoIncrement: true` on the `production` profile. EAS increments `buildNumber` in `app.json` automatically on each production build — no manual editing needed.

## Environment variables

Builds run in EAS cloud. Any env vars the app needs at build time should be added as EAS secrets:

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://your-api.example.com --scope project
```

## Troubleshooting

- **Certificate errors**: run `eas credentials` to revoke and regenerate.
- **Wrong team ID**: verify in [developer.apple.com](https://developer.apple.com) → Membership.
- **Build fails on native module**: ensure all Expo SDK packages use compatible versions (`expo install` to fix).
