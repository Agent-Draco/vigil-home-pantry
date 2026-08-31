import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";
import { SplashScreen } from "@/components/SplashScreen";
import { supabase } from "@/integrations/supabase/client";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const HouseholdSelector = lazy(() => import("./pages/HouseholdSelector"));
const VigilSetup = lazy(() => import("./pages/VigilSetup"));
const ProfileManagement = lazy(() => import("./pages/ProfileManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (window.MedianBridge) {
      window.MedianBridge.ready(() => {
        console.log("Median Bridge initialized");
      });

      window.MedianBridge.on("authCallback", async (data: any) => {
        console.log("OAuth callback received:", data);

        const receivedState = data?.state;
        const storedState = localStorage.getItem("oauth_state");
        const storedTimestamp = localStorage.getItem("oauth_timestamp");

        if (receivedState && storedState) {
          if (receivedState !== storedState) {
            console.error("OAuth state mismatch. Possible CSRF attack.");
            return;
          }
          const now = Date.now();
          if (storedTimestamp && now - parseInt(storedTimestamp) > 3600000) {
            console.error("OAuth callback received after 1 hour timeout.");
            localStorage.removeItem("oauth_state");
            localStorage.removeItem("oauth_timestamp");
            return;
          }
          localStorage.removeItem("oauth_state");
          localStorage.removeItem("oauth_timestamp");
        }

        if (data?.access_token && data?.refresh_token) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
            if (error) {
              console.error("Error setting session from Median callback:", error);
            } else {
              console.log("Session updated successfully from Median callback");
            }
          } catch (e) {
            console.error("Exception handling Median auth callback:", e);
          }
        }
      });
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/households" element={<HouseholdSelector />} />
                <Route path="/household/:householdId" element={<Index />} />
                {/* Keep /dashboard for backward compat - redirects to /households */}
                <Route path="/dashboard" element={<HouseholdSelector />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/vigil-setup" element={<VigilSetup />} />
                <Route path="/profile" element={<ProfileManagement />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
