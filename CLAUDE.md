# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the **Hotpot Di Focolare** web app.

## Project Overview

A React-based web application for managing orders at Hotpot Di Focolare. Frontend-only (localStorage for persistence, no backend API required).

**Features:**
- **Order Confirmation**: Self-service form to add items with photo upload, description, and quantity
- **Order History**: View past orders
- **Admin Panel**: Requires login to view and manage orders

## Tech Stack

- **React** (functional components, hooks)
- **Styling**: TBD (CSS modules, Tailwind, styled-components, etc.)
- **State Management**: React Context or local component state
- **Storage**: localStorage for order persistence
- **Authentication**: Simple admin login (hardcoded or localStorage-based for MVP)

## Project Structure

```
src/
  components/          # Reusable UI components
  pages/               # Page-level components (OrderConfirmation, OrderHistory, Admin)
  context/             # React Context for state management (if needed)
  utils/               # Helpers, constants, localStorage management
  styles/              # Global styles or CSS modules
  App.jsx              # Main app with routing/tabs
public/                # Static assets
```

## Key Features to Build

1. **Order Confirmation Tab**
   - Form: item name, photo upload, description, quantity
   - Save orders to localStorage
   - Success feedback after submission

2. **Order History Tab**
   - Display all saved orders
   - Show item details, photo, quantity, timestamp
   - Option to delete/edit orders

3. **Admin Login**
   - Simple login prompt (username/password)
   - Protect admin panel behind authentication check
   - Store auth state in localStorage (or session)

## Development Guidelines

- **Components first**: Build reusable components, test them in isolation
- **Start with static**: Build the UI structure before adding state/logic
- **localStorage**: Use for all persistence (orders, admin auth)
- **No external APIs**: Everything stays in the browser
- **Mobile-friendly**: Design should work on desktop and mobile

## Commands

```bash
npm install              # Install dependencies (after initial setup)
npm start                # Dev server (usually http://localhost:3000)
npm run build            # Production build
npm test                 # Run tests (if tests are set up)
```

## Before You Start

Ask if unclear:
- Styling framework preference (Tailwind, CSS modules, etc.)?
- Admin credentials approach (hardcoded, prompt each session)?
- Photo handling (base64 in localStorage, or blob preview only)?
- Order data structure (what fields to store)?
