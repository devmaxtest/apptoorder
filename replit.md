# RestauMenu — macommande.shop

## Overview
RestauMenu is a multi-tenant SaaS platform for independent restaurants in France, offering a complete ecosystem for online ordering. It includes public menus, customer ordering portals, a Pro back-office for restaurant owners, a financial management suite (MyBusiness), POS integration (HubRise), AI monitoring (COBA), and a master admin console. The platform supports both a free tier for basic presence and paid plans for advanced features like custom domains, HubRise integration, and advertising. The business vision is to empower restaurants with tools to manage their online presence and orders independently, reducing reliance on high-commission marketplaces.

## User Preferences
- Detailed explanations for complex features and architectural decisions.
- Iterative development with clear communication before major changes.
- Maintainable and scalable code.
- Ask before significant changes to overall structure or core functionalities.
- Do not modify `MaxAI COBA` or `HubRise` integration files without explicit instructions.

## System Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript, Wouter, Zustand, TanStack Query v5, Shadcn/ui + Tailwind CSS.
- **Backend**: Express.js + PostgreSQL, Drizzle ORM.
- **Shared**: `shared/schema.ts` for Drizzle schemas, Zod validation, and TypeScript types.
- **Real-time**: WebSocket for order synchronization and notifications.
- **Build**: Vite for development and production.

### Database
- Uses PostgreSQL with Drizzle ORM, comprising 21 tables for managing users, restaurants, orders, menus, loyalty programs, and financial data.

### UI/UX and Theming
- Supports dark/light modes with an orange primary color scheme (`#f97316`).
- The client portal features a responsive menu with a 4-column grid.
- The Pro MyBusiness portal has a dedicated dark theme following Suguval design principles.
- The Admin portal uses standard light/dark themes with Shadcn components.

### Core Features
- **Multi-tenancy**: Each restaurant operates with a unique slug-based URL, isolated data, customizable branding, and custom domain support.
- **Role-based Access**: Differentiates access for Customers, Restaurant Owners (Pro), and Admins.
- **Menu & Order Management**: Comprehensive CRUD for categories and dishes with drag-and-drop reordering, dish options, set menus (formules), real-time order sync, and PDF invoice generation.
- **Pro MyBusiness Portal**: An ERP suite integrated with the COBA API, featuring modules for financial dashboards, purchases, expenses, banking, cash management, and HR. Includes extensive file management capabilities with COBA API integration.
- **Admin Portal**: Centralized management for restaurants, users, orders, HubRise configurations, and system monitoring.
- **Account Management**: Secure password changes and account deletion functionalities for both client and pro users.
- **ChatMaxAI Widget**: A floating AI assistant widget available in Pro and MyBusiness portals, powered by the COBA chat API, offering intelligent assistance and insights.
- **Integrations Management**: Configuration interfaces for HubRise (POS integration) and Stripe (payment processing) within the Pro portal.
- **Stripe Payment Integration**: Supports two-sided payment flows: platform billing for restaurant subscriptions and customer payments to restaurants via their own Stripe accounts.
- **Loyalty Programme**: A configurable per-restaurant loyalty system for earning and redeeming points, integrated into both Pro and Client portals.
- **Custom Domain Routing**: Server-side middleware for mapping custom domains to specific restaurants.
- **Security**: Implements Helmet for HTTP headers, rate limiting, input sanitization, server-side order total validation, role-based authorization, bcrypt for password hashing, and secure object storage proxy.
- **Health & Monitoring**: Provides various API endpoints (`/api/ping`, `/api/health`, `/api/health/schema`, `/api/health/query`) for system health checks and database introspection.

## External Dependencies

- **PostgreSQL**: Primary database.
- **MaxAI COBA**: AI monitoring, business intelligence, and financial API for MyBusiness.
- **HubRise**: POS integration layer for various systems like LEO2, Zelty, Lightspeed, and Tiller.
- **Stripe**: Used for SaaS billing (subscriptions) and customer payment processing for restaurants.
- **Replit OIDC**: Facilitates social login options (Google, GitHub, Apple, X).
- **Cloudflare**: DNS and CDN services for production deployments.
- **Tailwind CSS & Shadcn/ui**: Frontend styling and UI component library.
- **Zustand & TanStack Query v5**: Frontend state management.
- **validator.js**: For input sanitization and validation.
- **jsPDF**: For generating PDF invoices.
- **bcryptjs & Helmet**: For security (password hashing and HTTP headers).