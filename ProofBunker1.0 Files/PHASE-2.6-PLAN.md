# Phase 2.6: Enhanced Add to Bunker + Master Bottle Management

## Backend Complete ✅

### New Endpoints:
- `PUT /api/v1/master-bottles/:id` - Update master bottle (admin/curator)
- `DELETE /api/v1/master-bottles/:id` - Delete master bottle (admin/curator)
- `GET /api/v1/master-bottles/user/role` - Get current user's role

### Controllers Created:
- `masterBottleController.ts` - Handles master bottle CRUD for admins/curators

### Routes Created:
- `masterBottleRoutes.ts` - Master bottle admin routes

---

## Frontend To Build:

### 1. Add to Bunker Modal (Enhanced)
**Trigger:** Click "Add to Bunker" on search result
**Features:**
- Pre-filled: Bottle name, distillery from master
- Optional fields:
  - Amount Paid
  - Est. Value
  - Purchase Date
  - Location
  - Condition (sealed/opened/empty)
  - Batch #, Bottle #
  - ABV/Proof
  - Notes
- Photo upload via Cloudinary (front, back, label)
- Save → POST to `/api/v1/users/collection` with all details

### 2. Edit Master Bottle Modal (Admin/Curator)
**Trigger:** Click Edit on search result (only visible to admin/curator)
**Features:**
- Edit all master bottle fields
- Save → PUT to `/api/v1/master-bottles/:id`

### 3. Search Results Enhancement
**Changes to SearchPage:**
- Display bottles in cards (like collection page)
- Show photos with zoom
- For admin/curator: Show Edit & Delete buttons
- "Add to Bunker" button prominent
- Check user role on page load to show/hide admin features

---

## Files to Update:

### Backend (ready to deploy):
- ✅ `masterBottleController.ts` (new)
- ✅ `masterBottleRoutes.ts` (new)
- ✅ `server.ts` (updated)

### Frontend (to build):
- `api.ts` - Add master bottle endpoints
- `SearchPage.tsx` - Redesign with cards, zoom, edit/delete
- `BottleCard.tsx` - Update to support "Add to Bunker" modal
- `AddToBunkerModal.tsx` (new component)
- `EditMasterBottleModal.tsx` (new component)

---

## Deploy Backend First:
```powershell
.\deploy-backend.ps1
```

Then I'll build the frontend components.
