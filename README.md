# AsteRISK  Portal

Vigil - Family Kitchen Inventory App
A premium, Apple-inspired kitchen inventory management system with real-time family collaboration and liquid glass aesthetics.

Phase 1: Foundation & Authentication
Backend Setup (Supabase Cloud)
Households table: Store family units with unique invite codes for joining
Profiles table: User info linked to households (name, avatar, household membership)
Inventory table: Items with status tracking, expiry dates, quantities, and who added them
Row-Level Security: Ensure families can only see their own data
Authentication System
Email/password signup with email verification
Magic link (passwordless) option
Social login (Google initially, expandable to Apple)
New user onboarding: Create a household OR join existing via invite code
Phase 2: Liquid Glass Design System
Visual Identity
Create the SVG refraction filter for glass effects
Glassmorphism card components with frosted backgrounds
Soft gradients and subtle shadows
Smooth Framer Motion animations throughout
Core UI Components
Glass-effect navigation header
Floating action buttons with the liquid effect
Animated item cards with glow states for expiring items
Responsive layout optimized for both mobile and desktop
Phase 3: Inventory Management
Adding Items - Multiple Methods
Quick-Add Presets: Tap common items (Milk, Eggs, Bread, Butter, etc.) for instant adding
Manual Entry: Form for custom items with name, quantity, expiry date
Barcode Scanner: Camera-based scanning with Open Food Facts API lookup for product names
Mock Scanner Button: For testing the scanning UX flow
Item Display
Beautiful list/grid view of all inventory items
Status badges: "In Stock" (green) vs "Out" (subtle)
Amber glow effect on items expiring within 2 days
"Who added this?" with profile avatar and timestamp
"Time since last scan" indicator
Phase 4: One-Tap Removal Mode
The Toggle Experience
Large, prominent toggle at bottom of screen
When activated:
Background morphs to warm amber (#FFBF00, 20% opacity)
Toggle glows to indicate active removal mode
Next item interaction decrements quantity or removes if quantity = 0
Scanning Feedback
Success pulse: Full-screen green (#00FF00) flash animation
CSS haptic simulation: Brief vibration-style animation for tactile feedback
Audio feedback consideration (optional toggle)
Phase 5: Family Collaboration
Household Management
Create new household with auto-generated invite code
Share invite code via copy button or share menu
Join existing household by entering invite code
View all household members with avatars
Real-Time Sync
Supabase Realtime subscriptions for instant updates
When family member scans at home → everyone's list updates immediately
Visual notification when another member makes changes
Perfect for: parent at store seeing live updates from home
Phase 6: Dashboard & Insights
Family Activity Feed
Recent scans with "who" and "when"
Items running low alerts
Expiring soon warnings (amber highlighted)
Quick stats: total items, items expiring this week
Views
List View: Detailed inventory with all info
Grid View: Visual cards with item images
Expiring View: Filtered to show only soon-to-expire items
Technical Notes
Framer Motion for smooth animations
Camera access for barcode scanning (device permission required)
Open Food Facts API integration for product lookups
PWA-ready for installable mobile experience

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aab83d44-e778-473a-81cf-56d38ac411be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
