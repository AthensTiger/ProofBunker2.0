# Proof Bunker — Lessons Learned & Gotchas

> **Purpose:** This document captures the hard-won knowledge from building Proof Bunker v1 through iterative development in Claude.ai. It's intended to be used alongside the build spec when reconstructing the application in Claude Code. These aren't just "what we built" — they're "what broke, why, and how we fixed it."
>
> **For Claude Code:** Place this file in your repo root or reference it in CLAUDE.md so every session has access to these lessons.

---

## 1. Auth0 Authentication

This was the single biggest source of issues during development. Budget extra attention here.

### Redirect Loop Problem
- **What happened:** After Auth0 login, the app would enter an infinite redirect loop — Auth0 redirected to the app, the app saw no valid session and redirected back to Auth0, endlessly.
- **Root cause:** The callback URL configuration in Auth0 dashboard didn't match the actual URLs the app was using. Even a trailing slash mismatch (`/callback` vs `/callback/`) can cause this.
- **Fix:** Ensure Auth0 dashboard settings (Allowed Callback URLs, Allowed Logout URLs, Allowed Web Origins) exactly match your app's URLs for both development (`http://localhost:3000`) and production. Be meticulous — no trailing slashes unless your app uses them.

### JWT Configuration Issues
- **What happened:** API calls were failing with 401 errors even though the user appeared to be logged in on the frontend.
- **Root cause:** Mismatch between the JWT audience and issuer settings on the backend vs. what Auth0 was actually issuing.
- **Fix:** The `audience` in your Auth0 React SDK config must match the API identifier you created in Auth0 dashboard. The `issuerBaseURL` must be your exact Auth0 domain (e.g., `https://your-tenant.auth0.com`). Double-check these are consistent between frontend config and backend middleware.

### Token Handling
- **Lesson:** Use Auth0's React SDK (`@auth0/auth0-react`) on the frontend and `express-oauth2-jwt-bearer` on the backend. Don't try to manually decode JWTs yourself unless you have a specific reason.
- **Lesson:** The `getAccessTokenSilently()` function from the Auth0 React SDK needs to be called with the correct audience parameter, and it can fail silently if the audience doesn't match.

### User Identification
- **Lesson:** Auth0's `sub` claim (subject) is the unique user identifier. Use this to associate bottles/collections with users in the database. Don't rely on email as a primary key — users can change emails.

---

## 2. CORS (Cross-Origin Resource Sharing)

### The Problem
- **What happened:** Frontend (React on port 3000) couldn't communicate with backend (Express on port 3001) during development. Browser blocked requests with CORS errors.
- **Why it's confusing:** CORS errors show up in the browser console but the backend doesn't log anything because the browser blocks the request before it reaches the server.

### The Fix
- Use the `cors` npm package on your Express server.
- Explicitly configure allowed origins — don't just use `cors()` with no options in production.
- Make sure your CORS config allows the `Authorization` header (required for JWT bearer tokens).

```javascript
// Development CORS config example
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### Gotcha
- If you see CORS errors that only happen on some routes, check that error responses from your API also include CORS headers. A 500 error without CORS headers will show up as a CORS error in the browser, masking the real problem.

---

## 3. Database (PostgreSQL)

### Migrations Strategy
- **Lesson:** Use a migration system from day one. Don't manually edit the database schema. We used sequential migration files that could be run in order.
- **Lesson:** When adding the multi-photo system, we needed a migration to create a new `bottle_photos` table and move existing single-photo references. This kind of data migration (not just schema migration) needs careful planning.

### Multi-Photo System Migration
- **What happened:** The original schema had a single photo field on the bottles table. Moving to multiple photos required:
  1. Creating a new `bottle_photos` junction/child table
  2. Migrating existing photo references from the bottles table to the new table
  3. Updating all API endpoints to work with the new structure
  4. Updating the frontend to handle multiple photos
- **Lesson:** Do this in a single migration transaction so if anything fails, it all rolls back.

### Schema Design Notes
- Bottles have a lot of metadata: name, distillery/brand, spirit type/category, size, proof/ABV, age statement, batch number, barrel number, purchase price, purchase date, purchase location, condition, personal rating, tasting notes, and more.
- Categories are important for filtering — bourbon, rye, scotch, etc. Consider whether to use an enum, a lookup table, or free text. We used defined categories for filtering consistency.
- The `bottle_photos` table should track: photo URL/path, upload order/sort position, which photo is the "primary" display photo, and upload timestamp.

---

## 4. Express Backend Architecture

### Route Organization
- **Lesson:** Separate routes into logical files (bottles, auth, photos, etc.) rather than putting everything in a single file.
- **Lesson:** Apply the auth middleware at the router level for protected routes, not on each individual endpoint. Less repetitive, fewer chances to forget.

### Error Handling
- **Lesson:** Create a consistent error response format early. Every error should return a JSON object with at least `{ error: "message" }` — not raw strings, not HTML error pages.
- **Gotcha:** Express default error handler returns HTML. If your React frontend gets an HTML response when expecting JSON, `response.json()` will throw a confusing parsing error.

### File Upload Handling
- **Lesson:** Use `multer` for file uploads. Configure file size limits and accepted MIME types.
- **Lesson:** Decide early where photos are stored — local filesystem, S3, or similar. The multi-photo system needs a clear storage strategy.
- **Gotcha:** If storing locally during development, make sure the upload directory exists before the first upload. Multer won't create it for you (or configure it to do so).

---

## 5. React Frontend

### Auth0 Integration with React
- **Lesson:** Wrap your app in `Auth0Provider` at the top level. Use the `useAuth0` hook for login state.
- **Lesson:** Create a protected route component that checks `isAuthenticated` before rendering. Redirect to login if not authenticated.
- **Gotcha:** There's a loading state between "app loaded" and "auth check completed" where `isAuthenticated` is false but `isLoading` is true. If you don't handle this, the app will flash the login screen before realizing the user is already logged in.

```javascript
// Handle the auth loading state
const { isAuthenticated, isLoading } = useAuth0();
if (isLoading) return <LoadingSpinner />;
if (!isAuthenticated) return <LoginPrompt />;
return <App />;
```

### API Communication
- **Lesson:** Create a centralized API helper/service that automatically attaches the Auth0 bearer token to every request. Don't manually add the Authorization header in every component.
- **Lesson:** Handle 401 responses globally — if the token is expired, trigger a re-authentication flow rather than showing a cryptic error.

### Collection Value Summary
- **Feature note:** Users want to see total collection value, bottle count, and average bottle price at a glance. This was a popular "quick win" feature.
- **Implementation:** Calculate on the backend and return as a summary endpoint, don't do it client-side by iterating through all bottles.

### Category Filtering
- **Feature note:** Filtering the collection by spirit category (bourbon, rye, scotch, etc.) was essential for a 312+ bottle collection.
- **Implementation:** Server-side filtering via query parameters, not client-side filtering. The collection is large enough that loading everything and filtering in the browser is wasteful.

### Multi-Photo UI
- **Lesson:** The photo system needed: upload capability for multiple images, a primary photo selector, photo deletion, zoom/fullscreen view, and a gallery-style display.
- **Gotcha:** File input elements in React need careful handling. The `onChange` event doesn't fire if the user selects the same file again. Reset the input value after upload.
- **Lesson:** Implement image zoom with a modal/overlay. Users want to inspect label details closely.

---

## 6. TypeScript Considerations

- **Lesson:** Define interfaces for your data models early. A `Bottle` interface, a `Photo` interface, API response types, etc. This catches mismatches between frontend and backend fast.
- **Gotcha:** TypeScript won't catch runtime issues with data from the API. If the backend returns `purchase_price` as a string and your interface says `number`, TypeScript won't complain — it only checks at compile time. Validate or transform API responses.

---

## 7. Development Environment

### Port Configuration
- **Convention we used:** React dev server on port 3000, Express API on port 3001 (or whichever ports were chosen). Make these configurable via environment variables.
- **Lesson:** Use a `.env` file for both frontend and backend. Never commit `.env` files. Keep a `.env.example` with placeholder values.

### Environment Variables Needed
- Auth0 domain
- Auth0 client ID (frontend)
- Auth0 API audience
- Auth0 client secret (backend only, never expose to frontend)
- Database connection string
- API port
- Frontend URL (for CORS)
- Photo storage path/config

---

## 8. General Development Lessons

### For Working with AI (Claude Code Specific)
- **Break work into focused sessions.** Don't try to build everything in one conversation. Do auth in one session, CRUD in another, photos in another.
- **Clear context between tasks.** Use `/clear` in Claude Code when switching to a new feature area.
- **Test each feature before moving on.** Don't let Claude Code build three features without verifying the first one works. Bugs compound.
- **Be specific about what you want.** "Add filtering" is vague. "Add a query parameter `category` to GET /api/bottles that filters by spirit_type column, and add a dropdown in the React collection view that calls this endpoint" is actionable.
- **When something breaks, provide the actual error.** Copy-paste terminal output, browser console errors, or API responses. Don't paraphrase — the exact error message matters.

### Architecture Decisions Worth Preserving
- JWT-based auth (not sessions) — stateless, scales well
- RESTful API design — standard CRUD endpoints
- Server-side filtering and aggregation — don't push computation to the client
- Migration-based schema management — reproducible database state
- Centralized API service on the frontend — single point for auth token injection

---

## 9. Recommended Project Structure (Monorepo)

Proof Bunker v1 used two separate git repos for frontend and backend. For the rebuild, use a monorepo. This gives Claude Code visibility into both sides at once and simplifies development, deployment, and shared types.

### Top-Level Structure

```
proof-bunker/
├── CLAUDE.md                    # Claude Code project context
├── proof-bunker-lessons-learned.md  # This file
├── package.json                 # Root workspace config
├── tsconfig.base.json           # Shared TypeScript config
├── .env                         # Shared environment variables
├── .env.example                 # Template (committed to git)
├── .gitignore
├── README.md
│
├── packages/
│   ├── api/                     # Express backend
│   │   ├── package.json
│   │   ├── tsconfig.json        # Extends base config
│   │   └── src/
│   │       ├── index.ts         # Server entry point
│   │       ├── config/          # Auth0, DB, CORS config
│   │       ├── middleware/      # Auth, error handling, file upload
│   │       ├── routes/          # Route definitions (bottles, photos, etc.)
│   │       ├── controllers/     # Business logic per route
│   │       ├── models/          # Database query functions
│   │       └── utils/           # Helpers, validators
│   │
│   ├── web/                     # React frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.tsx        # App entry point with Auth0Provider
│   │       ├── App.tsx          # Routing and layout
│   │       ├── components/      # Reusable UI components
│   │       ├── pages/           # Page-level components (Collection, BottleDetail, etc.)
│   │       ├── services/        # API service (centralized, handles auth tokens)
│   │       ├── hooks/           # Custom React hooks
│   │       ├── types/           # Frontend-specific types
│   │       └── utils/           # Helpers, formatters
│   │
│   └── shared/                  # Shared code between frontend and backend
│       ├── package.json
│       └── src/
│           └── types/           # Shared TypeScript interfaces
│               ├── bottle.ts    # Bottle, BottlePhoto, BottleCategory types
│               ├── api.ts       # API request/response shapes
│               └── index.ts     # Re-exports
│
├── migrations/                  # Database migrations (kept at root level)
│   ├── 001_initial_schema.sql
│   ├── 002_add_bottle_photos.sql
│   └── ...
│
└── uploads/                     # Local photo storage (gitignored)
```

### Why This Structure Matters

- **`packages/shared/`** is the big win. Define your `Bottle` interface once and both frontend and backend use it. When you add a field to the database, TypeScript will flag every place in the frontend that needs updating.
- **`migrations/` at root** keeps database changes visible and independent of the API code. Easy to run from anywhere.
- **Single `.env` at root** means one place to configure Auth0, database, ports, etc. Both packages read from it.

### Root package.json (Workspace Config)

```json
{
  "name": "proof-bunker",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "npm run dev --workspace=packages/api",
    "dev:web": "npm run dev --workspace=packages/web",
    "build": "npm run build --workspaces",
    "migrate": "npm run migrate --workspace=packages/api"
  }
}
```

This lets you run `npm run dev` from the root and both servers start together — Express on one port, React dev server on another.

### Notes for Claude Code
- When asking Claude Code to add a new feature, it can see the shared types, the API route, and the React component all in one session.
- If you add a new field to a bottle (say `mashbill`), tell Claude Code to "add mashbill to the bottle — update the shared type, the migration, the API endpoint, and the React form." It can do all of that in one pass because everything is in one repo.

---

## 10. Environment Configuration & Deployment Strategy

### The Two-Environment Approach

Proof Bunker v1 started local and later moved to a web-deployed environment. For the rebuild, set up both from the beginning. Develop locally for speed, deploy early for real-world testing.

### Environment Files

Use separate `.env` files for each context. Your code should never contain hardcoded URLs, ports, or credentials — everything comes from environment variables.

```
proof-bunker/
├── .env.development          # Local development settings
├── .env.production           # Deployed/production settings
├── .env.example              # Template with placeholder values (committed to git)
├── .gitignore                # Must include .env.development and .env.production
```

#### .env.example (committed to git — safe, no real values)
```
# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.your-app.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/proofbunker

# Server
API_PORT=3001
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001

# Photo Storage
UPLOAD_DIR=./uploads
```

#### .env.development (local — never committed)
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=abc123-dev-client-id
AUTH0_CLIENT_SECRET=dev-secret
AUTH0_AUDIENCE=https://api.proofbunker.com

DATABASE_URL=postgresql://localhost:5432/proofbunker_dev

API_PORT=3001
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001

UPLOAD_DIR=./uploads
```

#### .env.production (deployed — never committed)
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xyz789-prod-client-id
AUTH0_CLIENT_SECRET=prod-secret
AUTH0_AUDIENCE=https://api.proofbunker.com

DATABASE_URL=postgresql://your-cloud-host:5432/proofbunker_prod

API_PORT=3001
FRONTEND_URL=https://proofbunker.com
API_URL=https://api.proofbunker.com

UPLOAD_DIR=/var/data/uploads
```

### Auth0 Configuration for Dual Environments

This was a pain point in v1. Set it up right from the start:

In your Auth0 dashboard Application settings, add BOTH sets of URLs (comma-separated):

- **Allowed Callback URLs:**
  `http://localhost:3000/callback, https://proofbunker.com/callback`
- **Allowed Logout URLs:**
  `http://localhost:3000, https://proofbunker.com`
- **Allowed Web Origins:**
  `http://localhost:3000, https://proofbunker.com`

This way Auth0 accepts requests from both environments without any code changes.

### CORS for Dual Environments

Read the allowed origin from your environment variable so it works in both contexts automatically:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Reads the right value per environment
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### Database: Local vs Cloud

- **Local development:** Run PostgreSQL on your machine. Use a separate database name (e.g., `proofbunker_dev`) so you never accidentally touch production data.
- **Production:** Use a managed PostgreSQL service (Render, Railway, Supabase, AWS RDS, etc.).
- **Migrations run the same way in both** — the only difference is which `DATABASE_URL` they connect to.
- **Gotcha from v1:** Never test migrations directly against production. Run them locally first, verify, then run against production.

### Recommended Development Workflow

1. **Develop locally with Claude Code** — fast iteration, instant feedback
2. **Test the basics locally** — make sure routes work, UI renders, auth flows complete
3. **Push to git** — commit your changes
4. **Automatic deployment picks it up** — CI/CD deploys to your hosting platform
5. **Cross-device testing on deployed version** — phone, tablet, different browsers
6. **If something's broken in production but not local** — it's almost always an environment variable mismatch, a CORS issue, or an Auth0 URL issue. Check those first.

### Set Up Deployment Early

Don't wait until the app is "done" to deploy. In v1, transitioning from local to deployed surfaced a bunch of issues all at once (Auth0 redirects, CORS, environment config). Instead:

1. Get a minimal "hello world" Express + React app deployed in the first day or two
2. Verify Auth0 works in the deployed environment with a simple login/logout
3. Then build features with confidence that deployment isn't hiding surprises
4. Deploy frequently — small deployments are easier to debug than big ones

### Hosting Considerations

Whatever platform you choose (Render, Railway, Vercel + separate API host, etc.), make sure it supports:
- Environment variable configuration
- PostgreSQL (managed or external connection)
- File/photo storage (or use S3/Cloudflare R2 for photos)
- Custom domains (if you want proofbunker.com)
- Automatic deploys from git push (saves a lot of manual work)

---

## 12. Known Limitations / Future Considerations

> **Note to Mike:** Fill in additional items from your 100+ page spec and from memory. These are the ones I recall being discussed or implied.

- [ ] Search functionality (searching within the collection by name, distillery, etc.)
- [ ] Sorting options (by value, by date added, by name, etc.)
- [ ] Barcode/label scanning for easier bottle entry
- [ ] Export functionality (CSV, PDF of collection)
- [ ] Mobile responsiveness refinements
- [ ] Backup/restore strategy for photos and database
- [ ] Rate limiting on API endpoints for production
- [ ] Input validation/sanitization on all user inputs

---

## 13. CLAUDE.md Template for Claude Code

When you set up the Claude Code project, create a `CLAUDE.md` in your repo root with something like this:

```markdown
# Proof Bunker

## What This Is
A spirits collection management web application for tracking bottles, 
their metadata, photos, and collection analytics.

## Tech Stack
- Backend: Node.js, Express, TypeScript
- Frontend: React, TypeScript  
- Database: PostgreSQL with migration-based schema management
- Auth: Auth0 (JWT bearer tokens)
- File Storage: [your choice for photos]

## Project Structure
Monorepo using npm workspaces:
- packages/api/ — Express backend
- packages/web/ — React frontend
- packages/shared/ — Shared TypeScript types
- migrations/ — PostgreSQL migrations

## Key Patterns
- All API routes are JWT-protected via Auth0 middleware
- CORS configured for frontend origin
- Centralized API service on frontend handles token injection
- Server-side filtering and aggregation for collection queries
- Multi-photo system with primary photo designation

## Important Files
- /migrations/ — Database migrations, run in order
- .env.development — Local environment config
- .env.production — Deployed environment config
- .env.example — Template with placeholder values (see .env.example)
- proof-bunker-lessons-learned.md — Detailed lessons from v1

## Environment Strategy
- Local development on localhost (React :3000, API :3001)
- Production deployed to [your hosting platform]
- Environment variables control all URLs, credentials, and config
- Auth0 dashboard has both local and production URLs registered
- Never hardcode URLs — always use process.env

## Gotchas
- See proof-bunker-lessons-learned.md for detailed lessons from v1 development
- Auth0 callback URLs must exactly match (no trailing slash differences)
- CORS must allow Authorization header for JWT
- Handle Auth0 loading state in React before checking isAuthenticated
- Express error handler must return JSON, not HTML
```

---

*Last updated: February 2026*
*Source: Iterative development conversations in Claude.ai*
