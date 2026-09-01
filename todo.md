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

- [x] Fix administrator onboarding validation so the optional primary crop field does not reject an empty value.
- [ ] Verify protected administrator sign-up, sign-in, and owner-only access behavior.
- [ ] Verify database-backed expert approval, rejection, and suspension workflows with real user-provided records only.
- [ ] Verify database-backed store approval, rejection, and suspension workflows with real user-provided records only.
- [ ] Verify administrator farmer directory, scan review, case review, analytics, and location summaries against managed database queries.
- [x] Add or update Vitest coverage for administrator validation and approval workflow behavior.
- [ ] Run checks, tests, build, HTTP health, and responsive administrator preview; save a new Manus checkpoint.

- [x] Rework farmer and administrator navigation around a small set of mobile-first primary tasks instead of showing every capability at once.
- [ ] Keep detailed records, filters, and management actions behind focused subviews, drawers, or progressive disclosure rather than one overloaded page.
- [x] Make mobile touch targets, sticky bottom navigation, back navigation, and task-specific empty/loading/error states consistent across farmer and administrator flows.
- [x] Fix administrator signup so empty optional primary-crop input is accepted as omitted.
- [ ] Exercise administrator approval actions with real database records supplied by the user, without fabricated directory data.
- [ ] Add or update tests for focused navigation, optional admin signup fields, and approval workflow behavior.
- [ ] Capture and review the mobile-first administrator and farmer previews, then save a new Manus checkpoint.

- [ ] Apply the mobile-first focused-screen redesign across the entire app: onboarding, authentication, farmer dashboard, crops, scan, results, history, cases, experts, stores, profile, administrator review, directories, and analytics.
- [ ] Ensure no primary user journey requires consuming every feature on one page; use progressive disclosure and focused task screens throughout.

- [x] Trace why completed scan assessments are not appearing in Scan History and Cases, then fix the persistence and refresh path.
- [ ] Add regression coverage proving a completed scan is persisted and subsequently returned to farmer history and cases.
- [x] Reduce mobile information density across the app with clearer hierarchy, whitespace, progressive disclosure, and focused actions.
- [x] Shift the visual theme toward calm agriculture-inspired greens, soil neutrals, and warm natural accents while preserving strong readability.
- [x] Add restrained smooth transitions and respect reduced-motion preferences without distracting animation.
- [x] Re-run checks, tests, build, HTTP health, and mobile/desktop preview captures; save a new checkpoint.
- [ ] Audit and verify consistent back navigation and task-state presentation across the remaining farmer and administrator screens.
- [x] Capture a fresh desktop preview after the latest mobile-first and persistence changes before the next checkpoint.

- [x] Replace placeholder health-distribution analytics with real, correctly computed data and readable zero-state handling.
- [x] Organize desktop and mobile headers so navigation, profile, alerts, network state, and More actions have clear hierarchy.
- [x] Replace the regional risk placeholder with the existing Manus-proxied Google Maps component, including map/satellite views and exact pin placement.
- [x] Add GPS-to-address autofill for state, district, PIN, village, and town fields, with manual editing preserved when geolocation or reverse geocoding is unavailable.
- [x] Add a language selector and translation system for English, Hindi, Marathi, Assamese, and Bengali across primary farmer and administrator journeys.
- [x] Add tests for analytics zero states, GPS field mapping, map coordinate handling, and language persistence.
- [x] Validate all changes on mobile and desktop, run checks/tests/build/health, save a milestone checkpoint, and continue until the tracker is complete.
- [x] Correct backend critical-risk distribution counts to include both high and critical approved scans.
- [x] Make regional map markers react to asynchronous location-summary data changes.
- [x] Apply reverse-geocoded GPS autofill to signup as well as Profile.
- [ ] Expand translations beyond navigation into primary headings, forms, actions, and status/error text.
- [ ] Add explicit analytics, GPS mapping, and map-coordinate regression tests.
- [x] Re-run validation and save a fresh checkpoint after this analytics/map/GPS/i18n correction batch.

- [x] Allow any user to sign up and sign in as administrator for the current testing phase, while keeping the setting easy to restrict later.
- [x] Hide farmer-only land and crop profile details from administrator profile views and show role-appropriate admin information instead.
- [x] Provide a language selector on the unauthenticated login/signup screen and make the selected language available across all primary app screens, not only navigation.
- [x] Fix farmer signup GPS reverse-geocoding so requested address fields visibly populate after location capture.
- [x] Provide a farmer Profile map that shows the saved farm’s exact location and supports updating the pin.
- [x] Add regression coverage for open admin signup, role-safe profile fields, language control availability, and GPS/map behavior.
- [ ] Re-run checks, tests, build, health, and responsive previews, then save a milestone checkpoint.
- [x] Allow any valid local account to sign up and sign in as administrator for the current testing phase.
- [x] Hide farmer-only region, GPS, address, and exact-farm-map content from administrator Profile views.
- [x] Provide a language selector on the unauthenticated login/signup screen.
- [x] Apply signup GPS reverse-geocoded address autofill and retain the farmer Profile exact-location map.
- [x] Update administrator authentication regression coverage for open testing mode.
- [x] Run TypeScript, 50-test, production-build, HTTP 200, and mobile-preview validation for this correction batch.
