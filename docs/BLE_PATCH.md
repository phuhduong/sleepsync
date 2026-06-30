# BLE patch

Optional ESP32 peripheral that receives a dose profile over Bluetooth Low Energy and runs it overnight without the phone connected. Dose is normalized `[0, 1]`. A zero write to TargetDose stops delivery.

## Behavior

The mobile app uploads a **ProfileSchedule** once at session start: ms until bedtime, window length, and up to 24 keyframes. Firmware waits until bedtime, then interpolates the curve every 200 ms. If schedule upload fails, the app streams **TargetDose** writes instead. Delivery samples upload to the API independently of BLE.

- Native: `react-native-ble-plx`
- Web: Web Bluetooth (Chrome)
- Simulator: no BLE support

Enable in the app with `EXPO_PUBLIC_BLE_ENABLED=1`. Firmware: `firmware/patch_ble.ino`.

BLE needs a dev build, not Expo Go. Generate native projects with `npm run native:prebuild` in `mobile/` (see [`RUNNING.md`](RUNNING.md)). Bluetooth permissions come from the `react-native-ble-plx` config plugin in `app.json`.

## GATT contract

| Field | Value |
|-------|--------|
| Advertised name prefix | `SleepSync` |
| Service UUID | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| TargetDose UUID | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| TargetDose payload | 4 bytes, float32 LE |
| ProfileSchedule UUID | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Session end | TargetDose write `0` |

Mobile encoding: `mobile/ble/bleConstants.ts`, `mobile/ble/bleSchedule.ts`.

## ProfileSchedule layout

| Offset | Type | Field |
|--------|------|-------|
| 0 | uint32 | ms until bedtime |
| 4 | uint32 | window duration (ms) |
| 8 | uint16 | keyframe count (1–24) |
| 10 + 8×i | float32 × 2 | keyframe `t`, dose |

PWM on pin 2 drives a prototype pump. Not calibrated for transdermal delivery.
