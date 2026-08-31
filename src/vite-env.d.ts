/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOONACULAR_API_KEY?: string;
  readonly VITE_PHOTO_SCAN_BETA?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_VISION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

interface MedianBridge {
  ready(callback: () => void): void;
  on(event: string, callback: (data: any) => void): void;
}

interface Window {
  MedianBridge?: MedianBridge;
}
