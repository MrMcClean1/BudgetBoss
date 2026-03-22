# BudgetBoss iOS App Store Upload Guide

This guide walks you through uploading BudgetBoss to the Apple App Store using Expo EAS Build.

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Apple Developer Account** ($99/year) — [Enroll here](https://developer.apple.com/programs/enroll/)
- [ ] **Expo Account** (free) — [Sign up here](https://expo.dev/signup)
- [ ] **Node.js 18+** installed
- [ ] **EAS CLI** installed globally

---

## Part 1: One-Time Setup

### Step 1: Install EAS CLI

```powershell
npm install -g eas-cli
```

### Step 2: Log into Expo

```powershell
cd C:\Users\alex\.minimax-agent\projects\5\BudgetBoss\mobile
eas login
```

Enter your Expo account credentials when prompted.

### Step 3: Initialize EAS Project

```powershell
eas init
```

This creates a project in your Expo dashboard and generates a project ID. The ID will be automatically added to your `app.json`.

### Step 4: Configure Apple Credentials

EAS can manage your Apple certificates and provisioning profiles automatically.

```powershell
eas credentials
```

Select:
1. **iOS**
2. **production**
3. Let EAS generate and manage credentials

This connects to your Apple Developer account and creates the necessary certificates.

### Step 5: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in the details:

| Field | Value |
|-------|-------|
| Platform | iOS |
| Name | BudgetBoss |
| Primary Language | English (U.S.) |
| Bundle ID | com.budgetboss.app |
| SKU | budgetboss-ios-001 |
| User Access | Full Access |

4. Click **Create**
5. **Important**: Copy the **Apple ID** (numeric ID shown on the app page) — you'll need this

### Step 6: Update eas.json with Your Credentials

Edit `mobile/eas.json` and replace the placeholder values:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234EF"
      }
    }
  }
}
```

**Where to find these values:**
- `appleId`: Your Apple ID email address
- `ascAppId`: The numeric Apple ID from App Store Connect (step 5)
- `appleTeamId`: Go to [developer.apple.com](https://developer.apple.com) → Account → Membership → Team ID

---

## Part 2: Prepare App Store Listing

Before submitting, you need to complete your App Store listing in App Store Connect.

### Required Information

#### App Information
| Field | Suggested Value |
|-------|-----------------|
| Name | BudgetBoss |
| Subtitle | Smart Budget & Savings Tracker |
| Category | Finance |
| Content Rights | Does not contain third-party content |

#### Pricing
- Select **Free** (monetization happens via in-app purchases)
- Or set a price if you want a paid app

#### App Privacy
Go to **App Privacy** and answer the questionnaire:

| Question | Answer |
|----------|--------|
| Do you collect data? | Yes |
| Contact Info (Email) | Collected, linked to user |
| Contact Info (Name) | Collected, linked to user |
| Financial Info | Collected, linked to user |
| Used for tracking? | No |

Link to your privacy policy: `https://budgetboss.app/privacy`

#### Screenshots (Required)

You need screenshots for:
- **6.7" iPhone** (iPhone 15 Pro Max) — 1290 x 2796 pixels
- **6.5" iPhone** (iPhone 11 Pro Max) — 1242 x 2688 pixels
- **iPad Pro 12.9"** (if supporting iPad) — 2048 x 2732 pixels

**How to capture screenshots:**
1. Run the app in iOS Simulator
2. Press `Cmd + S` to save screenshot
3. Or use a tool like [AppMockUp](https://app-mockup.com) to create professional frames

#### App Description

```
BudgetBoss - Take control of your finances with a gamified budgeting experience!

FEATURES:
• Track income and expenses across multiple accounts
• Import bank transactions via CSV (Chase, Bank of America, Rocket Money compatible)
• Set budgets by category with real-time progress tracking
• Create savings goals and watch your progress grow
• Earn XP, level up, and unlock badges for healthy financial habits
• Beautiful dark mode support

PRIVACY FIRST:
Your financial data stays on YOUR database. BudgetBoss is self-hostable and we never sell your data.

UPGRADE TO PRO:
• Unlimited bank accounts, budgets, and goals
• Advanced reports and insights
• All badge rarities
• Priority support

Start your journey to financial freedom today!
```

#### Keywords
```
budget,finance,money,savings,tracker,expense,income,personal finance,budgeting,financial
```

#### Support URL
```
https://budgetboss.app/support
```

#### Review Information
Provide demo credentials for Apple's review team:

```
Email: alex@example.com
Password: password123
```

---

## Part 3: Build and Submit

### Option A: One-Command Build + Submit (Recommended)

```powershell
cd C:\Users\alex\.minimax-agent\projects\5\BudgetBoss\mobile
eas build --platform ios --profile production --auto-submit
```

This will:
1. Build your app in EAS cloud
2. Sign it with your Apple certificates
3. Upload to TestFlight automatically
4. Submit for App Store review

### Option B: Two-Step Process

**Step 1: Build**
```powershell
eas build --platform ios --profile production
```

**Step 2: Submit**
```powershell
eas submit --platform ios --latest
```

### Build Progress

- Build typically takes 10-20 minutes
- You'll receive an email when complete
- Track progress at [expo.dev](https://expo.dev) → Your Project → Builds

---

## Part 4: App Review

### Timeline
- **First submission**: 24-48 hours (sometimes up to 7 days)
- **Updates**: Usually 24 hours

### Common Rejection Reasons & Fixes

| Rejection Reason | Solution |
|-----------------|----------|
| **Guideline 4.2 - Minimum Functionality** | Ensure all features work, add more content |
| **Guideline 5.1.1 - Privacy** | Add privacy policy link, complete App Privacy questionnaire |
| **Guideline 2.1 - Crashes** | Test thoroughly on real devices |
| **Guideline 3.1.1 - In-App Purchases** | Use Apple's StoreKit for subscriptions |
| **Guideline 4.0 - Design** | Follow Human Interface Guidelines |

### If Rejected

1. Read the rejection reason carefully
2. Make necessary changes
3. Reply to the rejection in App Store Connect Resolution Center
4. Rebuild and resubmit:
   ```powershell
   eas build --platform ios --profile production --auto-submit
   ```

---

## Part 5: After Approval

### Release Options

In App Store Connect, choose:
- **Manual Release**: You control when app goes live
- **Automatic Release**: Goes live immediately after approval

### Post-Launch Checklist

- [ ] Verify app appears in App Store search
- [ ] Test download and login flow
- [ ] Monitor crash reports in App Store Connect
- [ ] Respond to user reviews
- [ ] Set up App Analytics

---

## Quick Reference Commands

```powershell
# Login to Expo
eas login

# Configure credentials
eas credentials

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# Build + Submit in one command
eas build --platform ios --profile production --auto-submit

# Check build status
eas build:list

# View logs for a build
eas build:view [BUILD_ID]
```

---

## Troubleshooting

### "Apple ID not found"
- Verify your Apple ID in `eas.json`
- Ensure you're enrolled in the Apple Developer Program

### "Invalid provisioning profile"
```powershell
eas credentials
# Select: iOS → production → Remove and regenerate
```

### "Build failed"
```powershell
eas build:view [BUILD_ID]
# Check the logs for specific errors
```

### "App rejected for privacy"
- Ensure Privacy Policy URL is accessible
- Complete all App Privacy questions in App Store Connect
- Add `NSPrivacyAccessedAPITypes` to `app.json` (already done)

---

## Support

- **Expo Documentation**: https://docs.expo.dev/submit/ios/
- **Apple Developer Forums**: https://developer.apple.com/forums/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

---

## Summary Checklist

- [ ] Apple Developer Account enrolled
- [ ] Expo account created and logged in
- [ ] EAS CLI installed
- [ ] App created in App Store Connect
- [ ] `eas.json` updated with real Apple credentials
- [ ] Screenshots prepared (6.7" and 6.5" iPhone)
- [ ] App description and keywords written
- [ ] Privacy policy URL live and accessible
- [ ] Demo account credentials ready for reviewers
- [ ] Build submitted via `eas build --auto-submit`
- [ ] App approved and released! 🎉
