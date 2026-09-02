# User Order System Setup

## Overview

The Hotpot Di Focolare app now includes a dedicated user-facing ordering system accessible via QR codes on each table. This allows customers to scan and place orders independently.

**Structure:**
- **Admin Panel** (`hdfdapp.vercel.app`): Staff/admin interface for managing menu, orders, and generating QR codes
- **User Order** (`userorder.hdfdapp.vercel.app`): Customer-facing interface for scanning QR codes and placing orders

---

## For Admins

### Generating QR Codes

1. **Login to Admin Panel** at `hdfdapp.vercel.app`
2. **Navigate to QR Codes Tab**
3. **Select Tables:**
   - Click individual tables, or
   - Click "Select All Tables" to generate QR codes for all 20 tables
4. **Generate QR Codes:**
   - QR codes are automatically generated
   - Preview shows QR codes with table numbers
5. **Print or Download:**
   - Click "Print QR Codes" to print all selected tables
   - Or click "Download" on individual QR codes

### QR Code Format

Each QR code encodes a table number in the format: `table_1`, `table_2`, etc.

When scanned, the QR code directs to:
```
https://userorder.hdfdapp.vercel.app?code=table_1
```

### Manage Menu Items

1. Go to **Menu tab** in Admin Panel
2. Add new items with:
   - Item name
   - Price
   - Description
   - Photo (optional)
3. **Items are instantly visible to users** who have already logged in

---

## For Customers

### How to Order

1. **Scan QR Code** on your table
2. **Enter Table Number** (if manual entry needed)
3. **Browse Menu** and select items
4. **Choose Quantity** for each item
5. **Add to Order**
6. **Continue Ordering** or confirm when ready
7. **Staff will bring items** to your table

### User Order Interface

- Clean, mobile-optimized design
- Real-time item availability
- Running order total
- Item details and photos
- Simple quantity selection

---

## Deployment Setup

### Option 1: Two Separate Vercel Projects (Recommended)

**Admin Project:**
```bash
# Deploy to hdfdapp.vercel.app
# Uses main.jsx entry point
# Show full admin interface
```

**User Project:**
```bash
# Deploy to userorder.hdfdapp.vercel.app
# Uses main-user.jsx entry point
# Show only user login and order interface
```

### Option 2: Single Vercel Project with Environment Variables

Deploy the same code to both subdomains with different `VITE_MODE` environment variables:

**vercel.json configuration:**
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "(.*)",
      "dest": "index.html"
    }
  ]
}
```

**For Admin:**
- Domain: `hdfdapp.vercel.app`
- Build command: `npm run build`
- Environment: `VITE_MODE=admin`

**For User:**
- Domain: `userorder.hdfdapp.vercel.app`
- Build command: `npm run build:user`
- Environment: `VITE_MODE=user`

---

## Building for Production

### Admin Build
```bash
npm run build
# Creates optimized build in dist/
```

### User Build
```bash
npm run build:user
# Creates optimized build for user order app
```

---

## QR Code Specifications

- **Format:** Table number (e.g., `table_1`)
- **Size:** 400x400 pixels
- **Error Correction:** High (30%)
- **Content:** Plain text
- **URL:** `https://userorder.hdfdapp.vercel.app`

### Printing Recommendations

- **Printer Settings:** Color, glossy paper recommended
- **Size:** 4x4 inches or 10x10 cm per QR code
- **Placement:** Laminate and place on center of each table
- **Alternative:** Print on stickers for easy repositioning

---

## Data Sharing

Both admin and user interfaces share the same:
- **Menu Items:** Stored in localStorage (`hotpot_items`)
- **Orders:** Stored in localStorage (`hotpot_orders`) and IndexedDB archive
- **Storage:** 5MB localStorage limit + unlimited IndexedDB

### How It Works

1. **Admin creates item** → Saved to localStorage
2. **User logs in** → Fetches latest menu items
3. **User orders** → Order saved with table number
4. **Admin sees order** → In Order Confirmation tab
5. **Admin marks served** → Moves to Served Items section
6. **Admin checks out** → Moves to Order History

---

## Subdomain Setup (Vercel)

### Configure Custom Domain

1. **Go to Vercel Dashboard**
2. **Select hdfdapp project**
3. **Settings → Domains**
4. **Add domain:** `userorder.hdfdapp.vercel.app`
5. **Deployment for userorder:**
   - Create new Vercel project from same Git repo
   - Or use build environment variable to differentiate

### DNS Configuration

Ensure your domain registrar has:
```
userorder.hdfdapp.vercel.app → CNAME: cname.vercel.app
hdfdapp.vercel.app → CNAME: cname.vercel.app
```

---

## Features

### Admin Features
✅ Menu management (add, edit, delete items)
✅ Order management with served items tracking
✅ QR code generation and printing
✅ Order history with filters
✅ Storage management
✅ User accounts
✅ Quantity history tracking

### User Features
✅ QR code scan/login
✅ Browse menu with photos
✅ View item details
✅ Select quantity
✅ Running order total
✅ Add/remove items
✅ See order status

---

## Troubleshooting

### QR Code Not Working
- Check subdomain is accessible: `https://userorder.hdfdapp.vercel.app`
- Verify custom domain setup in Vercel
- Clear browser cache

### Items Not Appearing
- Admin must add items in Menu tab first
- User must refresh page to see new items
- Check localStorage hasn't reached 5MB limit

### Subdomain Issues
- Verify CNAME records at domain registrar
- Allow 24-48 hours for DNS propagation
- Check Vercel domain settings

---

## Environment Variables

For separate deployments, set:

**.env (Admin)**
```
VITE_APP_MODE=admin
VITE_USER_ORDER_URL=https://userorder.hdfdapp.vercel.app
```

**.env (User)**
```
VITE_APP_MODE=user
VITE_ADMIN_URL=https://hdfdapp.vercel.app
```

---

## Future Enhancements

Possible features to add:
- Payment integration
- Table management
- Staff notifications
- Order tracking with real-time updates
- Multi-language support
- Dietary restrictions/special requests
- Rating and reviews
- Loyalty program integration
