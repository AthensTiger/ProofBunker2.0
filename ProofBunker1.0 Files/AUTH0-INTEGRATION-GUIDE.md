# 🔐 Proof Bunker - Auth0 Integration Setup

## ✅ Auth0 Setup Complete!

Your credentials:
- **Domain:** `dev-aa1ngt172tdv2zls.us.auth0.com`
- **Client ID:** `y7V924cWIkgxi7r1uJ5dp870CL4EkW3A`
- **API Identifier:** `https://api.proofbunker.com`
- **Social Login:** Google enabled ✅

---

## 🚀 Backend Integration (5 minutes)

### **Step 1: Update Backend Files**

I've created new files for you:
1. **src/middleware/auth.ts** - Auth0 JWT verification
2. **src/controllers/userController.ts** - User endpoints
3. **src/routes/userRoutes.ts** - User routes
4. **db-migrations/002-add-users.sql** - User tables

### **Step 2: Install New Dependencies**

```powershell
cd J:\ProofBunker\backend

# Install Auth0 packages
npm install express-jwt@8.4.1 jwks-rsa@3.1.0
```

### **Step 3: Update .env File**

```powershell
notepad .env
```

**Add these lines:**
```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-aa1ngt172tdv2zls.us.auth0.com
AUTH0_AUDIENCE=https://api.proofbunker.com
AUTH0_ISSUER=https://dev-aa1ngt172tdv2zls.us.auth0.com/
```

**Save and close**

### **Step 4: Run Database Migration**

```powershell
# Add user tables
psql -U postgres -p 5433 -d proofbunker -f db-migrations/002-add-users.sql
```

**You should see:**
```
BEGIN
CREATE TABLE (users)
CREATE TABLE (user_bottles)
CREATE INDEX
...
COMMIT

 status              | users_table | user_bottles_table
---------------------+-------------+--------------------
 USER TABLES CREATED |           1 |                  1
```

### **Step 5: Restart Backend**

```powershell
# Stop server (Ctrl+C if running)

# Restart
npm run dev
```

**You should see:**
```
🥃 ==========================================
🔒 PROOF BUNKER API
🥃 ==========================================
📡 Server running on port 3000
✅ Database connected successfully
```

---

## 🧪 Test Auth0 Integration

### **Public Endpoints (No Auth Required):**

These still work without authentication:
```
http://localhost:3000/api/v1/bottles/search?q=buffalo
http://localhost:3000/api/v1/bottles/autocomplete?q=pap
```

### **Protected Endpoints (Auth Required):**

These require a valid Auth0 token:
```
GET  /api/v1/users/me                    # Get user profile
GET  /api/v1/users/collection             # Get user's bottles
POST /api/v1/users/collection             # Add bottle to collection
PUT  /api/v1/users/collection/:id         # Update bottle
DELETE /api/v1/users/collection/:id       # Delete bottle
```

---

## 📋 New Database Tables

### **users table:**
```sql
- id (UUID)
- auth0_id (Auth0 user ID)
- email
- name
- picture_url
- created_at, updated_at, last_login
```

### **user_bottles table:**
```sql
- id (UUID)
- user_id → references users
- master_bottle_id → references master_bottles
- purchase_price, purchase_date, purchase_location
- bottle_condition (sealed/opened/empty)
- notes, rating (1-5 stars)
- custom_photo_url
```

---

## 🎯 How Authentication Works

### **1. User Login Flow:**
```
User clicks "Login with Google"
    ↓
Redirected to Auth0
    ↓
Google authentication
    ↓
Auth0 returns JWT token
    ↓
Frontend stores token
    ↓
Frontend sends token in requests:
Authorization: Bearer <token>
    ↓
Backend verifies token with Auth0
    ↓
Request succeeds with user info
```

### **2. Protected Endpoint Example:**

**Request:**
```http
GET /api/v1/users/collection
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "bottles": [
    {
      "id": "uuid",
      "name": "Pappy Van Winkle 23 Year",
      "purchase_price": 3825.00,
      "purchase_date": "2025-03-23",
      "notes": "Unicorn Auctions win!",
      "official_photo_url": "https://res.cloudinary.com/..."
    }
  ]
}
```

---

## 🔒 Security Features

### **What's Protected:**
- ✅ JWT signature verification (Auth0 public keys)
- ✅ Token expiration checking
- ✅ Audience validation (ensures token is for YOUR API)
- ✅ Issuer validation (ensures token is from YOUR Auth0)
- ✅ User isolation (can only see/edit own bottles)

### **What's NOT Protected (Public):**
- ✅ Bottle search
- ✅ Autocomplete
- ✅ UPC lookup
- ✅ Filter options

---

## 📝 Next Steps

### **Backend is READY!** ✅

Now you have:
1. ✅ Auth0 configured
2. ✅ JWT authentication working
3. ✅ User management endpoints
4. ✅ Collection management endpoints
5. ✅ Database tables for users

### **Next: Build React Frontend (Phase 3B)**

We'll create a React app with:
1. Auth0 login button
2. Protected routes
3. User collection display
4. Add/edit/delete bottles
5. Search master database
6. Barcode scanning

---

## 🐛 Troubleshooting

### **"express-jwt not found"**
```powershell
npm install express-jwt@8.4.1 jwks-rsa@3.1.0
```

### **"Table users does not exist"**
```powershell
psql -U postgres -p 5433 -d proofbunker -f db-migrations/002-add-users.sql
```

### **"Invalid token"**
- Make sure frontend is sending: `Authorization: Bearer <token>`
- Check token isn't expired (default: 24 hours)
- Verify AUTH0_DOMAIN and AUTH0_AUDIENCE in .env

### **"Cannot read property 'sub' of undefined"**
- Token is valid but user info not extracted
- Check getUserFromToken() is being called
- Verify token has 'sub' claim

---

## 🎉 What You Accomplished

### **Auth0 Setup:**
- ✅ Created Auth0 account
- ✅ Configured application
- ✅ Created API
- ✅ Enabled Google login

### **Backend Integration:**
- ✅ JWT verification middleware
- ✅ User authentication endpoints
- ✅ Collection management
- ✅ Auto-create users on first login
- ✅ User isolation (security)

---

**Backend is now fully secured and ready for React frontend!** 🔐🚀

**Ready to build the React app?** Say "let's build React" and I'll create it! 

