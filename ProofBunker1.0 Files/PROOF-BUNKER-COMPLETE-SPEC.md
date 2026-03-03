# Proof Bunker - Complete Technical Specification
## Version: Phase 2.6 (Production)

---

## 1. PROJECT OVERVIEW

### 1.1 Application Purpose
Proof Bunker is a full-stack web application for premium spirits collectors to catalog, manage, and showcase their personal collections. It features a centralized master library of bottles that users can add to their personal "bunker" with custom details and photos.

### 1.2 Target Users
- Premium spirits collectors (whiskey, bourbon, tequila, rum, etc.)
- Enthusiasts managing collections of 50-500+ bottles
- Users need mobile-first photo capture for adding bottles on-the-go

### 1.3 Key Value Propositions
- Centralized master library (313+ bottles pre-loaded)
- Mobile-optimized photo capture via Cloudinary
- Collection analytics (total value, bottle counts, purchase tracking)
- Role-based permissions for community curation
- Professional bottle management with batch numbers, conditions, locations

---

## 2. TECHNOLOGY STACK

### 2.1 Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** TanStack Query (React Query) for server state
- **Styling:** Tailwind CSS
- **Authentication:** Auth0 React SDK
- **HTTP Client:** Axios
- **Icons:** React Icons (Font Awesome)
- **Notifications:** React Hot Toast
- **Deployment:** Netlify (auto-deploy from GitHub)

### 2.2 Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Authentication:** Auth0 JWT verification (express-jwt, jwks-rsa)
- **Database Client:** node-postgres (pg)
- **Security:** helmet, cors, express-rate-limit
- **Deployment:** Railway (auto-deploy from GitHub)

### 2.3 Database
- **Engine:** PostgreSQL 17
- **Hosting:** Railway PostgreSQL
- **Connection:** Direct connection via DATABASE_URL

### 2.4 External Services
- **Authentication:** Auth0 (Google OAuth)
- **Image Storage:** Cloudinary (camera-first upload widget)
- **Deployment:** Netlify (frontend), Railway (backend + database)

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

#### `roles`
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'member', 'curator', 'admin'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  picture_url TEXT,
  role_id UUID REFERENCES roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  phone_number VARCHAR(20),
  subscription_months_earned INTEGER DEFAULT 0,
  bottles_contributed INTEGER DEFAULT 0,
  age_verified BOOLEAN DEFAULT FALSE,
  age_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

#### `master_bottles`
```sql
CREATE TABLE master_bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  distillery_name VARCHAR(255) NOT NULL,
  spirit_category VARCHAR(50) NOT NULL, -- bourbon, rye, scotch, etc.
  type VARCHAR(100), -- Small Batch, Single Barrel, etc.
  age INTEGER,
  abv DECIMAL(5,2),
  abv_varies BOOLEAN DEFAULT FALSE,
  proof DECIMAL(5,2),
  volume INTEGER DEFAULT 750,
  msrp DECIMAL(10,2),
  msrp_varies BOOLEAN DEFAULT FALSE,
  region VARCHAR(100),
  official_photo_url TEXT,
  data_source VARCHAR(50) DEFAULT 'scraped', -- 'scraped', 'collector'
  status VARCHAR(20) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  submitted_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  is_single_barrel BOOLEAN DEFAULT FALSE,
  is_cask_strength BOOLEAN DEFAULT FALSE,
  is_allocated BOOLEAN DEFAULT FALSE,
  allocated_msrp DECIMAL(10,2),
  allocation_notes TEXT,
  description TEXT,
  distillery_url TEXT,
  upc_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_master_bottles_name ON master_bottles(name);
CREATE INDEX idx_master_bottles_distillery ON master_bottles(distillery_name);
CREATE INDEX idx_master_bottles_category ON master_bottles(spirit_category);
CREATE INDEX idx_master_bottles_status ON master_bottles(status);
```

#### `user_bottles`
```sql
CREATE TABLE user_bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  master_bottle_id UUID REFERENCES master_bottles(id),
  
  -- Purchase details
  purchase_price DECIMAL(10,2),
  estimated_value DECIMAL(10,2),
  purchase_date DATE,
  location VARCHAR(255), -- Storage location, shelf, etc.
  
  -- Bottle condition
  bottle_condition VARCHAR(50) DEFAULT 'sealed', -- sealed, opened, empty
  fill_level VARCHAR(50), -- full, high, mid, low
  
  -- Personal notes
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  
  -- Variant details (for variable ABV bottles)
  abv_actual DECIMAL(5,2),
  proof_actual DECIMAL(5,2),
  batch_number VARCHAR(100),
  bottle_number VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_bottles_user_id ON user_bottles(user_id);
CREATE INDEX idx_user_bottles_master_bottle_id ON user_bottles(master_bottle_id);
```

#### `user_bottle_photos`
```sql
CREATE TABLE user_bottle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_bottle_id UUID NOT NULL REFERENCES user_bottles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50) DEFAULT 'custom', -- 'front', 'back', 'label', 'custom'
  caption VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_bottle_photos_bottle_id ON user_bottle_photos(user_bottle_id);
```

#### `master_bottle_photos`
```sql
CREATE TABLE master_bottle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_bottle_id UUID NOT NULL REFERENCES master_bottles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(10) NOT NULL CHECK (photo_type IN ('front', 'back')),
  contributed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(master_bottle_id, photo_type)
);
```

#### `user_settings`
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contribute_photos BOOLEAN DEFAULT TRUE,
  photo_credit BOOLEAN DEFAULT TRUE,
  collection_view VARCHAR(20) DEFAULT 'grid', -- 'grid', 'list'
  collection_columns JSONB DEFAULT '["name","distillery","category","condition","paid","est_value","location"]',
  notify_wishlist_match BOOLEAN DEFAULT TRUE,
  notify_bottle_approved BOOLEAN DEFAULT TRUE,
  notify_marketplace_offer BOOLEAN DEFAULT TRUE,
  notify_new_listing BOOLEAN DEFAULT TRUE,
  notify_via_email BOOLEAN DEFAULT TRUE,
  notify_via_sms BOOLEAN DEFAULT FALSE,
  notify_via_push BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

#### `wishlists`
```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  master_bottle_id UUID NOT NULL REFERENCES master_bottles(id) ON DELETE CASCADE,
  match_exact BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, master_bottle_id)
);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_bottle_id ON wishlists(master_bottle_id);
```

#### `custom_categories`
```sql
CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  submitted_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_categories_status ON custom_categories(status);
```

#### `invitations`
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  token VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
```

### 3.2 Initial Data Seeds

```sql
-- Insert roles
INSERT INTO roles (name, description) VALUES
  ('member', 'Standard collector account'),
  ('curator', 'Trusted collector with review privileges'),
  ('admin', 'Full system access');
```

---

## 4. BACKEND API SPECIFICATION

### 4.1 API Base URL
- **Production:** `https://proof-bunker-backend-production.up.railway.app/api/v1`
- **Local:** `http://localhost:3000/api/v1`

### 4.2 Authentication
All authenticated endpoints require Bearer token in Authorization header:
```
Authorization: Bearer {Auth0_JWT_TOKEN}
```

### 4.3 Middleware Chain
1. **CORS** - Allow specified origins
2. **Helmet** - Security headers
3. **Morgan** - Request logging
4. **Compression** - Response compression
5. **Rate Limiting** - 100 requests per 15 minutes per IP
6. **JWT Verification** (requireAuth) - Validates Auth0 token
7. **ensureUserExists** - Auto-creates user in database on first request
8. **Controller** - Handles business logic

### 4.4 API Endpoints

#### Health Check
```
GET /health
Response: { status, timestamp, uptime, environment }
```

#### Bottle Search
```
GET /api/v1/bottles/search?q={query}&limit={limit}
Query Params:
  - q: search term (name or distillery)
  - limit: max results (default 50)
Response: { success, data: [bottles] }
```

#### User Profile
```
GET /api/v1/users/me
Auth: Required
Response: { success, user: { id, auth0_id, email, name, picture_url, role, ... } }
```

#### User Collection
```
GET /api/v1/users/collection
Auth: Required
Response: { success, collection: [user_bottles_with_master_details] }

POST /api/v1/users/collection
Auth: Required
Body: {
  master_bottle_id: UUID,
  purchase_price?: number,
  estimated_value?: number,
  purchase_date?: date,
  location?: string,
  bottle_condition?: string,
  batch_number?: string,
  bottle_number?: string,
  abv_actual?: number,
  proof_actual?: number,
  notes?: string,
  front_photo_url?: string,
  back_photo_url?: string
}
Response: { success, bottle: user_bottle }

PUT /api/v1/users/collection/:id
Auth: Required
Body: Same as POST (partial updates allowed)
Response: { success, bottle: user_bottle }

DELETE /api/v1/users/collection/:id
Auth: Required
Response: { success, message }
```

#### Bottle Photos
```
POST /api/v1/users/collection/:id/photos
Auth: Required
Body: {
  photo_url: string,
  photo_type: 'front' | 'back' | 'label' | 'custom',
  caption?: string
}
Response: { success, photo }

DELETE /api/v1/users/photos/:photoId
Auth: Required
Response: { success, message }
```

#### User Settings
```
GET /api/v1/users/settings
Auth: Required
Response: { success, settings }

PUT /api/v1/users/settings
Auth: Required
Body: {
  contribute_photos?: boolean,
  photo_credit?: boolean,
  collection_view?: 'grid' | 'list',
  collection_columns?: string[],
  notify_*?: boolean
}
Response: { success, settings }
```

#### Notifications
```
GET /api/v1/users/notifications
Auth: Required
Response: { success, notifications: [notifications] }

GET /api/v1/users/notifications/count
Auth: Required
Response: { success, count: number }

PUT /api/v1/users/notifications/:id/read
Auth: Required
Response: { success, notification }
```

#### User Profile with Role
```
GET /api/v1/users/profile
Auth: Required
Response: { success, user, role }
```

#### Bottle Submission
```
GET /api/v1/submissions/check?name={name}&distillery={distillery}
Response: { success, exists: boolean, matches: [similar_bottles] }

POST /api/v1/submissions
Auth: Required
Body: {
  // Master bottle fields
  name: string,
  distillery_name: string,
  spirit_category: string,
  type?: string,
  age?: number,
  abv?: number,
  abv_varies?: boolean,
  volume?: number,
  msrp?: number,
  msrp_varies?: boolean,
  region?: string,
  description?: string,
  is_single_barrel?: boolean,
  is_cask_strength?: boolean,
  is_allocated?: boolean,
  distillery_url?: string,
  upc_code?: string,
  front_photo_url: string, // required
  back_photo_url?: string,
  
  // User's bottle details
  purchase_price?: number,
  estimated_value?: number,
  location?: string,
  notes?: string,
  // ... other user_bottle fields
}
Response: { success, master_bottle, user_bottle }
```

#### Master Bottle Admin (Admin/Curator Only)
```
GET /api/v1/master-bottles/user/role
Auth: Required
Response: { success, role: string }

PUT /api/v1/master-bottles/:id
Auth: Required (Admin/Curator)
Body: {
  name?: string,
  distillery_name?: string,
  spirit_category?: string,
  // ... any master_bottles field
}
Response: { success, bottle }

DELETE /api/v1/master-bottles/:id
Auth: Required (Admin/Curator)
Response: { success, message }
Note: Fails if bottle is in any user collections
```

### 4.5 Error Handling
All errors return:
```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP Status Codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Project Structure
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── AgeGate.tsx              # Age verification splash
│   │   ├── AddToBunkerModal.tsx     # Enhanced add to collection modal
│   │   ├── BottleCard.tsx           # Bottle display card
│   │   ├── CloudinaryUpload.tsx     # Camera-first photo upload
│   │   ├── EditMasterBottleModal.tsx # Admin master bottle editor
│   │   ├── Navbar.tsx               # Main navigation
│   │   └── ProtectedRoute.tsx       # Auth guard
│   ├── lib/
│   │   └── api.ts                   # Axios client + API methods
│   ├── pages/
│   │   ├── AddBottlePage.tsx        # Legacy add (redirect to Quick Add)
│   │   ├── CallbackPage.tsx         # Auth0 callback
│   │   ├── CollectionPage.tsx       # User's collection (grid/list view)
│   │   ├── HomePage.tsx             # Landing page
│   │   ├── QuickAddPage.tsx         # Mobile-first add bottle
│   │   ├── SearchPage.tsx           # Master library search with admin features
│   │   ├── SettingsPage.tsx         # User preferences
│   │   └── SubmitBottlePage.tsx     # Detailed submission form
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   ├── App.tsx                      # Root component
│   ├── main.tsx                     # Entry point
│   └── vite-env.d.ts                # Vite types
├── .env                             # Environment variables
├── index.html
├── netlify.toml                     # Netlify config
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### 5.2 Key Components

#### AgeGate.tsx
- Shows on first visit
- Stores verification in localStorage
- Blocks entire app until verified

#### CloudinaryUpload.tsx
```typescript
interface CloudinaryUploadProps {
  onUpload: (url: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  existingUrl?: string;
  photoType?: 'front' | 'back' | 'label' | 'custom';
  onReplaceConfirm?: () => void;
}
```
- Uses Cloudinary Upload Widget
- Camera-first (mobile optimization)
- Auto-converts HEIC to JPG
- Shows confirmation for front/back photo replacement

#### AddToBunkerModal.tsx
- Triggered from SearchPage when clicking "Add to Bunker"
- Pre-fills: name, distillery from master bottle
- Optional fields: purchase price, est. value, location, condition, batch #, bottle #, ABV, notes
- Camera photo upload for front/back
- Submits to POST /users/collection

#### EditMasterBottleModal.tsx
- Only visible to admin/curator
- Edits all master_bottles fields
- Saves to PUT /master-bottles/:id

#### SearchPage.tsx
- Card-based display (like collection page)
- Zoom functionality on photos
- "Add to Bunker" button on each card
- Admin/Curator: Edit & Delete buttons
- Integrates AddToBunkerModal and EditMasterBottleModal

#### CollectionPage.tsx
- Grid/List view toggle (saved to user_settings)
- List view: Sortable columns, draggable width, column picker
- Summary stats: Total Bottles, Total Paid, Est. Total Value
- Badges: Single Barrel, Cask Strength, Unverified
- Photo type badges (front/back/label)
- Edit modal for each bottle
- Multi-photo support with zoom

#### SettingsPage.tsx
- 4 sections: Profile, Photos & Contributions, Notifications, Privacy
- Toggle switches for preferences
- Saves to PUT /users/settings

#### QuickAddPage.tsx
- Mobile-first design
- Camera-first photo capture
- Minimal required fields
- Collapsible advanced section
- Auto-checks for duplicates

### 5.3 Routing
```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/search" element={<SearchPage />} />
  <Route path="/callback" element={<CallbackPage />} />
  
  {/* Protected Routes */}
  <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
  <Route path="/quick-add" element={<ProtectedRoute><QuickAddPage /></ProtectedRoute>} />
  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
  <Route path="/submit" element={<ProtectedRoute><SubmitBottlePage /></ProtectedRoute>} />
</Routes>
```

### 5.4 State Management
- **Server State:** TanStack Query (React Query)
  - Query keys: `['bottles', query]`, `['collection']`, `['settings']`, `['notifications']`
  - Automatic caching, refetching, and invalidation
- **Local State:** React useState/useEffect
- **Auth State:** Auth0 React SDK (useAuth0 hook)

### 5.5 API Client (lib/api.ts)
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor adds auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// API methods
export const bottleApi = {
  search: (params) => api.get('/bottles/search', { params }),
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  getCollection: () => api.get('/users/collection'),
  addToCollection: (data) => api.post('/users/collection', data),
  updateBottle: (id, data) => api.put(`/users/collection/${id}`, data),
  deleteBottle: (id) => api.delete(`/users/collection/${id}`),
  addPhoto: (id, data) => api.post(`/users/collection/${id}/photos`, data),
  deletePhoto: (photoId) => api.delete(`/users/photos/${photoId}`),
};

export const settingsApi = {
  getSettings: () => api.get('/users/settings'),
  updateSettings: (data) => api.put('/users/settings', data),
  getProfile: () => api.get('/users/profile'),
  getNotifications: () => api.get('/users/notifications'),
  getNotificationCount: () => api.get('/users/notifications/count'),
  markRead: (id) => api.put(`/users/notifications/${id}/read`),
};

export const submissionApi = {
  checkExists: (name, distillery?) => api.get('/submissions/check', { params: { name, distillery } }),
  submit: (data) => api.post('/submissions', data),
};

export const masterBottleApi = {
  getUserRole: () => api.get('/master-bottles/user/role'),
  update: (id, data) => api.put(`/master-bottles/${id}`, data),
  delete: (id) => api.delete(`/master-bottles/${id}`),
};

// Utility: Convert HEIC to JPG for Cloudinary URLs
export const toDisplayUrl = (url: string) => {
  if (!url) return url;
  return url.replace(/\.heic$/i, '.jpg');
};
```

---

## 6. STYLING & DESIGN SYSTEM

### 6.1 Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        whiskey: '#D4A574', // Primary brand color (amber/gold)
      },
    },
  },
  plugins: [],
};
```

### 6.2 Global CSS Classes
```css
/* Common patterns */
.card {
  @apply bg-white rounded-lg shadow p-4 border border-gray-100;
}

.input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey focus:border-transparent;
}

.label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.btn-primary {
  @apply bg-whiskey hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition;
}

.btn-secondary {
  @apply bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition;
}
```

### 6.3 Design Principles
- **Whiskey-themed:** Amber/gold accents (#D4A574)
- **Mobile-first:** All interfaces optimized for phone use
- **Card-based:** Consistent card design for bottles
- **Photo-centric:** Large, zoomable images
- **Minimal chrome:** Clean, uncluttered interfaces
- **Quick actions:** Important actions within 1-2 taps

---

## 7. AUTHENTICATION & AUTHORIZATION

### 7.1 Auth0 Configuration
**Application Type:** Single Page Application

**Settings:**
- **Domain:** `dev-aa1ngt172tdv2zls.us.auth0.com`
- **Client ID:** `y7V924cWIkgxi7r1uJ5dp870CL4EkW3A`
- **Audience:** `https://api.proofbunker.com`
- **Allowed Callback URLs:** 
  - `http://localhost:5173`
  - `https://your-app.netlify.app`
- **Allowed Logout URLs:** Same as callback
- **Allowed Web Origins:** Same as callback
- **Allowed Origins (CORS):** Same as callback

**Connections Enabled:**
- Google OAuth2 (primary login method)

### 7.2 Frontend Auth Flow
```typescript
// App.tsx
import { Auth0Provider } from '@auth0/auth0-react';

<Auth0Provider
  domain={import.meta.env.VITE_AUTH0_DOMAIN}
  clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
  authorizationParams={{
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  }}
  useRefreshTokens={true}
  cacheLocation="localstorage"
>
  {/* App */}
</Auth0Provider>

// Usage in components
const { isAuthenticated, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();

// Get token for API calls
const getToken = async () => {
  const token = await getAccessTokenSilently({ 
    authorizationParams: { scope: 'openid profile email' } 
  });
  localStorage.setItem('auth_token', token);
};
```

### 7.3 Backend Auth Middleware
```typescript
// middleware/auth.ts
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

export const requireAuth = checkJwt;

export const getUserFromToken = (req) => req.auth || null;

// Auto-create user on first request
export const ensureUserExists = async (req, res, next) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return next();
  
  // Check if user exists
  const existing = await query('SELECT id FROM users WHERE auth0_id = $1', [authUser.sub]);
  
  if (existing.rows.length === 0) {
    // Create user
    const memberRole = await query("SELECT id FROM roles WHERE name = 'member'");
    await query(
      `INSERT INTO users (auth0_id, email, name, picture_url, role_id, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [authUser.sub, authUser.email, authUser.name, authUser.picture, memberRole.rows[0].id]
    );
  } else {
    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE auth0_id = $1', [authUser.sub]);
  }
  
  next();
};
```

### 7.4 Role-Based Access Control

**Roles:**
- **Member:** Default role, can manage own collection
- **Curator:** Can edit/delete master bottles, review submissions
- **Admin:** Full system access

**Backend Permission Checks:**
```typescript
const isAdminOrCurator = async (auth0Id: string): Promise<boolean> => {
  const result = await query(`
    SELECT r.name 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.auth0_id = $1
  `, [auth0Id]);
  
  const role = result.rows[0]?.name;
  return role === 'admin' || role === 'curator';
};
```

**Frontend Role Display:**
```typescript
// Get user role
const { data } = await masterBottleApi.getUserRole();
const isAdmin = data.role === 'admin' || data.role === 'curator';

// Show/hide features
{isAdmin && <EditButton />}
{isAdmin && <DeleteButton />}
```

---

## 8. IMAGE MANAGEMENT

### 8.1 Cloudinary Configuration
**Account:** Free tier (25GB storage)
**Upload Preset:** `ml_default` (unsigned)

### 8.2 Upload Widget Configuration
```typescript
const cloudinary = window.cloudinary;
const widget = cloudinary.createUploadWidget({
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  sources: ['camera', 'local'], // Camera first!
  defaultSource: 'camera',
  multiple: false,
  maxFiles: 1,
  clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  maxFileSize: 10000000, // 10MB
  folder: 'proof-bunker',
  transformation: [
    { fetch_format: 'auto', quality: 'auto' },
    { format: 'jpg' } // Force JPG to avoid HEIC issues
  ]
}, callback);
```

### 8.3 HEIC Handling
**Problem:** iPhone photos are HEIC format, browsers don't support it

**Solution:**
1. Cloudinary transformation forces JPG on upload
2. Frontend `toDisplayUrl()` utility converts .heic to .jpg in URLs
3. Cloudinary auto-converts on-the-fly when .jpg extension is requested

```typescript
export const toDisplayUrl = (url: string) => {
  if (!url) return url;
  return url.replace(/\.heic$/i, '.jpg');
};
```

### 8.4 Photo Types & Storage Rules
**Master Bottles:**
- Front photo (1 max) - stored in master_bottle_photos
- Back photo (1 max) - stored in master_bottle_photos
- Replaces existing when uploading new

**User Bottles:**
- Front photo (1 max) - stored in user_bottle_photos
- Back photo (1 max) - stored in user_bottle_photos
- Label photos (unlimited) - stored in user_bottle_photos
- Custom photos (unlimited) - stored in user_bottle_photos

---

## 9. DEPLOYMENT CONFIGURATION

### 9.1 Environment Variables

#### Frontend (.env)
```env
VITE_AUTH0_DOMAIN=dev-aa1ngt172tdv2zls.us.auth0.com
VITE_AUTH0_CLIENT_ID=y7V924cWIkgxi7r1uJ5dp870CL4EkW3A
VITE_AUTH0_AUDIENCE=https://api.proofbunker.com
VITE_API_URL=https://proof-bunker-backend-production.up.railway.app/api/v1
VITE_CLOUDINARY_CLOUD_NAME=doorryzm7
VITE_CLOUDINARY_UPLOAD_PRESET=ml_default
```

#### Backend (.env - LOCAL ONLY)
```env
# Auth0
AUTH0_DOMAIN=dev-aa1ngt172tdv2zls.us.auth0.com
AUTH0_AUDIENCE=https://api.proofbunker.com

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/proofbunker

# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.netlify.app
```

**IMPORTANT:** Never commit .env files to Git. Backend .env is for local development only.

### 9.2 Netlify Configuration (netlify.toml)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Netlify Environment Variables (set in dashboard):**
- All VITE_* variables from frontend .env

### 9.3 Railway Configuration

**Backend Service Variables:**
```
AUTH0_DOMAIN=dev-aa1ngt172tdv2zls.us.auth0.com
AUTH0_AUDIENCE=https://api.proofbunker.com
ALLOWED_ORIGINS=https://your-app.netlify.app,http://localhost:5173
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@host:port/railway
```

**PostgreSQL Service:**
- Public networking: ENABLED
- Connection format: `postgresql://postgres:password@interchange.proxy.rlwy.net:56601/railway`
- Use PUBLIC hostname (not postgres.railway.internal)

### 9.4 Deployment Scripts (PowerShell)

#### deploy-backend.ps1
```powershell
Set-Location J:\ProofBunker\backend
git status
git add .
$commitMessage = Read-Host "Commit message (or Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Update backend - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
git commit -m $commitMessage
git push
Write-Host "✅ Backend deployed! Railway will rebuild automatically."
```

#### deploy-frontend.ps1
```powershell
Set-Location J:\ProofBunker\frontend
git status
git add .
$commitMessage = Read-Host "Commit message (or Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Update frontend - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
git commit -m $commitMessage
git push
Write-Host "✅ Frontend deployed! Netlify will rebuild automatically."
```

#### deploy-both.ps1
```powershell
$commitMessage = Read-Host "Commit message for BOTH"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy updates - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# Backend
Set-Location J:\ProofBunker\backend
git add .
git commit -m $commitMessage
git push

# Frontend
Set-Location J:\ProofBunker\frontend
git add .
git commit -m $commitMessage
git push

Write-Host "✅ Both services deployed!"
```

---

## 10. KEY FEATURES & USER FLOWS

### 10.1 First-Time User Flow
1. Visit site → Age verification splash
2. Click "I am 21 or older" → stored in localStorage
3. Click "Login" → Redirects to Auth0 (Google OAuth)
4. Auth0 redirects back → JWT token stored
5. First API request triggers `ensureUserExists` middleware
6. User auto-created in database with 'member' role
7. Redirected to Collection page (empty state)

### 10.2 Search & Add to Bunker Flow
1. Navigate to "Search Bunker"
2. Type bottle name (minimum 2 characters)
3. Results display as cards with photos
4. Click "Add to My Bunker" on desired bottle
5. Modal opens with:
   - Pre-filled: name, distillery
   - Optional: price, value, location, condition, photos, notes
6. Take front/back photos via camera button (Cloudinary widget)
7. Click "Add to My Bunker"
8. Bottle added to collection with all details
9. Redirected to Collection page showing new bottle

### 10.3 Quick Add Flow (Mobile-First)
1. Navigate to "Quick Add" (or click from search "not found")
2. Camera opens for front photo
3. Take photo → auto-uploads to Cloudinary
4. Fill minimal fields: name, distillery, category
5. Optionally add back photo, purchase details
6. Expand "Advanced" for batch #, notes, etc.
7. Click "Add to My Bunker"
8. Backend checks for duplicates in master library
9. If new: Creates master_bottle (status='pending') + user_bottle
10. If exists: Just creates user_bottle with link to master
11. Photos saved to both master and user tables

### 10.4 Collection Management Flow
1. View collection in grid or list view
2. Toggle view → saved to user_settings
3. List view: Choose columns via column picker
4. Click bottle → Edit modal opens
5. Update any field (price, value, location, condition, notes)
6. Add/replace photos (front, back, label, custom)
7. Delete photos individually
8. Save → PUT to /users/collection/:id
9. Collection refreshes with updated data

### 10.5 Admin/Curator Master Bottle Management
1. User with admin/curator role searches bottles
2. Edit & Delete buttons appear on each card
3. Click Edit → EditMasterBottleModal opens
4. Modify any master_bottles field
5. Save → PUT to /master-bottles/:id
6. Master bottle updated immediately (no approval needed)
7. All users see updated master data
8. Click Delete → Confirmation modal
9. If bottle not in any collections → DELETE from database
10. If bottle in collections → Error "Cannot delete: in use by X users"

### 10.6 Settings & Preferences
1. Navigate to Settings page (gear icon)
2. **Profile:** View name, email, role
3. **Photos & Contributions:** Toggle photo contribution, credit display
4. **Notifications:** Configure channels (email/SMS/push) and types
5. **Privacy:** (Future: data export, account deletion)
6. Changes saved immediately → PUT to /users/settings
7. Preferences applied across app (collection view, columns, etc.)

---

## 11. DATA VALIDATION & BUSINESS RULES

### 11.1 Master Bottle Validation
- **Required:** name, distillery_name, spirit_category
- **ABV:** 0-100%, optional, can mark as "varies"
- **MSRP:** Non-negative, can mark as "varies"
- **Age:** Non-negative integer
- **Volume:** Default 750ml, common values: 50, 200, 375, 500, 750, 1000, 1750
- **Status:** Only 'pending', 'approved', 'rejected' allowed
- **Photos:** Max 1 front, max 1 back (replaces existing)

### 11.2 User Bottle Validation
- **Required:** master_bottle_id (must exist)
- **Purchase Price:** Non-negative
- **Estimated Value:** Non-negative
- **Condition:** Only 'sealed', 'opened', 'empty' allowed
- **Rating:** 1-5 stars
- **Photos:** Max 1 front, max 1 back, unlimited label/custom

### 11.3 Business Logic Rules

**Duplicate Prevention:**
- When submitting new bottle, fuzzy match on name + distillery
- Show similar matches to user
- Warn "This bottle may already exist"
- Allow submission anyway (curator will merge duplicates)

**Photo Replacement:**
- Uploading front photo when one exists → Confirm replacement → Delete old, save new
- Uploading back photo when one exists → Confirm replacement → Delete old, save new
- Label/custom photos → No replacement, just add

**Master Bottle Deletion:**
- Check if bottle is in any user collections
- If yes: Reject deletion, show count of users
- If no: Allow deletion (cascade deletes photos)

**User Bottle Deletion:**
- Delete user_bottle record
- Cascade deletes all user_bottle_photos
- Does NOT affect master_bottle

**Role Permissions:**
- Member: Manage own collection only
- Curator: Edit/delete master bottles, review submissions
- Admin: All curator permissions + user management

---

## 12. PERFORMANCE OPTIMIZATIONS

### 12.1 Database Indexes
All critical query paths have indexes:
- users: auth0_id, email
- master_bottles: name, distillery_name, spirit_category, status
- user_bottles: user_id, master_bottle_id
- user_bottle_photos: user_bottle_id
- notifications: user_id, (user_id, is_read) where is_read = false

### 12.2 Query Optimizations
- Collection query joins master_bottles for single-query results
- Search query uses ILIKE with indexes for case-insensitive search
- Photo queries use CASCADE DELETE to avoid orphaned records
- Notification count query uses COUNT(*) with filtered index

### 12.3 Frontend Optimizations
- React Query caching (5min stale time, 10min cache time)
- Image lazy loading (native browser lazy loading)
- Cloudinary auto-optimization (format, quality)
- Debounced search input (300ms delay)
- Pagination not needed (collections typically <500 bottles)

### 12.4 API Rate Limiting
- 100 requests per 15 minutes per IP
- Applied to all /api/* routes
- Returns 429 Too Many Requests when exceeded

---

## 13. ERROR HANDLING & LOGGING

### 13.1 Backend Error Handling
```typescript
// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

### 13.2 Frontend Error Handling
```typescript
// API client error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);

// React Query error handling
const { data, error, isError } = useQuery({
  queryKey: ['bottles'],
  queryFn: bottleApi.search,
  onError: (err) => toast.error('Failed to load bottles'),
  retry: 2,
  retryDelay: 1000,
});
```

### 13.3 Logging
**Backend:**
- Morgan HTTP request logging (dev format locally, combined in production)
- Console.error for all caught exceptions
- Database query logging (optional, via connection.ts)

**Frontend:**
- Console errors for debugging
- React Hot Toast for user-facing errors
- No analytics/tracking (privacy-first)

---

## 14. TESTING STRATEGY

### 14.1 Manual Testing Checklist

**Authentication:**
- [ ] Age gate displays on first visit
- [ ] Login with Google works
- [ ] Logout works
- [ ] User auto-created in database on first API call
- [ ] Protected routes redirect to login when not authenticated

**Search:**
- [ ] Search finds bottles by name
- [ ] Search finds bottles by distillery
- [ ] Search shows "not found" for non-existent bottles
- [ ] Search results display in cards with photos
- [ ] Photo zoom works on click

**Add to Bunker:**
- [ ] "Add to Bunker" button shows for authenticated users
- [ ] Modal opens with pre-filled name/distillery
- [ ] Camera button opens Cloudinary widget
- [ ] Photo upload works (front and back)
- [ ] All optional fields can be filled
- [ ] Bottle added to collection on submit
- [ ] Redirected to collection after add

**Collection Management:**
- [ ] Collection displays in grid view by default
- [ ] Toggle to list view works, preference saved
- [ ] Column picker works in list view
- [ ] Edit bottle modal opens on click
- [ ] All fields can be updated
- [ ] Photos can be added/replaced/deleted
- [ ] Delete bottle works with confirmation
- [ ] Summary stats show correct totals

**Admin Features:**
- [ ] Admin/curator role checked on login
- [ ] Edit/Delete buttons show only for admin/curator
- [ ] Edit master bottle modal opens and saves
- [ ] Delete master bottle works (fails if in collections)
- [ ] Non-admin users don't see admin buttons

**Settings:**
- [ ] Settings page loads user preferences
- [ ] All toggles can be changed
- [ ] Collection view preference applies to collection page
- [ ] Notification preferences save

**Mobile:**
- [ ] All pages responsive on phone
- [ ] Camera button opens device camera
- [ ] Photos upload from mobile
- [ ] Quick Add flow works on phone
- [ ] Navigation accessible on mobile

### 14.2 Database Testing
```sql
-- Verify roles exist
SELECT * FROM roles;

-- Check user creation
SELECT u.email, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id;

-- Verify master bottles loaded
SELECT COUNT(*), spirit_category 
FROM master_bottles 
GROUP BY spirit_category;

-- Check user collections
SELECT u.email, COUNT(ub.id) as bottle_count
FROM users u
LEFT JOIN user_bottles ub ON u.id = ub.user_id
GROUP BY u.email;
```

### 14.3 API Testing (Postman/curl)
```bash
# Health check
curl https://api.proofbunker.com/health

# Search (no auth)
curl "https://api.proofbunker.com/api/v1/bottles/search?q=buffalo&limit=10"

# Get collection (with auth)
curl -H "Authorization: Bearer {token}" \
  https://api.proofbunker.com/api/v1/users/collection

# Add to collection (with auth)
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"master_bottle_id":"abc-123","purchase_price":50}' \
  https://api.proofbunker.com/api/v1/users/collection
```

---

## 15. COMMON ISSUES & TROUBLESHOOTING

### 15.1 "User not found" Error
**Cause:** User authenticated with Auth0 but not created in database

**Solution:**
1. Check if `ensureUserExists` middleware is applied to route
2. Verify middleware runs AFTER `requireAuth`
3. Check Railway logs for "Creating new user" message
4. Manually create user if needed:
```sql
INSERT INTO users (auth0_id, email, name, role_id)
VALUES ('auth0|xxx', 'user@email.com', 'Name', 
  (SELECT id FROM roles WHERE name = 'member'));
```

### 15.2 Photos Not Displaying (HEIC Issue)
**Cause:** iPhone uploads HEIC files, browsers don't support

**Solution:**
1. Verify Cloudinary transformation forces JPG: `{ format: 'jpg' }`
2. Use `toDisplayUrl()` utility on all photo URLs
3. Check Cloudinary upload preset has format transformation

### 15.3 Database Connection Refused
**Cause:** Railway DATABASE_URL using internal hostname or wrong port

**Solution:**
1. Get PUBLIC hostname from Railway PostgreSQL settings
2. Use format: `postgresql://user:pass@PUBLIC_HOST:PORT/database`
3. Example: `postgresql://postgres:pass@interchange.proxy.rlwy.net:56601/railway`
4. NOT: `postgres.railway.internal` (only works inside Railway network)

### 15.4 CORS Errors
**Cause:** Frontend origin not in backend ALLOWED_ORIGINS

**Solution:**
1. Add Netlify URL to Railway backend variables
2. Format: `https://your-app.netlify.app,http://localhost:5173`
3. No trailing slashes, comma-separated
4. Restart backend after changing

### 15.5 Build Fails - TypeScript Errors
**Cause:** Missing vite-env.d.ts type definitions

**Solution:**
Create `frontend/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string
  readonly VITE_AUTH0_CLIENT_ID: string
  readonly VITE_AUTH0_AUDIENCE: string
  readonly VITE_API_URL: string
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 15.6 Railway Build Fails - DATABASE_URL Invalid
**Cause:** Extra port or malformed URL

**Common Mistakes:**
- `...@host:56601:5432/db` (two ports)
- `postgres://...` (should be `postgresql://`)
- Internal hostname instead of public

**Correct Format:**
```
postgresql://postgres:password@interchange.proxy.rlwy.net:56601/railway
```

---

## 16. FUTURE PHASES (NOT YET IMPLEMENTED)

### Phase 3: Discovery & Scanner
- Barcode scanner integration
- AI label recognition (OCR)
- Quick scan mode for conventions
- Enhanced search with filters

### Phase 4: Social & Notifications
- Wishlist / "Looking For" feature
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- Contribution rewards tracking

### Phase 5: Admin & Curator Tools
- Admin dashboard
- Curator review queue for submissions
- Bulk photo management
- User management panel

### Phase 6: Marketplace
- Buy/sell/trade listings
- Blockchain verification (on hold)
- Escrow system
- Shipping integration

### Phase 7: Community Features
- User profiles
- Collection sharing
- Trade requests
- Discussion forums

---

## 17. DEVELOPMENT WORKFLOW

### 17.1 Local Development Setup

**Prerequisites:**
- Node.js 18+
- PostgreSQL 13+
- Git

**Backend Setup:**
```bash
cd backend
npm install
createdb proofbunker
psql -d proofbunker -f db-migrations/001-initial-schema.sql
# Run all migrations in order (002-007)
cp .env.example .env
# Edit .env with local credentials
npm run dev
```

**Frontend Setup:**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with Auth0 and API details
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API: http://localhost:3000/api/v1

### 17.2 Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit often
git add .
git commit -m "Add feature X"

# Push to GitHub
git push origin feature/my-feature

# Merge to main via PR or directly
git checkout main
git merge feature/my-feature
git push origin main

# Railway/Netlify auto-deploy on push to main
```

### 17.3 Database Migrations
**Always create new migration files, never edit existing ones**

```bash
# Create new migration
touch backend/db-migrations/008-my-changes.sql

# Write SQL in migration file
BEGIN;
-- Your changes here
COMMIT;

# Apply locally
psql -d proofbunker -f backend/db-migrations/008-my-changes.sql

# Apply to production (Railway)
railway connect postgres
# Copy/paste migration contents
```

---

## 18. PRODUCTION URLS & ACCESS

**Frontend:** https://dancing-pegasus-f341c0.netlify.app
**Backend:** https://proof-bunker-backend-production.up.railway.app
**API:** https://proof-bunker-backend-production.up.railway.app/api/v1

**Admin Access:**
1. Login with Google
2. Manually update user role in database:
```sql
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'your-email@example.com';
```

**Monitoring:**
- Backend logs: Railway dashboard → Backend service → Deployments → View Logs
- Frontend logs: Netlify dashboard → Site → Deploys → Deploy log
- Database: Railway dashboard → PostgreSQL → Data tab

---

## 19. QUICK REFERENCE

### 19.1 Common Commands
```bash
# Deploy both frontend and backend
.\deploy-both.ps1

# Run migrations
psql -d proofbunker -f backend/db-migrations/XXX-name.sql

# Connect to production database
railway connect postgres

# View backend logs
railway logs

# Check API health
curl https://proof-bunker-backend-production.up.railway.app/health
```

### 19.2 Important File Paths
```
Backend:
- server.ts - Main app setup
- middleware/auth.ts - JWT verification, user auto-creation
- controllers/ - Business logic
- routes/ - API endpoints

Frontend:
- App.tsx - Root component with Auth0Provider
- pages/SearchPage.tsx - Master library search with admin features
- pages/CollectionPage.tsx - User's collection management
- pages/QuickAddPage.tsx - Mobile-first add flow
- components/AddToBunkerModal.tsx - Enhanced add modal
- components/CloudinaryUpload.tsx - Camera upload widget
- lib/api.ts - API client
```

### 19.3 Environment Variable Reference
**Frontend:**
- VITE_AUTH0_DOMAIN
- VITE_AUTH0_CLIENT_ID
- VITE_AUTH0_AUDIENCE
- VITE_API_URL
- VITE_CLOUDINARY_CLOUD_NAME
- VITE_CLOUDINARY_UPLOAD_PRESET

**Backend:**
- AUTH0_DOMAIN
- AUTH0_AUDIENCE
- DATABASE_URL
- NODE_ENV
- PORT
- ALLOWED_ORIGINS

---

## 20. HANDOFF CHECKLIST

When providing this spec to recreate the project:

**Database Setup:**
- [ ] Create PostgreSQL database
- [ ] Run migrations 002-007 in order
- [ ] Seed roles table
- [ ] Load 313 master bottles (import from CSV or API)

**Backend Setup:**
- [ ] Clone/create backend repo
- [ ] Install dependencies
- [ ] Configure .env variables
- [ ] Deploy to Railway
- [ ] Verify health endpoint

**Frontend Setup:**
- [ ] Clone/create frontend repo
- [ ] Install dependencies
- [ ] Configure .env variables
- [ ] Deploy to Netlify
- [ ] Verify age gate and login

**External Services:**
- [ ] Configure Auth0 application
- [ ] Set up Cloudinary account and preset
- [ ] Update all URLs in configs

**Testing:**
- [ ] Create test user
- [ ] Search for bottles
- [ ] Add bottle to collection
- [ ] Upload photos
- [ ] Verify admin features (if admin role)

**Production Readiness:**
- [ ] SSL enabled (automatic on Netlify/Railway)
- [ ] CORS configured
- [ ] Rate limiting active
- [ ] Error handling tested
- [ ] Mobile responsiveness verified

---

## APPENDIX A: Sample Master Bottle Data

```json
{
  "id": "uuid",
  "name": "Buffalo Trace",
  "distillery_name": "Buffalo Trace Distillery",
  "spirit_category": "bourbon",
  "type": "Kentucky Straight Bourbon",
  "age": null,
  "abv": 45,
  "proof": 90,
  "volume": 750,
  "msrp": 29.99,
  "region": "Kentucky",
  "official_photo_url": "https://res.cloudinary.com/xxx/image/upload/v1/proof-bunker/buffalo-trace.jpg",
  "is_single_barrel": false,
  "is_cask_strength": false,
  "is_allocated": false,
  "status": "approved",
  "data_source": "scraped"
}
```

---

## APPENDIX B: Sample API Responses

**Search Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "name": "Buffalo Trace",
      "distillery_name": "Buffalo Trace Distillery",
      "spirit_category": "bourbon",
      "abv": 45,
      "proof": 90,
      "msrp": 29.99,
      "official_photo_url": "https://...",
      "is_single_barrel": false,
      "is_cask_strength": false,
      "is_allocated": false,
      "status": "approved"
    }
  ]
}
```

**Collection Response:**
```json
{
  "success": true,
  "collection": [
    {
      "id": "user-bottle-123",
      "user_id": "user-abc",
      "master_bottle_id": "abc-123",
      "purchase_price": 35.00,
      "estimated_value": 50.00,
      "location": "Home Bar",
      "bottle_condition": "opened",
      "notes": "Great value bourbon",
      "created_at": "2024-01-15T10:30:00Z",
      "master_bottle": {
        "name": "Buffalo Trace",
        "distillery_name": "Buffalo Trace Distillery",
        "spirit_category": "bourbon",
        "abv": 45,
        "official_photo_url": "https://..."
      },
      "photos": [
        {
          "id": "photo-123",
          "photo_url": "https://...",
          "photo_type": "front"
        }
      ]
    }
  ]
}
```

---

## DOCUMENT VERSION
**Version:** 2.6.0  
**Date:** February 18, 2026  
**Status:** Production Ready  
**Last Updated By:** Claude AI & Mike (AthensTiger)

---

**END OF SPECIFICATION**

This document contains everything needed to rebuild Proof Bunker from scratch. Follow sections 1-19 in order for complete implementation.
