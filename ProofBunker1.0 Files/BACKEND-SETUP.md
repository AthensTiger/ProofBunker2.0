# 🚀 Proof Bunker Backend - Setup Guide

## ⏱️ Time to Complete: 10 minutes

---

## 📦 Step 1: Copy Backend to Your Project (2 min)

```powershell
# Download the 'backend' folder from outputs
# Extract to: J:\ProofBunker\backend
```

**You should have:**
```
J:\ProofBunker\
├── backend/               ← NEW!
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── scrapers/
├── seed-data-200-bottles.sql
└── ...
```

---

## 📦 Step 2: Install Dependencies (3 min)

```powershell
cd J:\ProofBunker\backend

# Install all packages
npm install
```

**You'll see:**
```
added 150+ packages in 30s
```

---

## ⚙️ Step 3: Configure Environment (2 min)

```powershell
# Create .env file
copy .env.example .env

# Edit .env file
notepad .env
```

**Update this line:**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5433/proofbunker
```

**Replace `YOUR_PASSWORD` with your actual PostgreSQL password**

**Save and close**

---

## 🚀 Step 4: Start the Server (1 min)

```powershell
npm run dev
```

**You should see:**
```
🥃 ==========================================
🔒 PROOF BUNKER API
🥃 ==========================================
📡 Server running on port 3000
🌍 Environment: development
🔗 API Base: http://localhost:3000/api/v1
💚 Health: http://localhost:3000/health
🥃 ==========================================

✅ Database connected successfully
```

---

## ✅ Step 5: Test It Works! (2 min)

### **Test 1: Open in Browser**
```
http://localhost:3000
```

**You should see:**
```json
{
  "name": "Proof Bunker API",
  "version": "v1",
  "description": "Universal Spirits Collection Platform",
  "endpoints": { ... }
}
```

### **Test 2: Search for Buffalo Trace**
```
http://localhost:3000/api/v1/bottles/search?q=buffalo
```

**You should see:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Buffalo Trace Kentucky Straight Bourbon",
      "distillery_name": "Buffalo Trace",
      "msrp": 29.99,
      "official_photo_url": "https://cdn.drizly.com/...",
      ...
    }
  ],
  "pagination": { "total": 14, ... }
}
```

### **Test 3: Autocomplete**
```
http://localhost:3000/api/v1/bottles/autocomplete?q=pap
```

**You should see Pappy Van Winkle suggestions!**

---

## 🎯 What You Have Now

✅ **RESTful API running on localhost:3000**
✅ **Connected to your PostgreSQL database**
✅ **Search 312 bottles** (259 seed + 53 yours)
✅ **Autocomplete working**
✅ **UPC lookup ready**
✅ **Filter options available**

---

## 📋 Available Endpoints

### **Search:**
- `GET /api/v1/bottles/search?q=buffalo`
- `GET /api/v1/bottles/autocomplete?q=buf`
- `GET /api/v1/bottles/filters`

### **Lookup:**
- `GET /api/v1/bottles/upc/:upc`
- `GET /api/v1/bottles/:id`

### **Health:**
- `GET /health`

---

## 🧪 Test with curl (Optional)

```powershell
# Search
curl "http://localhost:3000/api/v1/bottles/search?q=pappy"

# Autocomplete
curl "http://localhost:3000/api/v1/bottles/autocomplete?q=buf&limit=5"

# Filters
curl "http://localhost:3000/api/v1/bottles/filters"

# Your Unicorn bottles
curl "http://localhost:3000/api/v1/bottles/search?q=still+austin"
```

---

## 🐛 Troubleshooting

### **"Cannot find module"**
```powershell
npm install
```

### **"Database connection failed"**
- Check PostgreSQL is running
- Verify password in `.env`
- Test connection: `psql -U postgres -p 5433 -d proofbunker`

### **"Port 3000 already in use"**
Edit `.env`:
```env
PORT=3001
```

### **"ts-node not found"**
```powershell
npm install -g ts-node typescript
```

---

## 🎨 Next Steps

### **Now:**
1. ✅ Backend API running
2. ✅ Test all endpoints work
3. ✅ Keep server running (`npm run dev`)

### **Next (Phase 3):**
1. Update frontend to use API
2. Add Auth0 authentication
3. Create user collection endpoints
4. Add barcode scanning

---

## 🔧 Development Tips

### **Auto-reload:**
The dev server auto-reloads when you change files!

### **Stop server:**
Press `Ctrl + C`

### **Restart server:**
```powershell
npm run dev
```

### **Build for production:**
```powershell
npm run build
npm start
```

---

## 📊 What's Happening

When you hit the API:
```
Browser/Frontend
    ↓
http://localhost:3000/api/v1/bottles/search?q=buffalo
    ↓
Express Server (TypeScript)
    ↓
bottleController.ts (search logic)
    ↓
PostgreSQL Database Query
    ↓
Results with photos
    ↓
JSON Response to Frontend
```

---

**🎉 You now have a production-grade backend API!**

**Leave it running and open a new terminal for frontend work.** 🚀

