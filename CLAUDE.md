# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Proof Bunker is a premium spirits collection management platform. Users search a master bottle database, add bottles to personal collections, and submit new bottles for community use. The system has three independent components: a React frontend, a Node.js/Express API backend, and Python scrapers.

## Development Commands

### Backend (Express API, port 3000)
```bash
cd backend && npm run dev       # Start dev server with nodemon/ts-node hot reload
cd backend && npm run build     # Compile TypeScript to dist/
cd backend && npm start         # Run compiled JS from dist/server.js
cd backend && npm run lint      # ESLint on src/**/*.ts
cd backend && npm test          # Jest (test infrastructure exists, tests TBD)
cd backend && npm run migrate   # Run DB migrations (node dist/db/migrate.js)
```

### Frontend (React + Vite, port 5173)
```bash
cd frontend && npm run dev      # Vite dev server
cd frontend && npm run build    # tsc && vite build to dist/
cd frontend && npm run lint     # ESLint for TS/TSX files
cd frontend && npm run preview  # Preview production build
```

### Scrapers (Python)
```bash
cd scrapers && python -m venv venv
cd scrapers && source venv/bin/activate   # or venv\Scripts\activate on Windows
cd scrapers && pip install -r requirements.txt
python scrapers/total_wine_scraper.py --categories bourbon --max-pages 2  # Test run
```

## Architecture

### Data Flow
```
React Frontend (Vite/Tailwind) --Auth0 JWT--> Express API (port 3000) --> PostgreSQL
Python Scrapers --psycopg2 direct--> PostgreSQL (master_bottles table)
```

### Two-Tier Data Model
- **Master Bottles** (`master_bottles`, `master_distilleries`): Shared community reference database populated by scrapers and user submissions. Each record has `data_source` (scraped/user_submitted/official) and `verification_level` (0-3).
- **User Collections**: Personal collections referencing master bottles, with user-specific fields (purchase price, fill level, tasting notes, condition).

### Authentication
Auth0 issues RS256 JWTs. Backend verifies via JWKS (`express-jwt` + `jwks-rsa`). The `ensureUserExists` middleware in `backend/src/middleware/auth.ts` auto-creates a user record on first authenticated request. Frontend gates routes behind `ProtectedRoute` component + an age gate (21+ verification stored in localStorage).

### API Structure
All routes are versioned under `/api/v1/`:
- `/bottles` - Public: search, autocomplete, UPC lookup, filters
- `/users` - Protected: profile, collection CRUD, settings
- `/submissions` - Protected: submit new bottles to master DB
- `/master-bottles` - Admin: edit/delete master records

Route files in `backend/src/routes/` delegate to controllers in `backend/src/controllers/`.

### Frontend State Management
- **React Query** (`@tanstack/react-query`) for server state and API response caching
- **Zustand** for client-side UI state
- **React Router DOM v6** for routing with protected route wrappers

### Image Storage
Cloudinary CDN for bottle photos. URLs stored in DB, uploads handled via `CloudinaryUpload` component.

### Spirit Categories
Schema supports: whiskey, tequila, rum, gin, vodka, cognac, brandy, mezcal. Originally whiskey-only; extended via `Documentation/database-schema-universal.sql`.

## Key Configuration

- Backend env: `backend/.env` (copy from `backend/.env.example`) — DB URL, Auth0 config, CORS origins, Cloudinary keys
- Frontend env: `frontend/.env` (copy from `frontend/.env.example`) — Auth0 domain/client ID, API URL (prefix vars with `VITE_`)
- Scrapers env: `scrapers/.env` — DATABASE_URL, scraping limits
- Database schema: `Documentation/database-schema.sql` (core), `Documentation/database-schema-universal.sql` (multi-spirit extension)
- PostgreSQL runs on port 5433 (non-default)

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Backend | Node.js (>=18), Express 4, TypeScript |
| Database | PostgreSQL (pg library, connection pool) |
| Auth | Auth0 (RS256 JWT) |
| Scrapers | Python 3, requests, BeautifulSoup, psycopg2 |
| Images | Cloudinary |
