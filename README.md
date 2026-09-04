# 🍲 Hotpot Di Focolare

A full-stack restaurant hotpot ordering system with separate admin and customer interfaces. Deployed as two independent web applications on Vercel with real-time data synchronization via Firebase Firestore.

**Admin Panel:** [hdfdapp.vercel.app](https://hdfdapp.vercel.app)  
**Customer Ordering:** [userorder.vercel.app](https://userorder.vercel.app)

---

## 🎯 Features

### Admin Panel (`hdfdapp.vercel.app`)
- **Menu Management:** Create, edit, and delete menu items with photos, descriptions, and pricing
- **Order Oversight:** Monitor all incoming customer orders with real-time updates
- **Order Status Control:** Mark items as served or unable to serve
- **Item Visibility:** Manage which menu items are available to customers
- **QR Code Generator:** Generate and print QR codes for all 20 tables
- **Storage Dashboard:** Monitor localStorage usage and data archiving

### Customer Ordering App (`userorder.vercel.app`)
- **QR Code Login:** Scan table QR codes to enter the ordering system
- **Menu Browsing:** View available items with photos, descriptions, and prices
- **Order Placement:** Add items to order with custom quantities
- **Real-Time Status:** See order status updates as items are prepared (pending → served)
- **Order Summary:** View itemized orders with subtotals
- **Ready Notifications:** Receive notifications when items are ready to pick up
- **Mobile Responsive:** Full-featured on phones, tablets, and desktops

---

## 🏗️ Architecture

### Two-Project Deployment Pattern
This is a **monorepo** deployed as two separate Vercel projects from a single GitHub repository:

```
GitHub Repository (HDFApp)
├── Admin Project
│   └── Build: VITE_MODE=admin npm run build → index.html
│   └── Deploy: hdfdapp.vercel.app
│
└── User Project
    └── Build: VITE_MODE=user npm run build → index-user.html
    └── Deploy: userorder.vercel.app
```

**Why two projects?**
- Separate entry points and navigation flows
- Independent deployments and scaling
- Clear separation of concerns (admin ↔ customer)
- Shared Firebase backend for real-time sync

### Data Sync Architecture
```
Customer App (userorder.vercel.app)
    ↓
    └─→ Firebase Firestore ←─┐
                             │
                       Admin App (hdfdapp.vercel.app)

Both apps:
• Read/write to same Firestore collections
• Poll for updates every 3 seconds
• Update order status in real-time
• Share menu items and orders
```

---

## 💻 Tech Stack

- **Frontend Framework:** React 18 with Hooks
- **Build Tool:** Vite 5
- **Backend & Database:** Firebase Firestore (real-time data sync)
- **Styling:** CSS Modules (component-scoped styling)
- **Deployment:** Vercel (two separate projects)
- **Storage:** localStorage (local cache) + IndexedDB (archive)

---

## 📁 Project Structure

```
src/
├── main.jsx                    # Entry point (admin app)
├── main-user.jsx               # Entry point (user app)
├── App.jsx                     # Admin app root component
├── AppUser.jsx                 # User app root component
│
├── pages/
│   ├── Home.jsx                # Admin: Table selection
│   ├── OrderConfirmation.jsx   # Admin: Order management (mark served, etc.)
│   ├── OrderHistory.jsx        # Admin: Past orders
│   ├── QuantityHistory.jsx     # Admin: Order analytics
│   ├── AdminPanel.jsx          # Admin: Menu management dashboard
│   ├── UserLogin.jsx           # User: QR code input & auto-login
│   └── UserOrder.jsx           # User: Ordering interface
│
├── components/
│   ├── AdminLogin.jsx          # Admin authentication form
│   ├── AdminItemForm.jsx       # Form to create menu items
│   ├── AdminItemsList.jsx      # Grid display of menu items
│   ├── QRCodeGenerator.jsx     # QR code generator for tables
│   └── ... (other admin components)
│
├── utils/
│   ├── storage.js              # localStorage + Firebase sync (orders & items)
│   ├── firebase.js             # Firestore CRUD operations
│   ├── indexeddb.js            # IndexedDB for archived orders
│   ├── qrcode.js               # QR code generation utilities
│   ├── tableCounter.js         # Table ID formatting
│   ├── auth.js                 # Admin authentication
│   └── exportUtils.js          # Data export utilities
│
├── index.css                   # Global styles
└── App.module.css              # App layout & tabs

index.html                      # Admin app HTML entry point
index-user.html                 # User app HTML entry point
vite.config.js                  # Vite + environment-based entry point selection
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Firestore database
- Vercel account (for deployment)

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository>
   cd HDFApp
   npm install
   ```

2. **Configure Firebase:**
   - Update `src/utils/firebase.js` with your Firebase project credentials
   - The config is hardcoded in the file; no `.env` needed

3. **Start the admin dev server (default):**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000 (admin app)

4. **For user app development:**
   ```bash
   VITE_MODE=user npm run dev
   ```
   Opens at http://localhost:3000 (user app)

5. **Login credentials (admin):**
   - Password: `admin123` (set in `src/pages/AdminPanel.jsx`)

---

## 🛠️ Development

### Building for Deployment

**Admin project (hdfdapp.vercel.app):**
```bash
npm run build
# Output: dist/index.html
```

**User project (userorder.vercel.app):**
```bash
VITE_MODE=user npm run build
# Output: dist/index-user.html
```

### Scripts
```bash
npm run dev          # Start dev server (admin by default)
npm run build        # Build admin project
npm run preview      # Preview production build locally
```

---

## 🌐 Deployment

### Vercel Setup (Two Projects)

**Project 1: Admin Panel (`hdfdapp.vercel.app`)**
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: None required (Firebase config is in-code)

**Project 2: User Ordering (`userorder.vercel.app`)**
- Build Command: `VITE_MODE=user npm run build && cp dist/index-user.html dist/index.html`
- Output Directory: `dist`
- Environment Variables: None required

**Important:** The build command for Project 2 copies `index-user.html` to `index.html` so Vercel serves the correct entry point.

### Firestore Rules

Both projects share the same Firestore instance. Set these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hotpot_items/{document=**} {
      allow read, write: if true;
    }
    match /hotpot_orders/{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 📊 How It Works

### Order Flow

1. **Customer scans QR code**
   - QR code contains: `https://userorder.vercel.app?code=table_1`
   - URL parameter parsed and auto-fills table number
   - Customer is logged in to UserOrder component

2. **Customer places order**
   - Selects items from menu (fetched from Firebase)
   - Enters quantity and adds to cart
   - Order saved to:
     - localStorage (instant)
     - Firebase Firestore (synced to admin)

3. **Admin reviews order**
   - OrderConfirmation tab shows all orders for the table
   - Real-time polling (every 3 seconds) fetches updates
   - Admin checks items as "served" using checkmark button
   - Status updated in Firebase to `status: 'served'`

4. **Customer sees update**
   - User app polls Firebase every 3 seconds
   - Detects status change (pending → served)
   - Shows green "Ready to Pick Up" section
   - Displays notification: "✅ Soup is ready!"

5. **Checkout**
   - Customer/Admin can mark items as unable to serve
   - Items move to completion when picked up
   - Order history logged for analytics

### Data Collections

**Firebase Firestore Collections:**

`hotpot_items` - Menu items
```javascript
{
  id: "timestamp",
  name: "Spicy Broth",
  cost: 12.99,
  description: "House special broth",
  photo: "data:image/jpeg;base64,...",
  createdAt: "2026-09-04T..."
}
```

`hotpot_orders` - Customer orders
```javascript
{
  id: "timestamp",
  itemName: "Spicy Broth",
  quantity: 2,
  description: "Extra hot",
  unitPrice: 12.99,
  table: 1,
  status: "pending" | "served" | "unable_to_serve",
  createdAt: "2026-09-04T...",
  statusUpdatedAt: "2026-09-04T..."
}
```

---

## 🔧 Configuration

### Firebase Setup
Edit `src/utils/firebase.js` with your project credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### Admin Password
Edit `src/pages/AdminPanel.jsx` (line ~8):
```javascript
const ADMIN_PASSWORD = 'admin123'  // Change this
```

### QR Code URLs
Edit `src/utils/qrcode.js`:
```javascript
const baseUrl = 'https://userorder.vercel.app'  // User app URL
```

---

## 📱 Mobile Responsive Design

The apps are fully responsive with breakpoints at:
- **Desktop:** 1024px+ (full layout)
- **Tablet:** 768px - 1023px (optimized grid)
- **Mobile:** < 480px (single column, touch-friendly)

All CSS uses CSS Modules for scoped styling (no global class name conflicts).

---

## 🔄 Real-Time Updates

Both apps use **polling** for real-time updates:
- Polls every **3-5 seconds**
- Fetches orders from Firebase Firestore
- Local state updates on changes
- Notifications triggered on status change

**Why polling vs. real-time listeners?**
- Simpler implementation
- Predictable network usage
- Works well for restaurant ordering (sub-5s latency acceptable)
- Lower Firebase bandwidth

---

## 💾 Data Persistence

- **localStorage:** Active orders (faster access)
- **Firebase Firestore:** Shared source of truth
- **IndexedDB:** Archived orders (30+ days old, auto-archived)

Orders sync bidirectionally:
```
Add Order
  ├→ Save to localStorage
  └→ Save to Firebase

Update Status
  ├→ Update localStorage
  └→ Update Firebase
```

---

## 🎨 Styling

- **CSS Modules** for component-scoped styles (no naming conflicts)
- **Responsive Design** with CSS Grid and Flexbox
- **Color Palette:**
  - Primary: `#667eea` (purple-blue)
  - Success: `#27ae60` (green)
  - Error: `#e74c3c` (red)
  - Neutral: `#f5f7fa` (light gray)

---

## 📖 Key Components

### Admin Side
- **AdminPanel** → Dashboard with tabs (Home, Orders, History, Admin)
- **OrderConfirmation** → Manage orders, mark as served
- **AdminItemForm** → Create menu items with photos
- **AdminItemsList** → Grid view of menu items
- **QRCodeGenerator** → Generate/print QR codes for tables

### User Side
- **UserLogin** → QR code input + auto-login via URL parameter
- **UserOrder** → Browse menu, place orders, see status updates
- **Notifications** → Toast messages for order status changes

---

## 🐛 Troubleshooting

### Orders not syncing to user app
- Check Firebase Firestore Rules are published
- Verify both apps use same Firebase config
- Check browser console for errors
- Clear localStorage and refresh

### QR codes not linking
- Verify URL in `src/utils/qrcode.js` matches deployed user app URL
- QR code should encode full URL: `https://userorder.vercel.app?code=table_1`

### Images too large (Firebase error)
- Images compressed automatically (max 300px, quality 0.6)
- Check browser console for compression logs
- For very large images, crop/resize before upload

### Order status not updating
- Check admin's server-side fetch is working (3-second poll)
- Verify `updateOrderStatusInFirebase` uses `updateDoc` (not `setDoc`)
- Look for Firebase permission errors in console

---

## 📝 License

Private project for Hotpot Di Focolare restaurant.

---

## 👤 Support

For questions or issues, check:
1. Browser console (F12) for error messages
2. Firebase Console for data/permissions issues
3. Vercel deployment logs for build errors
