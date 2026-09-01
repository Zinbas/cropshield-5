# CropShield 5 Handoff

## Purpose

CropShield is a farmer-support application for crop health monitoring, server-side image analysis, local agricultural services, weather-aware guidance, and administrator review workflows. This repository is the CropShield 5 continuation of the existing application architecture; it is not a blank rebuild.

## Architecture

| Layer | Implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Radix UI primitives, Wouter |
| Backend | Express 4, tRPC 11, Zod, and SuperJSON |
| Persistence | Drizzle ORM with MySQL/TiDB-compatible schema |
| Authentication | Manus OAuth/session plumbing plus local farmer and administrator test-account flow |
| AI | Server-side multimodal analysis gateway with structured output |
| Storage | S3-compatible server-side storage helper |
| Weather | Open-Meteo current-weather request with unavailable and error states |
| Validation | TypeScript checks, Vitest, and production build |
| Hosting | Manus WebDev full-stack managed runtime and database |

The production-safe Express app must not import Vite or Tailwind build tooling. Development uses Vite middleware, while production serves the built frontend and registers tRPC routes. Keep database migrations out of the normal deployment build.

## Product requirements

Farmers can maintain profile and location details, register crops, capture or upload images, review normalized photos, run server-side analysis, inspect scan history, create follow-up cases, find verified experts, find approved agricultural stores, and view local weather guidance. Farmer data must remain owner-scoped.

Administrators can review approved scan and case activity, manage farmers, moderate expert and drug-store records, and inspect aggregate risk summaries. The application must never fabricate ratings, testimonials, reviews, or other user-generated content.

The scan flow accepts JPEG, PNG, and WebP. It rejects unsupported formats and files above **12 MB**, resets file inputs before each selection, uses temporary object URLs only during preprocessing, resizes images to a maximum dimension of **1600 px**, converts them to compressed JPEG, presents a photo-ready review card, supports replace-photo and crop-linking actions, and catches asynchronous image decoding/canvas failures without uncaught browser exceptions.

## Database entities

The schema in `database/schema.ts` contains identity/users, profiles, crops, scans, cases, experts, drug stores, and weather cache entities. Schema changes must update the TypeScript schema, generate SQL with the Drizzle tooling, review the SQL, and apply it through the managed database workflow using schema-capable credentials. Never paste database secrets into chat or commit them.

## Repository layout

`frontend/` contains the React application; `backend/` contains Express/tRPC procedures, authentication, storage, AI, weather, and deployment entrypoints; `common/` contains shared types and constants; `database/` contains schema, relations, and migrations; `docs/` contains validation, operations, task tracking, and handoff material.

Generated build output, dependency directories, local logs, temporary PDFs, editor backups, and secret files must remain untracked.

## Validation and continuation

Run `pnpm check`, `pnpm test`, and `pnpm build` before handoff or publishing. Preview health must be verified by sending an actual HTTP request to the managed preview URL, not merely by checking whether a process is listening. Complete live camera verification requires an authenticated farmer session and a representative crop image; test post-capture review at desktop and mobile widths, including retakes and selecting the same file. Storage-dependent persistence may remain unavailable when its managed environment variables are absent, but the limitation must be reported honestly.

## References

[1]: https://github.com/Zinbas/cropshield-5 "CropShield 5 source repository"
[2]: https://www.manus.im/ "Manus platform"
[3]: https://react.dev/ "React documentation"
[4]: https://trpc.io/docs "tRPC documentation"
[5]: https://orm.drizzle.team/docs/overview "Drizzle ORM documentation"
[6]: https://open-meteo.com/en/docs "Open-Meteo documentation"
[7]: https://vitest.dev/guide/ "Vitest documentation"
