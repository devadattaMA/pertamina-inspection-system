# Phase 1 authentication migration

Run `npm run db:migrate` against the direct Neon connection (`DIRECT_URL`).
The migration runner records SHA-256 checksums in `schema_migrations` and
rejects modifications to already-applied migration files. Back up an existing
database before running migrations.
