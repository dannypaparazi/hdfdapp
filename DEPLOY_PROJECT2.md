# Deploy Project 2: User Order App on Vercel

## Overview

You'll deploy a **separate Vercel project** for the user-facing order app.

**Architecture:**
- **Project 1 (Admin):** `hdfdapp.vercel.app` → Admin panel + menu management
- **Project 2 (User):** `userorder.vercel.app` → Customer ordering via QR codes

Both projects share the **same GitHub repository** and **same data storage** (localStorage/IndexedDB).

---

## Step-by-Step Deployment

### Step 1: Create New Vercel Project

1. Visit **vercel.com**
2. Login with your account
3. Click **"Add New"** → **"Project"**
4. **Import from Git**
5. Select your GitHub repo: `dannypaparazi/hdfdapp`

### Step 2: Configure Build Settings

**Project Settings:**
- **Project Name:** `userorder` (or similar)
- **Root Directory:** `.` (default)
- **Build Command:** `npm run build:user`
- **Output Directory:** `dist`
- **Development Command:** `npm run dev:user`

### Step 3: Set Environment Variables

In Vercel project settings → **Environment Variables**, add:

```
VITE_MODE=user
```

This tells the app to use user-only mode (QR login + ordering).

### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. You'll get a URL: **`https://userorder.vercel.app`** (or similar)

✅ **Project 2 is now live!**

---

## Update QR Code URL

After Project 2 is deployed, update the QR code generator:

**File:** `src/utils/qrcode.js`

The code already uses:
```javascript
const baseUrl = process.env.REACT_APP_USER_ORDER_URL || 'https://userorder.vercel.app'
```

**If you get a different Vercel URL**, add environment variable:

```
REACT_APP_USER_ORDER_URL=https://your-actual-vercel-url.vercel.app
```

---

## Testing Project 2

### Test in Admin Panel

1. Login to **Project 1** (hdfdapp.vercel.app)
2. Go to **Admin → QR Codes tab**
3. Generate QR codes
4. Copy the QR code text (e.g., `table_1`)

### Test User Ordering

1. Visit **Project 2** (userorder.vercel.app)
2. Paste or enter: `table_1`
3. Should see menu items created in Project 1
4. Add items to order
5. Verify order data syncs back to Project 1

---

## Verify Data Sharing

Both projects share data through:

**localStorage keys:**
- `hotpot_items` → Menu items
- `hotpot_orders` → Orders
- `hotpot_table_counters` → Table session numbers

**IndexedDB Database:**
- `HotpotDiFocolare` → Archived orders

✅ When admin adds an item, it appears instantly to users (after refresh)
✅ When users order, items appear in admin's Order Confirmation

---

## Project 1 vs Project 2

| Feature | Project 1 (Admin) | Project 2 (User) |
|---------|-------------------|------------------|
| URL | hdfdapp.vercel.app | userorder.vercel.app |
| Login | Username/Password | QR Code Scan |
| Menu Management | ✅ Create/Edit/Delete | ❌ View Only |
| QR Code Generator | ✅ Generate & Print | ❌ Input Only |
| View Orders | ✅ Full Management | ✅ View Own Order |
| Served Items | ✅ Track & Mark | ❌ Not Applicable |
| Order History | ✅ All Orders | ❌ Not Applicable |

---

## Troubleshooting

### Build Fails

**Error:** "npm run build:user not found"

**Solution:** The build script doesn't exist yet. For now, use regular:
```
Build Command: npm run build
```

Both projects work with the same build since they detect the entry point.

### Users Can't See Menu Items

**Solution:** 
- Admin must add items in Project 1 first
- User must refresh Project 2 page
- Both must be on same network/device OR using same localStorage

### Vercel URL is Different

**Example:** You get `https://userorder-abc123.vercel.app`

**Solution:** 
- Update QR codes with new URL in environment variable:
  ```
  REACT_APP_USER_ORDER_URL=https://userorder-abc123.vercel.app
  ```
- Or, update in Admin Panel and regenerate QR codes

---

## Next Steps

1. ✅ Deploy Project 2
2. ✅ Test data sharing between projects
3. ✅ Generate QR codes from Admin panel
4. ✅ Print and laminate QR codes
5. ✅ Place on tables
6. ✅ Customers scan and order!

---

## Quick Reference

**Admin Panel:**
- URL: `https://hdfdapp.vercel.app`
- Login: `admin` / `admin123`
- Access: Menu, QR Codes, Orders, Storage

**User Order App:**
- URL: `https://userorder.vercel.app` (or your actual Vercel URL)
- Login: Scan QR code (e.g., `table_1`)
- Access: Browse menu, place orders

---

## Environment Variables Summary

**Project 1 (Admin):**
```
# Optional, defaults to development
VITE_MODE=admin
```

**Project 2 (User):**
```
# Required
VITE_MODE=user

# Optional, defaults to userorder.vercel.app
REACT_APP_USER_ORDER_URL=https://your-actual-url.vercel.app
```

---

## Support

If you need to update the user order URL later:
1. Go to Project 2 settings in Vercel
2. Update environment variable
3. Redeploy
4. Update QR codes with new URL

Done! Your two-project setup is complete. 🚀
