# Proof Bunker — Claude Code Rebuild Plan

> **How to use this document:** Work through these phases in order. Each phase is designed to be one or two focused Claude Code sessions. Complete and test each phase before moving to the next. Don't skip ahead — each phase builds on the last.
>
> **Before you start:** Make sure you have Claude Code installed, Node.js (v18+), PostgreSQL installed locally, and your Auth0 account credentials handy.

---

## Pre-Work (Before Opening Claude Code)

Do these manually — they're one-time setup tasks, not coding tasks.

- [ ] **Backup v1 completely** — both repos, database export, uploaded photos, .env files
- [ ] **Save your Auth0 dashboard settings** — screenshot or write down your domain, client ID, API audience, callback URLs. You'll need these again.
- [ ] **Save your production hosting credentials** — whatever platform you deployed v1 to (Render, Railway, etc.)
- [ ] **Download the lessons learned doc and your 100+ page spec** — have them ready on your local machine
- [ ] **Create a new empty GitHub repo** called `proof-bunker` (single repo this time)
- [ ] **Clone it locally** and `cd` into it

---

## Phase 1: Project Scaffolding & CLAUDE.md
**Goal:** Empty monorepo structure with working tooling. No features yet.
**Sessions:** 1

Tell Claude Code:
> "I'm rebuilding a spirits collection management app called Proof Bunker. Read CLAUDE.md and the lessons learned doc, then set up a monorepo with npm workspaces. I need three packages: api (Express + TypeScript), web (React + TypeScript), and shared (shared TypeScript types). Set up the root package.json with workspace config and scripts to run both dev servers. Include tsconfig files. Don't add any features yet — just the skeleton that compiles and runs."

**Before moving on, verify:**
- [ ] `npm install` works from root
- [ ] `npm run dev` starts both servers (Express shows "listening on 3001", React shows the default page)
- [ ] The shared package can be imported from both api and web
- [ ] Commit: "Initial monorepo scaffolding"

---

## Phase 2: Database Schema & Migrations
**Goal:** PostgreSQL database with full schema, migration system in place.
**Sessions:** 1

Tell Claude Code:
> "Set up a database migration system for the api package. Create the initial migration with tables for: users (auth0_sub as primary identifier), bottles (all metadata fields — refer to the spec), and bottle_photos (multi-photo support with primary photo flag and sort order). Include proper indexes and foreign keys. Add a migrate script to package.json."

**Bring your spec into this session** — either paste the relevant schema section or have it in the repo for Claude Code to read. This is where those exact column names and types matter.

**Before moving on, verify:**
- [ ] Local PostgreSQL database created (`proofbunker_dev`)
- [ ] Migration runs cleanly: `npm run migrate`
- [ ] Tables exist with correct columns (check with `psql` or a GUI tool)
- [ ] Commit: "Database schema and migration system"

---

## Phase 3: Environment Configuration
**Goal:** Dual environment setup that works for local dev and will work for production.
**Sessions:** 1

Tell Claude Code:
> "Set up environment configuration for the project. Create .env.example with all needed variables (Auth0, database, ports, URLs, upload directory). Create .env.development with local values. Set up the api and web packages to read from these env files. Add .env files to .gitignore. The app should work differently based on NODE_ENV without any code changes."

**Before moving on, verify:**
- [ ] `.env.example` is committed, `.env.development` is gitignored
- [ ] Both api and web can read environment variables
- [ ] Changing a port in `.env.development` actually changes the port the server uses
- [ ] Commit: "Environment configuration"

---

## Phase 4: Auth0 Authentication — Backend
**Goal:** Express API with JWT verification middleware. No frontend auth yet.
**Sessions:** 1

Tell Claude Code:
> "Add Auth0 JWT authentication to the api package. Use express-oauth2-jwt-bearer. Create auth middleware that verifies bearer tokens and extracts the user's Auth0 sub. Create a test endpoint GET /api/me that returns the authenticated user's info. Make sure CORS is configured to allow the frontend origin and the Authorization header. Refer to the lessons learned doc for Auth0 gotchas."

**Test with a tool like Postman or curl** — you won't have a frontend yet, but you can verify the middleware rejects requests without tokens and the CORS headers are present.

**Before moving on, verify:**
- [ ] GET /api/me without a token returns 401
- [ ] CORS headers are present on responses
- [ ] Error responses are JSON (not HTML)
- [ ] Commit: "Auth0 backend authentication"

---

## Phase 5: Auth0 Authentication — Frontend
**Goal:** React app with login/logout flow that talks to the authenticated API.
**Sessions:** 1

Tell Claude Code:
> "Add Auth0 authentication to the web package. Use @auth0/auth0-react. Wrap the app in Auth0Provider. Create a login page, a protected route wrapper, and handle the loading state between app load and auth check completion (see lessons learned). Create an API service module that automatically attaches the bearer token to all requests. Wire up the GET /api/me endpoint to verify the full auth flow works end to end."

**Before moving on, verify:**
- [ ] Clicking login redirects to Auth0
- [ ] After login, you're redirected back and see your user info
- [ ] Logout works
- [ ] No redirect loops (the v1 nightmare)
- [ ] Refreshing the page while logged in doesn't flash the login screen
- [ ] Commit: "Auth0 frontend authentication"

---

## Phase 6: Bottle CRUD — Backend
**Goal:** Full REST API for bottles.
**Sessions:** 1

Tell Claude Code:
> "Create REST API endpoints for bottles in the api package. All routes require authentication. Endpoints needed: GET /api/bottles (list all for current user, with optional category query param for filtering), GET /api/bottles/:id, POST /api/bottles, PUT /api/bottles/:id, DELETE /api/bottles/:id. Also add GET /api/bottles/summary for collection stats (total count, total value, average value). Use the shared Bottle type. Make sure users can only access their own bottles."

**Before moving on, verify:**
- [ ] Can create a bottle via Postman/curl with a valid token
- [ ] Can list, get, update, delete bottles
- [ ] Category filtering works
- [ ] Summary endpoint returns correct counts/values
- [ ] Cannot access another user's bottles
- [ ] Commit: "Bottle CRUD API"

---

## Phase 7: Bottle CRUD — Frontend
**Goal:** React UI for managing the collection.
**Sessions:** 1-2 (this is the biggest UI phase, may need to split)

Tell Claude Code:
> "Create the React frontend for bottle management. I need: a collection list view showing bottles in a grid/card layout with the collection value summary at the top, a category filter dropdown, a bottle detail view, an add/edit bottle form with all metadata fields, and delete confirmation. Use the shared Bottle type and the API service module we already built. Keep the UI clean and functional — we can polish the design later."

**Before moving on, verify:**
- [ ] Can add a new bottle through the form
- [ ] Collection list shows all your bottles
- [ ] Category filter works
- [ ] Can edit an existing bottle
- [ ] Can delete a bottle
- [ ] Collection summary shows correct totals
- [ ] Commit: "Bottle management frontend"

---

## Phase 8: Photo System — Backend
**Goal:** Multi-photo upload, storage, and management API.
**Sessions:** 1

Tell Claude Code:
> "Add the multi-photo system to the api package. Use multer for file uploads. Endpoints needed: POST /api/bottles/:id/photos (upload one or more photos), DELETE /api/bottles/:id/photos/:photoId, PUT /api/bottles/:id/photos/:photoId/primary (set as primary photo). Photos should be stored in the uploads directory. Include the photos when returning bottle data. Refer to the lessons learned for multer gotchas."

**Before moving on, verify:**
- [ ] Can upload a photo to a bottle
- [ ] Can upload multiple photos
- [ ] Can set a primary photo
- [ ] Can delete a photo
- [ ] Bottle detail endpoint includes photo data
- [ ] Upload directory is created automatically if it doesn't exist
- [ ] Commit: "Multi-photo API"

---

## Phase 9: Photo System — Frontend
**Goal:** Photo upload, gallery, zoom, and management in the UI.
**Sessions:** 1

Tell Claude Code:
> "Add photo management to the React frontend. On the bottle detail page, show a photo gallery with the primary photo displayed prominently. Include: an upload button for adding photos, the ability to set any photo as primary, delete photos, and a zoom/fullscreen modal for viewing photos at full resolution. Handle the file input reset issue mentioned in the lessons learned."

**Before moving on, verify:**
- [ ] Can upload photos from the bottle detail page
- [ ] Gallery displays all photos with primary photo featured
- [ ] Can zoom/fullscreen any photo
- [ ] Can change which photo is primary
- [ ] Can delete photos
- [ ] Uploading the same file twice works (input resets properly)
- [ ] Commit: "Photo management frontend"

---

## Phase 10: Production Deployment
**Goal:** App deployed and working on the web with the same features as local.
**Sessions:** 1-2

Tell Claude Code:
> "Help me set up production deployment for Proof Bunker. I need to create .env.production with production values, set up build scripts for both packages, and configure [YOUR HOSTING PLATFORM] deployment. The frontend should be built as static files and the API should run as a Node.js server. Make sure photo uploads work in the production environment."

**This session will vary a lot depending on your hosting platform.** Have your hosting credentials ready.

**Before moving on, verify:**
- [ ] App is accessible at your production URL
- [ ] Auth0 login/logout works (both local AND production URLs registered)
- [ ] Can create bottles, upload photos in production
- [ ] Works on phone, tablet, desktop
- [ ] Commit: "Production deployment configuration"

---

## Phase 11+: Polish & New Features
**Goal:** Everything beyond core functionality.

Once the above phases are done, you'll be at feature parity with v1. From here, each new feature is its own focused session:

- [ ] Search within collection
- [ ] Sort options (by value, date, name, etc.)
- [ ] UI/UX polish and responsive design refinements
- [ ] Export collection to CSV/PDF
- [ ] Rate limiting and input validation hardening
- [ ] Backup/restore strategy
- [ ] Any new features not in v1

---

## Tips for Each Session

1. **Start every session** by telling Claude Code to read `CLAUDE.md` and relevant sections of the lessons learned doc
2. **One phase per session** — use `/clear` between phases
3. **Test before committing** — don't move on until the phase works
4. **Commit at the end of each phase** with a clear message
5. **Update CLAUDE.md** if you discover new patterns or conventions during a phase
6. **If something breaks**, give Claude Code the exact error — terminal output, browser console, the works
7. **If a session gets long**, it's okay to `/clear` and start a new one for the same phase. Claude Code can read the files it already created.

---

## Estimated Timeline

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Pre-work | 1-2 hours | 1-2 hours |
| Phase 1: Scaffolding | 30-60 min | ~3 hours |
| Phase 2: Database | 30-60 min | ~4 hours |
| Phase 3: Environment | 30 min | ~4.5 hours |
| Phase 4: Auth backend | 1 hour | ~5.5 hours |
| Phase 5: Auth frontend | 1-2 hours | ~7 hours |
| Phase 6: Bottle API | 1 hour | ~8 hours |
| Phase 7: Bottle frontend | 2-3 hours | ~11 hours |
| Phase 8: Photo API | 1 hour | ~12 hours |
| Phase 9: Photo frontend | 1-2 hours | ~14 hours |
| Phase 10: Deployment | 1-2 hours | ~16 hours |

**These are rough estimates.** Some phases will go faster because you've done them before. Some will take longer because Claude Code might approach something differently than we did in chat. The important thing is each phase is bounded and testable.

---

*Remember: You're not starting from zero. You already understand Auth0, CORS, JWT, React hooks, Express middleware, and PostgreSQL migrations. This time you're building with experience, a spec, and a better tool. It'll go faster than you think.*
