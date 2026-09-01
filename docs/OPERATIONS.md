# Operations

Use the following checks for local verification:

```text
pnpm check
pnpm test
pnpm build
```

The application requires a MySQL/TiDB-compatible `DATABASE_URL`, session configuration, object-storage access, and the configured crop-analysis gateway. A first-time database setup must be performed with a schema-capable database account. Normal builds do not run migrations.

For production incidents, inspect structured JSON responses and server logs first. Confirm that the HTTP listener routes requests to the Express application, then verify the relevant tRPC procedure and database table. Never expose credentials in source control or diagnostic files.
