# Database & Drizzle ORM

This project uses **Drizzle ORM** with **PostgreSQL** to manage structural data.

## Configuration

Database configuration is managed in [drizzle.config.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/drizzle.config.ts). It imports schema files, sets the target SQL dialect (`postgresql`), and references the connection URL from environment variables (`DATABASE_URL`).

---

## Schema Definition

Schemas are declared in [src/lib/server/db/schema.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/src/lib/server/db/schema.ts).

### Current Schema: `task` Table
An initial `task` table is defined as:

```typescript
import { pgTable, serial, integer, text } from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});
```

---

## Database Connection

The connection client is configured in [src/lib/server/db/index.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/src/lib/server/db/index.ts):

- Initializes `postgres.js` with the private environment variable `DATABASE_URL`.
- Exposes a `db` object to interact with the database.

> [!WARNING]
> The database client is server-only. Ensure files interacting with it are either SvelteKit load files (`+page.server.ts`, `+layout.server.ts`), server endpoints (`+server.ts`), or modules contained entirely under the `src/lib/server/` directory to prevent database credentials from leaking to the frontend.

---

## Drizzle CLI Commands

Run these commands in your terminal to interact with the database:

### Push Schema directly to DB
For quick local development iterations, push changes directly to the database without generating SQL migration files:
```bash
npm run db:push
```

### Generate Migrations
Generate SQL migration scripts based on changes made in `schema.ts`:
```bash
npm run db:generate
```
This generates SQL files in the `drizzle/` directory.

### Apply Migrations
Apply generated migrations to your target environment database:
```bash
npm run db:migrate
```

### Open Drizzle Studio
Launch Drizzle's interactive database browser GUI:
```bash
npm run db:studio
```
By default, this will run on `https://local.drizzle.studio`.

---

## Adding New Schemas

1. Edit [src/lib/server/db/schema.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/src/lib/server/db/schema.ts) to define a new table or relation.
2. Export the table so it's included in Drizzle's analysis.
3. Run `npm run db:push` to sync local database instances, or `npm run db:generate` to generate a migration script for staging and production.
