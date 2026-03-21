# BudgetBoss Mobile — Release Makefile
# Prerequisites: `npm install -g eas-cli` and `eas login`

.PHONY: help dev preview release submit release-and-submit credentials

help:
	@echo "BudgetBoss iOS Build & Release"
	@echo ""
	@echo "  make dev                  Build dev client (simulator)"
	@echo "  make preview              Internal TestFlight-ready build"
	@echo "  make release              Production build (auto-increments build number)"
	@echo "  make submit               Submit latest production build to App Store"
	@echo "  make release-and-submit   Build + submit in one step"
	@echo "  make credentials          Manage iOS signing credentials via EAS"

## Build a development client for simulator
dev:
	eas build --platform ios --profile development

## Build an internal distribution build (ad-hoc / TestFlight internal)
preview:
	eas build --platform ios --profile preview

## Build a production release (auto-increments buildNumber in eas.json)
release:
	eas build --platform ios --profile production

## Submit the most recent production build to App Store Connect / TestFlight
submit:
	eas submit --platform ios --latest

## Build production then immediately submit — one-command release flow
release-and-submit:
	eas build --platform ios --profile production --auto-submit

## Interactive credential management (certificate + provisioning profile)
credentials:
	eas credentials --platform ios
