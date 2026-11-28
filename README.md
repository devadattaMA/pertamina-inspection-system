# PHM Intelligence — Asset Integrity Workspace

A Next.js frontend and Neon-backed asset workspace.

## Stack
- Next.js App Router 15
- React 19 and TypeScript
- Neon PostgreSQL using @neondatabase/serverless
- Lucide React and custom CSS
- npm

## Setup
Use Node.js 22 and npm.

```bash
npm ci
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` (pooled Neon URL with `-pooler` hostname and `sslmode=require`) and a random `AUTH_SECRET` of at least 32 characters. For local database bootstrap, set `DIRECT_URL` to the direct, non-pooler Neon URL with SSL.

Generate the secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## Database bootstrap
Back up an existing Neon database before changing its schema.

```bash
npm run db:migrate
npm run db:seed-admin
```

The migration runner records filenames and SHA-256 checksums. The initial admin is created with a forced password change. The seed command will not promote an existing account or create a second bootstrap admin.

For the seed command, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in your local shell only. Use a unique password of at least 12 characters and no more than 72 UTF-8 bytes. Remove the temporary password from the environment after seeding.

## Authentication and roles
- Sign in at `/login`.
- The first sign-in with the temporary admin password redirects to `/change-password`.
- Admins manage users at `/admin/users`.
- Roles: `admin`, `inspector`, `viewer`.
- Admins have all configured permissions. Inspectors can use operational write capabilities. Viewers are read-only.
- Passwords are stored as bcrypt hashes.
- Session tokens are random; only their SHA-256 hashes are stored in Neon.
- Cookies are HTTP-only, SameSite=Lax, Secure in production, and expire after eight hours.
- Protected pages and the assets API validate the current session against Neon.

## Run and verify
```bash
npm run dev
npm run lint
npm run type-check
npm test
npm run build
npm run start
```

Parts of the original dashboard still use illustrative sample data; implementing login does not imply every dashboard view is already connected to persisted records.

## Vercel
Use the standard Next.js settings. Set `DATABASE_URL` and `AUTH_SECRET` in Production and Preview. Prefer a separate Neon branch for Preview. `DIRECT_URL` and the seed variables are for local database administration only. The CI workflow uses placeholder values and does not connect to a real database.
