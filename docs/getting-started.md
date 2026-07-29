# Getting Started

This guide will help you set up, run, and develop the `ytbc-channel-webapp` application.

## Prerequisites

Before getting started, ensure you have the following installed on your machine:
- **Node.js**: Version 20.x or later (LTS recommended)
- **NPM**: Version 10.x or later (comes bundled with Node.js)
- **PostgreSQL**: A running instance of PostgreSQL (or access to a remote database URL)

---

## Installation

To clone and set up the repository:

1. **Clone the repository** (if not already done).
2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## Configuration

The project uses environment variables for database connections and environment settings.

1. **Create local environment file**:
   Copy the example file to create your `.env` file:
   ```bash
   cp .env.example .env
   ```
2. **Configure Database URL**:
   Open the [.env](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/.env) file and replace the placeholder value with your actual PostgreSQL connection string:
   ```env
   DATABASE_URL="postgres://username:password@localhost:5432/database_name"
   ```

---

## Scripts & Development

The following NPM scripts are configured in [package.json](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/package.json):

### Running locally
Start the Vite development server with hot-module reloading:
```bash
npm run dev
```
To open the application automatically in your browser, run:
```bash
npm run dev -- --open
```

### Type Checking
To check your TypeScript files and Svelte code:
```bash
npm run check
```
To run Svelte-check in watch mode:
```bash
npm run check:watch
```

### Code Formatting & Linting
We use ESLint and Prettier for code quality and formatting.
- **Lint code**: `npm run lint`
- **Format code**: `npm run format`

---

## Production Builds

To compile and optimize the application for production:

1. **Build the application**:
   ```bash
   npm run build
   ```
   This creates a production-ready Node.js build using `@sveltejs/adapter-node` under the `.svelte-kit/` directory.

2. **Preview the build**:
   To locally test the production build:
   ```bash
   npm run preview
   ```
