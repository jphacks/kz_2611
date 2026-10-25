# F6 PDF preview verification

- Source: PDF pages 17 (L), 18 (M), 19 (R); related source images 03 / 04 / 05 / 07 / 09 / 12 / 14 were inspected for combinations.
- Route: `?preview=f6`; optional `p=L`, `p=M`, `p=R`. Web only; no API calls.
- Published branch: `ui-f6`, https://ui-f6.kz2611.pages.dev/?preview=f6
- `npm install`, `npm run typecheck`, `npm run build`: passed.
- Browser viewport 390 × 844; all 9 logos, 6 details, 3 combinations captured. `checks.json` enumerates all 18 entries.
- All three combinations changed to joined state through browser pointer swipe event sequences. `gestures.json` records the exact resulting labels. Direct CDP touch injection timed out in the browser harness; this is not a physical-device gesture verification.
- L: geometric finger / separate dot / fingerprint paths / yubi typography / single-line pointing hand / orange icon / two Japanese wordmarks / black fingerprint icon / blue exclamation icon.
- M: pull-to-refresh (PanResponder and tap fallback), sequential loading fingers (tap to start/stop), empty-to-first-recruitment mock state, notification text toggle, five working tabs (no oversized center), outlined horizontal fingertip success illustration.
- R-A: blue perch card, host at the left of the white perch, participant circles and dotted seats, pink joining participant, landing motion, optional long-press fingerprint stamp.
- R-B: black card with opposing orange/white outline fingers, join status and contact spark.
- R-C: orange card, vertical finger-joint capacity gauge, host fingertip, filled third joint and participant, bottom-left palm, black remaining-time pill.
- Comparison correction: initial screenshot revealed a clipped dot; finger and single-line-hand viewBoxes were expanded, then rebuilt and republished.
- Deliberate differences: landscape PDF grids become numbered vertical cards at mobile width. SVG outlines are manually traced approximations, not original vector artwork. Extra preview navigation, interaction hints and reset controls are included. Notification and recruitment are local mock states; no real notifications or recruitment is created. Device vibration is not implemented in this web preview.
- Screenshots: `/Users/watabeyuichi/.hermes/cache/scratch/kz-yubi/shots/f6/` (`L-01`…`L-09`, `M-1`…`M-6` before/after, `R-A`…`R-C` before/after/final).
- Dependency audit from npm install: 8 existing vulnerabilities (2 moderate, 6 high); no out-of-scope dependency upgrades applied.
