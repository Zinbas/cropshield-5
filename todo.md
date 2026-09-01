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

- [x] Expose per-scan recommendation completion progress in the Cases view, not only Scan History.
- [x] Run and record a fresh HTTP 200 check after the latest UX changes and capture both desktop and mobile final previews.

- [x] Deliver a polished, approachable farmer crop-advisory experience while preserving the existing React/Vite, Express/tRPC, frontend/, backend/, common/, and database/ structure.
- [x] Verify farmer onboarding and profile management with optional GPS capture and non-blocking manual state, district, PIN, village, and town fallback.
- [x] Verify crop records and camera/gallery scans accept JPEG, PNG, and WebP up to 12 MB, normalize images before analysis, and support optional soil and field context.
- [x] Verify advisory assessment presentation includes risk, confidence, symptoms, summary, treatment, prevention, and monitoring recommendations with clear non-diagnostic language.
- [x] Verify recommendation checklist progress persists and appears in searchable scan history plus All/Open/Resolved case views.
- [x] Verify verified agricultural experts are matched by saved district/state and expose only available call, SMS, and email actions.
- [x] Verify protected farmer and administrator experiences for scan review and farmer, expert, and store-directory management.
- [x] Verify reviewed Drizzle schema/migrations cover profiles, crop records, scan context, cases, and recommendation progress without committing secrets or fake data.
- [x] Verify crop-image uploads use Manus/S3-backed storage and database records retain metadata or URLs only.
- [x] Run TypeScript checks, Vitest tests, production build, HTTP health check, and rendered desktop/mobile Manus preview; save the final reviewable checkpoint.
- [x] Fix Manus preview entrypoints so the managed service serves the imported frontend/ and backend/ CropShield application instead of the scaffold client/ example page.
- [x] Re-capture desktop and mobile previews after correcting the service entrypoints and confirm the CropShield onboarding screen renders.
- [x] Add visible recommendation completion counts to each farmer and administrator case row, using persisted scan recommendation progress.
