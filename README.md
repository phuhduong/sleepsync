# SleepSync

Proof-of-concept for scheduling an overnight melatonin patch profile. Expo app, FastAPI backend, optional ESP32 over BLE.

You set bed and wake times. The backend returns a dose curve for that window. The app runs it overnight on a BLE patch or in an on-screen simulator if you do not have hardware. A short morning debrief (did you wake, how groggy) closes the loop and shapes the next plan.

**Inputs.** Mock sleep data by default. Connect Google Health to pull real staging and vitals.

**Outputs.** A piecewise profile (delay, ramp, sustain, taper). Dose is normalized `[0, 1]`, not mg. Wake risk comes from a hand-tuned heuristic (`heuristic-v0`), not a trained clinical model.

## Development

[`docs/RUNNING.md`](docs/RUNNING.md)

## Further reading

- [`docs/GOOGLE_HEALTH.md`](docs/GOOGLE_HEALTH.md) optional wearable sleep input
- [`docs/BLE_PATCH.md`](docs/BLE_PATCH.md) ESP32 BLE protocol
- [`backend/README.md`](backend/README.md) API and plan pipeline

## Layout

```
mobile/     Expo app
backend/    FastAPI, optimizer, SQLAlchemy
firmware/   ESP32 NimBLE sketch
docs/
shared/     test fixtures
```

## Team

Charles Muehlberger ([@charlespers](https://github.com/charlespers)), Phu Duong ([@phuhduong](https://github.com/phuhduong)), Jaime Nunez ([@Jaimenunez10](https://github.com/Jaimenunez10)), Tom Wang ([@tom05919](https://github.com/tom05919))
