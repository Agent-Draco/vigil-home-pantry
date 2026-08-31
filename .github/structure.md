# Project Structure

This document categorizes every file in the repository based on its function in the application.

## Configuration & Environment
- `.env` - Environment variables
- `.gitignore` - Git ignore rules
- `bun.lockb` - Bun lockfile
- `components.json` - Shadcn UI configuration
- `eslint.config.js` - ESLint configuration
- `package-lock.json` - NPM lockfile
- `package.json` - Project dependencies and scripts
- `postcss.config.js` - PostCSS configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.app.json` - TypeScript application configuration
- `tsconfig.json` - Base TypeScript configuration
- `tsconfig.node.json` - TypeScript node configuration
- `vite.config.ts` - Vite build configuration
- `vitest.config.ts` - Vitest test configuration
- `TODO.md` - Project todo list
- `README.md` - Project documentation
- `index.html` - Application entry HTML

## Backend & Database
- `database/marketplace_schema.sql` - Database schema for marketplace features
- `database/spoonsure_schema.sql` - Main application database schema
- `supabase/config.toml` - Supabase local configuration
- `inventory_items_rows.sql` - SQL data seed for inventory
- `setup_marketplace.sql` - SQL script for marketplace setup
- `inventory_rows.csv` - CSV data seed for inventory
- `shopping_list_rows.csv` - CSV data seed for shopping list
- `supabase/migrations/20260116055723_c3244326-23d2-443d-90ff-69abcbd342cf.sql` - Migration file
- `supabase/migrations/20260116055746_9141d7ab-66a2-426f-bc4e-aa6f17b308f1.sql` - Migration file
- `supabase/migrations/20260117102933_5e0eadb3-6c3c-41e0-a511-55865d0bd06b.sql` - Migration file
- `supabase/migrations/20260117103910_66828335-0e62-447d-93bb-a57068d53649.sql` - Migration file
- `supabase/migrations/20260118061650_2a2f7629-dafc-4ba2-a99d-325a94113e5d.sql` - Migration file
- `supabase/migrations/20260118061824_1e4e071a-7015-4734-97b7-64146ad8e275.sql` - Migration file
- `supabase/migrations/20260118061831_a7d2fda1-1de0-4765-91d3-bc2b50da6ffd.sql` - Migration file
- `supabase/migrations/20260119090703_ca8e29d3-4ea8-4bf3-91ec-a2e1dba5c3ef.sql` - Migration file
- `supabase/migrations/20260120000000_add_mfg_batch_fields.sql` - Migration file
- `supabase/migrations/20260129000100_add_medicine_dosage_fields.sql` - Migration file
- `supabase/migrations/20260129000200_ensure_mfg_batch_fields.sql` - Migration file
- `supabase/migrations/20260131000000_create_marketplace_tables.sql` - Migration file

## Authentication & User Management
- `src/pages/Auth.tsx` - Authentication page (Login/Signup)
- `src/pages/Onboarding.tsx` - User onboarding flow
- `src/hooks/useAuth.ts` - Authentication logic hook
- `src/hooks/useHouseholdMembers.ts` - Logic for managing household members
- `src/hooks/useSpoonSureProfile.ts` - User profile logic
- `src/components/SpoonSureProfile.tsx` - Profile component
- `src/components/views/FamilyView.tsx` - View for managing family/household members

## Core Application & Routing
- `src/main.tsx` - React application entry point
- `src/App.tsx` - Main application component and routing
- `src/pages/Index.tsx` - Main dashboard wrapper
- `src/pages/NotFound.tsx` - 404 Not Found page
- `src/vite-env.d.ts` - Vite environment type definitions

## Inventory Management
- `src/components/views/HomeView.tsx` - Home dashboard view
- `src/components/views/InventoryView.tsx` - Full inventory list view
- `src/components/InventoryItem.tsx` - Component representing a single inventory item
- `src/hooks/useInventory.ts` - Main inventory logic hook
- `src/hooks/useKitchenInventory.ts` - Kitchen specific inventory logic
- `src/hooks/useVigilInventory.ts` - Vigil system inventory integration
- `src/components/QuickAddPreset.tsx` - Quick add buttons component
- `src/components/RemovalModeToggle.tsx` - Toggle for item removal mode
- `src/components/RecipeDrawer.tsx` - Drawer for displaying recipes

## Shopping List
- `src/components/views/ShoppingListView.tsx` - Shopping list view
- `src/components/ShoppingListWidget.tsx` - Small widget for shopping list
- `src/hooks/useShoppingList.ts` - Shopping list logic hook

## Scanning & OCR
- `src/components/views/ScanView.tsx` - Scanning interface view
- `src/hooks/useBarcodeScanner.ts` - Barcode scanning logic

## Notifications & Reminders
- `src/components/MedicineDoseReminder.tsx` - Reminder for medicine doses
- `src/components/PopUpReminder.tsx` - General popup reminders
- `src/components/NudgeFeed.tsx` - Feed of nudges/notifications
- `src/components/views/NudgesView.tsx` - View for nudges
- `src/hooks/useExpiryNotifications.ts` - Logic for expiry notifications
- `src/hooks/useEbayNudge.ts` - Logic for eBay suggestion nudges

## Community & Social (Comm)
- `src/components/views/CommView.tsx` - Community marketplace view
- `src/components/EbayListingModal.tsx` - Modal for creating eBay listings

## Settings & Integrations
- `src/components/views/SettingsView.tsx` - Settings page view
- `src/pages/VigilSetup.tsx` - Setup page for Vigil hardware
- `src/pages/Feedback.tsx` - User feedback page
- `src/hooks/useVigilSettings.ts` - Logic for Vigil settings
- `src/integrations/vigil/client.ts` - Vigil API client
- `src/integrations/supabase/client.ts` - Supabase API client
- `src/integrations/supabase/types.ts` - Supabase TypeScript types
- `src/integrations/lovable/index.ts` - Lovable integration

## Logic & Utilities
- `src/lib/utils.ts` - General utility functions
- `src/lib/rulesEngine.ts` - Business rules engine
- `src/lib/spoonacular.ts` - Spoonacular API integration
- `src/contexts/ThemeContext.tsx` - Theme state management
- `src/hooks/use-mobile.tsx` - Hook for mobile detection
- `src/hooks/use-toast.ts` - Hook for toast notifications

## UI Components (Shared)
- `src/components/GlassNav.tsx` - Bottom navigation bar
- `src/components/GlassCard.tsx` - Glassmorphism card component
- `src/components/Header.tsx` - Application header
- `src/components/NavLink.tsx` - Navigation link component
- `src/components/StatsCard.tsx` - Statistics display card
- `src/components/SuccessFlash.tsx` - Success animation component
- `src/index.css` - Global CSS styles
- `src/App.css` - Application specific CSS styles
- `src/components/ui/accordion.tsx` - Accordion component
- `src/components/ui/alert-dialog.tsx` - Alert Dialog component
- `src/components/ui/alert.tsx` - Alert component
- `src/components/ui/aspect-ratio.tsx` - Aspect Ratio component
- `src/components/ui/avatar.tsx` - Avatar component
- `src/components/ui/badge.tsx` - Badge component
- `src/components/ui/breadcrumb.tsx` - Breadcrumb component
- `src/components/ui/button.tsx` - Button component
- `src/components/ui/calendar.tsx` - Calendar component
- `src/components/ui/card.tsx` - Card component
- `src/components/ui/carousel.tsx` - Carousel component
- `src/components/ui/chart.tsx` - Chart component
- `src/components/ui/checkbox.tsx` - Checkbox component
- `src/components/ui/collapsible.tsx` - Collapsible component
- `src/components/ui/command.tsx` - Command component
- `src/components/ui/context-menu.tsx` - Context Menu component
- `src/components/ui/dialog.tsx` - Dialog component
- `src/components/ui/drawer.tsx` - Drawer component
- `src/components/ui/dropdown-menu.tsx` - Dropdown Menu component
- `src/components/ui/form.tsx` - Form component
- `src/components/ui/hover-card.tsx` - Hover Card component
- `src/components/ui/input-otp.tsx` - Input OTP component
- `src/components/ui/input.tsx` - Input component
- `src/components/ui/label.tsx` - Label component
- `src/components/ui/menubar.tsx` - Menubar component
- `src/components/ui/navigation-menu.tsx` - Navigation Menu component
- `src/components/ui/pagination.tsx` - Pagination component
- `src/components/ui/popover.tsx` - Popover component
- `src/components/ui/progress.tsx` - Progress component
- `src/components/ui/radio-group.tsx` - Radio Group component
- `src/components/ui/resizable.tsx` - Resizable component
- `src/components/ui/scroll-area.tsx` - Scroll Area component
- `src/components/ui/select.tsx` - Select component
- `src/components/ui/separator.tsx` - Separator component
- `src/components/ui/sheet.tsx` - Sheet component
- `src/components/ui/sidebar.tsx` - Sidebar component
- `src/components/ui/skeleton.tsx` - Skeleton component
- `src/components/ui/slider.tsx` - Slider component
- `src/components/ui/sonner.tsx` - Sonner component
- `src/components/ui/switch.tsx` - Switch component
- `src/components/ui/table.tsx` - Table component
- `src/components/ui/tabs.tsx` - Tabs component
- `src/components/ui/textarea.tsx` - Textarea component
- `src/components/ui/toast.tsx` - Toast component
- `src/components/ui/toaster.tsx` - Toaster component
- `src/components/ui/toggle-group.tsx` - Toggle Group component
- `src/components/ui/toggle.tsx` - Toggle component
- `src/components/ui/tooltip.tsx` - Tooltip component
- `src/components/ui/use-toast.ts` - Use Toast hook

## Assets
- `src/assets/asterisk.png` - Image asset
- `src/assets/desmo-logo.png` - Image asset
- `src/assets/oldlogo.png` - Image asset
- `public/favicon.ico` - Icon asset
- `public/placeholder.svg` - Image asset
- `public/robots.txt` - SEO asset

## Github Workflows
- `.github/Changes.md` - Changelog
- `.github/Jules_Instructions.md` - Agent instructions

## Testing
- `src/test/setup.ts` - Test setup file
- `src/test/example.test.ts` - Example test file
