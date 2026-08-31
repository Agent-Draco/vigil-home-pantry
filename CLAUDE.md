# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asterisk Portal is a household inventory management application built with Vite, React, TypeScript, and Supabase. It tracks inventory items with expiry notifications, shopping lists, barcode scanning, medicine reminders, and family/household management features.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 8080

# Building
npm run build        # Production build
npm run build:dev    # Development build

# Testing
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode

# Linting
npm run lint         # Run ESLint
```

## Architecture

### Dual Supabase Projects

This application uses **two separate Supabase projects**:

1. **Main Supabase** (`src/integrations/supabase/client.ts`) - Auth, profiles, households
   - Tables: `profiles`, `households`, `feedback`, `merge_requests`
   - Handles user authentication and household membership

2. **Vigil Supabase** (`src/integrations/vigil/client.ts`) - Inventory data
   - Tables: `inventory_items`, `listings`, `vigil_settings`
   - Stores all inventory and listing data

When working with inventory or listings, import from `@/integrations/vigil/client`. For auth and profiles, use `@/integrations/supabase/client`.

### Key Directories

- `src/pages/` - Top-level route components (Index, Auth, Landing, Onboarding, etc.)
- `src/components/views/` - Main dashboard views (HomeView, InventoryView, ShoppingListView, etc.)
- `src/components/ui/` - shadcn/ui components
- `src/hooks/` - Custom React hooks for data fetching and state
- `src/integrations/` - External service clients (Supabase)
- `src/lib/` - Utilities and business logic (rulesEngine, spoonacular API)

### Data Flow

- `useAuth` hook manages authentication state, user profile, and household
- Inventory hooks (`useInventory`, `useVigilInventory`) provide CRUD operations with optimistic updates and real-time subscriptions via Supabase channels
- All inventory operations go through the Vigil Supabase client

### UI Patterns

- shadcn/ui components with Tailwind CSS
- Framer Motion for animations
- React Router for navigation with lazy-loaded routes
- React Query for server state management

### Testing

Tests use Vitest with React Testing Library. Test files are colocated with source files using `.test.tsx` suffix. Setup file at `src/test/setup.ts` configures jest-dom matchers and window mocks.

## Additional Documentation

See `.github/` for supplementary details:

- `Jules_Instructions.md` - Important constraints: stick to Shadcn/Tailwind (do not change UI library), this is a PWA (not local environment), do not assume RLS for Supabase as it can cause errors. Note: codebase has mixed styles from multiple AI contributors.
- `structure.md` - Detailed file-by-file breakdown of the entire project structure.
- `Changes.md` - Changelog noting which AI tools contributed to which commits and the dual-database infrastructure (Legacy vs Modern/Vigil).

## Additional Documentation

See `.github/` for more details:
- `Jules_Instructions.md` - Project conventions (UI library, PWA context, RLS notes)
- `structure.md` - Comprehensive file structure reference
- `Changes.md` - Changelog and database migration notes

## Additional Documentation

Additional context and details are available in `.github/`:
- `Changes.md` - Change log and recent modifications
- `Jules_Instructions.md` - Development instructions
- `structure.md` - Project structure documentation