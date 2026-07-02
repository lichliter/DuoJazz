---
name: duojazz-build
description: Build, test, run, and deploy DuoJazz via xcodebuild and simctl
user-invocable: true
---

# DuoJazz Build & Deploy

Use when building, testing, launching on simulator, or deploying to a physical iPad.

Default simulator: **iPad Air 11-inch (M3)**

## Build

```bash
xcodebuild -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)' build
```

## Test

```bash
xcodebuild test -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)'
```

## Simulator

```bash
# Install and launch (after build)
xcrun simctl install booted <path-to-DuoJazz.app>
xcrun simctl launch booted com.brianlichliter.DuoJazz

# Screenshot for visual debugging
xcrun simctl io booted screenshot /tmp/debug.png
```

## Device Deploy

```bash
xcodebuild -project DuoJazz/DuoJazz.xcodeproj -scheme DuoJazz \
  -destination generic/platform=iOS -allowProvisioningUpdates build

xcrun devicectl device install app --device <DEVICE_ID> <path-to-DuoJazz.app>
# Find device ID: xcrun devicectl list devices
```
