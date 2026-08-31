## Comm Tab Marketplace

- [x] **Re-add Comm Tab implementation (UI + routing)**
- [x] **Recreate `CommView.tsx` (was deleted)**
- [x] **Recreate marketplace schema file (optional, was deleted)**
- [x] **Inventory -> Listing lifecycle integration**
- [x] **Request/handshake workflow**
- [x] **Chat negotiation system**

## Build Stability (Must Be Green)

- [x] **Fix root TypeScript compile error causing cascade**
- [x] **Stop mixing theme systems**
  - [x] Use either `next-themes` everywhere OR local `ThemeContext` everywhere
  - [x] Ensure `src/components/ui/sonner.tsx` matches chosen theme system
- [x] **Fix TypeScript config**
  - [x] Remove restrictive `compilerOptions.types` whitelist unless absolutely needed
  - [x] Ensure `src/vite-env.d.ts` exists and references `vite/client`

## Notes

- If the first error in the Problems panel is fixed, many “cannot find module react/jsx-runtime” style errors will disappear.

# Active Nudges Implementation Plan

## 1. Add Nudges Tab and Navigation
- [ ] Add "nudges" tab to GlassNav.tsx
- [ ] Create NudgesView component in src/components/views/
- [ ] Update Index.tsx to include nudges tab routing

## 2. SpoonSure Profile Management
- [ ] Create SpoonSureProfile component for managing preferences
- [ ] Add database schema for user preferences (allergies, diet type)
- [ ] Integrate profile management in NudgesView
- [ ] Update spoonacular.ts to use profile preferences in API calls

## 3. Active Recipe Nudges
- [ ] Update rulesEngine.ts to generate active recipe nudges
- [ ] Modify NudgeFeed.tsx to handle recipe nudge actions
- [ ] Add recipe suggestion logic based on expiring items

## 4. New Scanning Logic
- [ ] Install required dependencies: tesseract.js, @google/generative-ai, @google-cloud/vision
- [ ] Modify ScanView.tsx to capture photos every 5 seconds
- [ ] Integrate OCR using tesseract.js for text extraction
- [ ] Add Gemini API integration for extracting dates and batch numbers
- [ ] Add Google Vision API for product identification
- [ ] Update scanning UI to show photo capture instead of barcode

## 5. Pop-up Behavior Updates
- [ ] Update PopUpReminder.tsx to track dismissed actions
- [ ] Implement logic to stop showing pop-ups after action unless skipped
- [ ] Add state management for pop-up dismissal preferences