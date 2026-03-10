# Android Release Pipeline

## Prerequisites
- Android SDK + build-tools installed
- Java 17+
- Keystore file generated

## Keystore Config
Create `android/keystore.properties`:

```
storeFile=/absolute/path/to/your-release-key.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=YOUR_KEY_ALIAS
keyPassword=YOUR_KEY_PASSWORD
```

Update `android/app/build.gradle` signing config to read `keystore.properties` and wire `release` build type.

## Build Commands
From project root:

- `npm run build`
- `npm run cap:sync`
- `npm run android:release:apk`
- `npm run android:release:aab`

## Outputs
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Notes
- Use Play App Signing for production Play Store releases.
- Keep keystore backups offline and secure.
