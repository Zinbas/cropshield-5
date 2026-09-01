# CropShield 5 Project TODO

- [x] Bring the existing clean cropshield-5 application into the Manus full-stack project without flattening its organized directories.
- [x] Preserve the farmer and administrator workflows, authentication, database model, scan flow, AI analysis, storage, weather, expert, store, cases, and analytics capabilities.
- [x] Configure the Manus runtime to serve the React/Vite frontend and Express/tRPC backend as one application.
- [x] Preserve the International Typographic Style: white canvas, asymmetric precision grid, bold red square accents, black sans-serif typography, fine divider lines, and generous negative space.
- [x] Run type checks, tests, and the production build in the Manus project.
- [x] Verify the preview with an actual HTTP response and confirm the CropShield interface loads from the public Manus URL.
- [x] Document hosting status, environment-dependent limitations, and remaining live verification tasks.
- [x] Save the final Manus checkpoint before handoff.

- [x] Fix scan review mobile layout so image, readiness panel, crop linking, and action buttons do not overlap or overflow.
- [x] Improve scan action button styling and ensure replace, skip, analyze, case-save, and navigation actions have clear working states.
- [x] Add optional farm and soil context fields before analysis, including number of crops and land area, with an explicit skip path.
- [x] Send the submitted field context to analysis and use it in the generated assessment and recommendations.
- [x] Show treatment and prevention recommendations after analysis and track each recommended step as manually completed or pending.
- [x] Persist recommendation completion state per scan and expose it in scan history/cases.
- [x] Show nearby verified experts with location, phone, email, call, and message actions.
- [x] Add GPS-assisted location capture to farmer profile/signup with permission, loading, success, and failure states.
- [x] Add or update Vitest coverage for the new context, recommendation tracking, and GPS helper logic.
- [x] Re-run type checks, tests, build, HTTP preview, and responsive preview verification; update hosting documentation.

- [ ] Expose per-scan recommendation completion progress in the Cases view, not only Scan History.
- [ ] Run and record a fresh HTTP 200 check after the latest UX changes and capture both desktop and mobile final previews.
