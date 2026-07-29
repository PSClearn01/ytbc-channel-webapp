# Ring Compass 🥊

Ring Compass is a premium, real-time aggregated boxing world rankings comparison dashboard. It scrapes the websites of the 4 major professional boxing sanctioning bodies (**WBA**, **WBC**, **IBF**, **WBO**) across all 18 weight divisions, compiles them into a unified PostgreSQL database, and presents a responsive comparative matrix.

---

## 🚀 Getting Started with Docker (Recommended)

To run the full stack (SvelteKit Web App + PostgreSQL database + Headless Puppeteer) locally, you only need to run:

```bash
docker-compose up --build
```

### What this does:
1. **Initializes the Database (`ytbc-db`)**: Runs a `postgres:16-alpine` database service.
2. **Performs Schema Migrations**: Runs `npx drizzle-kit push` automatically on startup inside the web container to create/update tables.
3. **Runs the Web Application (`ytbc-web`)**: Compiles and starts the SvelteKit app inside a Chromium-equipped environment, listening on port `3000`.

Once the containers start up, open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Local Development (Without Docker Compose)

If you have a PostgreSQL instance running locally on your machine and want to run outside Docker:

1. **Install Dependencies**:
   ```bash
   npm install
   npx puppeteer browsers install chrome
   ```
2. **Configure Database**:
   Edit the `.env` file to point to your database URL:
   ```env
   DATABASE_URL="postgres://user:password@localhost:5432/db-name"
   ```
3. **Push Schema**:
   ```bash
   npx drizzle-kit push
   ```
4. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 🧬 Scraper Architecture & Fallbacks

Each sanctioning body has unique data structures and anti-scraping protections. Here is how Ring Compass extracts them:

### 1. WBA (World Boxing Association)
*   **Source**: [https://www.wbaboxing.com/wba-ranking](https://www.wbaboxing.com/wba-ranking)
*   **Method**: Directly fetches the rankings page using custom headers. Parses HTML accordions (matching 17 divisions `div[id^="division"]`) using `cheerio`. Splices Table 1 for Champions (rank 0) and Table 2 for ranked contenders 1–15.

### 2. WBC (World Boxing Council)
*   **Source**: `https://wbcboxing.com/campeones-y-ratings/varonil/[division-slug]/`
*   **Method**: Loops through 18 Spanish weight division slugs (e.g. `completo`, `crucero`, `bridger`). Parses the main contender tables using `cheerio`. Extracts the Champion's name from the official champion banner image filenames (which embed names like `Ryan-Garcia` or `Noel-Mikaelian`).

### 3. IBF (International Boxing Federation)
*   **Source**: [https://www.ibf-usba-boxing.com/ratings/](https://www.ibf-usba-boxing.com/ratings/)
*   **Method**: The site is protected by a Cloudflare Turnstile/JS challenge. We spin up a headless **Puppeteer** browser, apply webdriver evasions (stealth mode), and intercept the `/wp-json/ratings/v1/filter?*ppp=-1` response. The server naturally sends all 17 weight classes in a single JSON payload on load which we save directly.

### 4. WBO (World Boxing Organization)
*   **Source**: [https://www.wboboxing.com](https://www.wboboxing.com)
*   **Method**: Locates the latest dynamic rankings PDF link on the WBO homepage. Downloads the binary file buffer and parses it using `pdf-parse`. Applies a tokenizing regular expression parser to isolate division names, champions, and contenders `[rank]. [Name] ([Country])`.

---

## 🎨 Features & Interface
*   **Comparative Matrix**: View the champions and top 15 contenders for WBA, WBC, IBF, and WBO side-by-side.
*   **Cross-Rankings Highlights**: Fighters ranked across multiple organizations are marked with custom badges (e.g., `WBC #1`, `IBF #4`) showing their positions under other bodies.
*   **Fighter Search Profile**: Search for any boxer's name to view their multi-belt rating profile immediately.
*   **Scraper Console**: Trigger and monitor the scraper directly from the dashboard UI with live logs.
*   **Dark Modern Aesthetics**: Rich dark mode built using custom HSL colors, gold/red accents, glassmorphic cards, and micro-animations.
