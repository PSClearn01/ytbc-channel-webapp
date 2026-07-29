# Architecture Overview

This document outlines the software architecture and technology stack of the `ytbc-channel-webapp` application.

## Technology Stack

The web application is built on the following technologies:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **SvelteKit 2** + **Svelte 5** | High-performance reactive web framework using Compile-time Reactivity (Runes). |
| **Build Tool** | **Vite 8** | Modern, fast bundler for development and production builds. |
| **Language** | **TypeScript 6** | Strongly-typed JavaScript superset for type-safety and developer productivity. |
| **Database ORM** | **Drizzle ORM** | TypeScript-first ORM with full type safety, SQL-like queries, and automated migrations. |
| **Database Client**| **Postgres.js** | High-performance PostgreSQL driver for Node.js. |
| **Deployment** | **NodeJS Adapter** | `@sveltejs/adapter-node` to build a self-contained, standalone Node.js server. |
| **Linting & Style** | **ESLint 10** + **Prettier 3** | Strict code quality gates and formatting standards. |

---

## Directory Structure

Here is the structural map of the workspace:

```
ytbc-channel-webapp/
├── .env                  # Local environment configurations (ignored by git)
├── .env.example          # Template for environment configurations
├── drizzle.config.ts     # Configuration for Drizzle ORM / schema / migrations
├── eslint.config.js      # ESLint linting configuration
├── package.json          # Dependency list and script configurations
├── prettier.config.js    # Prettier formatting rules
├── tsconfig.json         # TypeScript compiler configurations
├── vite.config.ts        # Vite build tool and plugin setup
├── static/               # Static assets (robots.txt, etc.) served directly
└── src/                  # Application source code
    ├── app.html          # HTML shell template
    ├── app.d.ts          # Global TypeScript typings
    ├── routes/           # File-based routing directory
    │   ├── +layout.svelte # Root layout (renders common layout & elements)
    │   └── +page.svelte   # Root home page entry point
    └── lib/              # Shared client/server code
        ├── assets/       # Front-end asset imports (SVG, images)
        ├── server/       # Server-only modules (Database client, private utilities)
        │   └── db/
        │       ├── index.ts  # Database connection initialization
        │       └── schema.ts # SQL database schema definitions
        └── index.ts      # Shared utilities library entrypoint
```

---

## Application Execution Flow

1. **Client Request**: A client requests a route from the application server.
2. **Server-Side Render (SSR)**: SvelteKit processes the request, matches the path under `src/routes/`, resolves load functions, interacts with the database (via [src/lib/server/db/index.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/src/lib/server/db/index.ts)), and renders the initial HTML page.
3. **Hydration**: The HTML is delivered to the browser and Svelte initializes state in the client, enabling interactive client-side rendering (CSR) and navigation without full page reloads.
4. **Data updates**: Component state changes are managed efficiently using Svelte 5 **Runes** (`$state`, `$derived`, `$effect`, `$props`).

---

## Key Configurations

- **runes mode**: Forced globally for application files (configured in [vite.config.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/vite.config.ts)).
- **drizzle**: Monitored schema file at [src/lib/server/db/schema.ts](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/src/lib/server/db/schema.ts) targeting the `postgresql` dialect.
