# Architecture

CropShield 5 uses a React and Vite frontend with an Express and tRPC backend. The backend owns authentication, authorization, database access, object-storage references, weather retrieval, and structured crop-analysis requests. The frontend communicates with the backend through typed tRPC procedures.

Data is persisted in a MySQL-compatible database through Drizzle ORM. Uploaded image bytes are kept in object storage, while the database stores metadata and references. Farmer records are owner-scoped, administrator procedures enforce role boundaries, and scan-derived summaries are computed from persisted records.

The production server bundle is intentionally isolated from development-only Vite and Tailwind dependencies. This keeps the serverless entrypoint small and avoids loading frontend build tooling during backend startup.
