# 🖼️ Proof Bunker - Unicorn Auctions Import with Photos

## ✅ What I Extracted

From your **MyPurchaseInventory.xlsx**:
- ✅ **53 bottles** with complete data
- ✅ **53 JPEG images** (one per bottle)
- ✅ **Total value:** $18,690

---

## 📁 Files Generated

### **In `/mnt/user-data/outputs/`:**

1. **import-unicorn-purchases.sql** - Database import (bottles without photos for now)
2. **unicorn_images/** - Folder with all 53 bottle photos
   - `bottle_001.jpeg` through `bottle_053.jpeg`
   - Sizes range from 17KB to 114KB
   - High quality product photos

---

## 🎯 Two Options for Photos

### **Option 1: Upload to Cloudinary (Recommended)**

**Why Cloudinary:**
- ✅ Free tier: 25GB storage, 25GB bandwidth/month
- ✅ Automatic image optimization
- ✅ CDN delivery (fast worldwide)
- ✅ Image transformations (resize, crop, etc.)
- ✅ Simple API

**Steps:**
1. **Sign up:** https://cloudinary.com (free)
2. **Get credentials:**
   - Cloud name
   - API key
   - API secret
3. **Upload images** (I'll create a script for this)
4. **Get URLs back**
5. **Update database**

### **Option 2: AWS S3 (More Control)**

**Why S3:**
- ✅ Industry standard
- ✅ Very cheap ($0.023/GB/month)
- ✅ Extremely reliable
- ✅ Full control

**Steps:**
1. Create S3 bucket
2. Upload images
3. Make public or use signed URLs
4. Update database with URLs

---

## 🚀 Quick Start: Import Bottles Now (Photos Later)

### **Step 1: Import Bottle Data**

```powershell
cd J:\ProofBunker

# Import bottles without photos
psql -U postgres -p 5433 -d proofbunker -f import-unicorn-purchases.sql
```

**Result:** 53 bottles in database, photos stored locally

### **Step 2: Upload Photos to Cloudinary**

I'll create a Python script that:
1. Uploads all 53 images to Cloudinary
2. Gets back the URLs
3. Generates UPDATE statements to add photos to database

**You'll need:**
```bash
pip install cloudinary
```

### **Step 3: Update Database with Photo URLs**

After upload, run the generated UPDATE script:
```powershell
psql -U postgres -p 5433 -d proofbunker -f update-photo-urls.sql
```

---

## 📊 Image-to-Bottle Mapping

| # | Bottle Name | Image File | Price |
|---|-------------|------------|-------|
| 1 | Still Austin Tanager Cigar Blend Bourbon (2024) | bottle_001.jpeg | $355 |
| 2 | Still Austin Cask Strength Bourbon | bottle_002.jpeg | $45 |
| 3 | Still Austin Cask Strength Rye | bottle_003.jpeg | $40 |
| 4 | Still Austin Liquor Bueno Private Barrel (2019) | bottle_004.jpeg | $120 |
| 5 | Wild Turkey Tradition Bourbon (1995) | bottle_005.jpeg | $300 |
| 10 | Elijah Craig 12 Year Barrel Proof (A313) | bottle_010.jpeg | $520 |
| ... | (47 more bottles) | ... | ... |

Full mapping available in `image_mapping.json`

---

## 💡 Photo Workflow (Recommended)

### **Now:**
1. ✅ Import bottles to database (no photos)
2. ✅ Test the system, search bottles
3. ✅ Build backend API

### **Later (Phase 3):**
1. Set up Cloudinary account
2. Run upload script
3. Update database with URLs
4. Photos display in app!

**Why wait?**
- Photos are nice-to-have, not critical for MVP
- Cloudinary setup takes 15 minutes
- Focus on core functionality first
- Can add photos anytime

---

## 🔧 Cloudinary Upload Script (Ready When You Are)

I'll create a Python script that:

```python
import cloudinary
import cloudinary.uploader
import os
import json

# Configure Cloudinary (you'll add your credentials)
cloudinary.config(
    cloud_name='YOUR_CLOUD_NAME',
    api_key='YOUR_API_KEY',
    api_secret='YOUR_API_SECRET'
)

# Upload all 53 images
uploaded_urls = {}
for i in range(1, 54):
    filename = f'unicorn_images/bottle_{i:03d}.jpeg'
    
    # Upload to Cloudinary
    result = cloudinary.uploader.upload(
        filename,
        folder='proof-bunker/unicorn-purchases',
        public_id=f'bottle_{i:03d}'
    )
    
    # Save URL
    uploaded_urls[i] = result['secure_url']
    print(f"Uploaded bottle {i}: {result['secure_url']}")

# Generate SQL UPDATE statements
with open('update-photo-urls.sql', 'w') as f:
    f.write("-- Update bottles with Cloudinary photo URLs\n\n")
    f.write("BEGIN;\n\n")
    
    for i, url in uploaded_urls.items():
        f.write(f"-- Bottle {i}\n")
        f.write(f"UPDATE master_bottles\n")
        f.write(f"SET official_photo_url = '{url}',\n")
        f.write(f"    photo_source = 'user_uploaded'\n")
        f.write(f"WHERE ... ; -- Match by name\n\n")
    
    f.write("COMMIT;\n")
```

---

## 📸 Your Bottle Photos

**Quality:** Excellent!
- Professional product shots
- Clear bottle labels visible
- Good lighting
- Perfect for collection display

**Sample Images:**
- Pappy Van Winkle 23: 79KB, clear labels
- Booker's Limited Rye: 92KB, beautiful photography
- Still Austin bottles: 18-53KB, crisp details

---

## 🎯 Current Status

### ✅ **Done:**
- Extracted 53 bottle records
- Extracted 53 JPEG images
- Generated SQL import script
- Saved images to `/mnt/user-data/outputs/unicorn_images/`

### 📋 **Next Steps (Your Choice):**

**Option A: Import Now, Photos Later**
```powershell
psql -U postgres -p 5433 -d proofbunker -f import-unicorn-purchases.sql
```
Result: 53 bottles in database (no photos yet)

**Option B: Set Up Cloudinary First**
1. Sign up for Cloudinary
2. I'll create upload script
3. Upload all 53 images
4. Import with photo URLs

**My Recommendation:** **Option A**
- Get your bottles in the database NOW
- Test search, auto-fill, etc.
- Add photos in 15 minutes later

---

## 💾 Storage Estimates

**Cloudinary Free Tier:**
- Your 53 images: ~3.5MB total
- Free tier: 25GB
- **You're using 0.014% of free storage** 
- Can add **thousands more bottles** for free!

**S3 Cost:**
- 3.5MB @ $0.023/GB = **$0.00008/month**
- Basically free!

---

**Ready to import your bottles?** 

Run the SQL script and let me know when it's done! Then we can decide on photo upload strategy. 🥃📸

