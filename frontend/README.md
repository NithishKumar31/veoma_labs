# Veoma Labs — Frontend Web Application

Modern, high-contrast React 19 + TypeScript + Vite + Tailwind CSS dashboard and operations portal for Veoma Labs 3D Printing, Designing, Scanning & Technical Training.

## Features
- **Order Management & Live Costing**: Create orders with real-time 3D print costing calculation and pricing engine.
- **Customer Registry**: Customer registration, billing history, and order tracking.
- **Interactive Invoicing & PDF Export**: Official invoice preview with authentic cursive signature, custom typography, and print-ready layout.
- **Financial & Expense Tracking**: Expense logging, daily summaries, workshop financials, and P&L charts.
- **Hardware & Inventory Registry**: 3D printer fleet status and filament inventory monitoring.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode (with Live Hot-Reloading)
Ensure your backend server is running on `http://localhost:8000`, then run:
```bash
npm run dev
```
The frontend will launch at: **http://localhost:5173** (API requests are automatically proxied to the backend on port 8000).

### 3. Production Build
```bash
npm run build
```
Build output will be bundled into the `dist/` directory.

## Backend Repository
- **Backend API**: [https://github.com/NithishKumar31/veoma_backend](https://github.com/NithishKumar31/veoma_backend)
