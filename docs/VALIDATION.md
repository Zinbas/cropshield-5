# CropShield 5 Validation

The repository passes `pnpm check`, `pnpm test`, and `pnpm build`. The test suite contains 40 passing tests covering logout cookie clearing, authorization boundaries, administrator overview access, authenticated farmer snapshot access, local authentication, expert matching, persistence contracts, and the frontend scan helpers.

The production build completes the Vite frontend bundle, the Node server bundle, and the Vercel handler bundle. The local development preview was also checked at the HTTP level: `GET /` returned `HTTP/1.1 200 OK` and served the CropShield 5 HTML shell. This is the required health signal; a process-only “server running” log is not sufficient.

The scan flow enforces JPEG, PNG, and WebP input with a 12 MB maximum, resets file inputs for retakes, normalizes images through a canvas to a maximum dimension of 1600 pixels, converts them to compressed JPEG, revokes temporary object URLs, and reports asynchronous decoding/canvas failures through visible UI feedback. A photo-ready review card supports replacing the image, optionally linking a crop record, and starting analysis.

A complete live camera and AI run remains dependent on an authenticated farmer session, a representative crop image, configured managed storage, and the server-side analysis environment. Desktop and mobile visual verification of capture, retake, same-file selection, and persisted image storage should be completed in the managed project. Missing storage credentials may leave storage unavailable while the analysis path continues; this limitation must be reported rather than hidden.
