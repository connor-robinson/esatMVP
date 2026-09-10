# Parked: Mathematics 1 Calibration v2

This folder is the full v2 assessment package (questions, validators, reference
diagrams). It is **not** the live calibration form.

## Live form

The app currently serves **v1**:

- Test id: `esat_math1_calibration_v1`
- Bundle: `src/lib/calibration/math1/config.json` (synced from
  `esat_math1_full_calibration_test_v1_diagramsfixed.json`)
- Sync: `npx tsx scripts/sync-calibration-config.ts`

## How to restore v2 later

1. `npx tsx scripts/sync-calibration-config-v2.ts`
2. Point `src/lib/calibration/constants.ts` back to `m1-calibration-v2` /
   assessment `2.0.0` / 20-minute limit
3. Restore v2 question point weights in `esatScoring.ts`
4. Ensure production diagrams under `public/calibration/math1-v2/` are current

A frozen synced copy also lives at
`src/lib/calibration/math1/esat_math1_calibration_v2.json`.
