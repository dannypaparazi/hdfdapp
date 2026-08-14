# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the **Hotpot Di Focolare** web app.

## Project Overview

A React + Vite web application for managing a restaurant hotpot ordering system. Frontend-only (localStorage for persistence, no backend API required). Customers place orders, admins manage the menu.

**Core Features:**
- **Order Confirmation**: Customers add orders with quantity and special notes
- **Order History**: View past customer orders with photos and details
- **Admin Panel**: Login-protected menu management (create items with photo, description, cost)

## Tech Stack

- **React 18** (functional components, hooks)
- **Vite 5** (dev server, build tool)
- **CSS Modules** (scoped, component-specific styling)
- **Storage**: localStorage (orders and menu items, separate collections)
- **Authentication**: Simple hardcoded admin password (admin123)

## Project Structure

```
src/
  components/
    AdminLogin.jsx                  # Admin login form
    AdminItemForm.jsx               # Form to create menu items
    AdminItemsList.jsx              # Grid display of menu items
    OrdersList.jsx                  # Admin order management (legacy)
  pages/
    OrderConfirmation.jsx           # Customer order form
    OrderHistory.jsx                # View customer orders
    AdminPanel.jsx                  # Admin dashboard
  utils/
    storage.js                      # localStorage management (items & orders)
  App.jsx                           # Main app with tab navigation
  App.module.css                    # App layout and tabs
  index.css                         # Global styles
  main.jsx                          # Entry point
vite.config.js                      # Vite configuration
.claude/launch.json                 # Dev server config (port 3000)
```

## Feature Details

### Customer-Facing (Order Confirmation & History)
- Browse menu (via Order Confirmation page)
- Add items to order with quantity, photo, description
- View order history with timestamps and delete option
- Photos stored as base64 in localStorage

### Admin Panel (after login with admin123)
- Create menu items with:
  - Item name
  - Cost (displayed in $)
  - Description
  - Photo upload
- View all menu items in responsive card grid
- Delete items from menu
- Separate localStorage collection for menu items

## Storage Schema

**Items** (`hotpot_items`)
```javascript
{
  id: "timestamp",
  name: "Item Name",
  cost: 12.99,
  description: "Item details",
  photo: "base64-string"
}
```

**Orders** (`hotpot_orders`)
```javascript
{
  id: "timestamp",
  itemName: "Item Name",
  quantity: 2,
  description: "Special notes",
  photo: "base64-string",
  timestamp: "ISO-string"
}
```

## Development Guidelines

- Use CSS Modules for all component styling (no global class names)
- Keep components in `src/components/` for reuse
- Keep pages in `src/pages/` for top-level routes
- Use localStorage utilities in `src/utils/storage.js` for all data persistence
- Run `npm run dev` to start Vite dev server on http://localhost:3000
- Test all three tabs: Order Confirmation, Order History, Admin

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server (http://localhost:3000)
npm run build                  # Production build (dist/)
npm run preview                # Preview production build locally
```

## Admin Credentials

- **Password**: `admin123` (hardcoded in AdminPanel.jsx)
- Change in `src/pages/AdminPanel.jsx` line 8: `const ADMIN_PASSWORD = 'admin123'`
