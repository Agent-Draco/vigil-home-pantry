import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import asteriskLogo from "@/assets/asterisk.png";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    displayName?: string;
  }>({});
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard", {
          replace: true
        });
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/dashboard", {
          replace: true
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("vigil_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    if (!isLogin && !displayName.trim()) {
      newErrors.displayName = "Please enter your name";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (rememberMe) {
          localStorage.setItem("vigil_remember_email", email);
        } else {
          localStorage.removeItem("vigil_remember_email");
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: displayName
            }
          }
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Welcome to Desmo. Let's set up your kitchen."
        });
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes("User already registered")) {
        message = "An account with this email already exists. Please sign in.";
      } else if (error.message.includes("Invalid login credentials")) {
        message = "Incorrect email or password. Please try again.";
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      // Generate and store state token for CSRF protection
      const state = crypto.randomUUID();
      localStorage.setItem("oauth_state", state);
      localStorage.setItem("oauth_timestamp", Date.now().toString());

      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        options: {
          queryParams: {
            state: state,
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading("apple");
    try {
      // Generate and store state token for CSRF protection
      const state = crypto.randomUUID();
      localStorage.setItem("oauth_state", state);
      localStorage.setItem("oauth_timestamp", Date.now().toString());

      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
        options: {
          queryParams: {
            state: state,
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Apple",
        variant: "destructive"
      });
      setSocialLoading(null);
    }
  };

  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={asteriskLogo}
            alt="AsteRISK"
            className="w-72 h-72 mx-auto mb-2 object-contain"
            width={288}
            height={288}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>

        <GlassCard className="p-6">
          <div className="flex mb-6 gap-2">
            <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-xl font-medium transition-all ${isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Sign In
            </button>
            <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-xl font-medium transition-all ${!isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="displayName" type="text" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-10" />
                </div>
                {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
              </div>}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {isLogin && <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked === true)} />
                <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
                  Remember me
                </Label>
              </div>}

            <motion.button type="submit" disabled={loading} whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </> : isLogin ? "Sign In" : "Create Account"}
            </motion.button>
          </form>

          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={socialLoading === "google"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-white text-gray-900 font-semibold shadow-lg border border-gray-200 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {socialLoading === "google" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {socialLoading === "google" ? "Signing in..." : "Continue with Google"}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleAppleLogin}
              disabled={socialLoading === "apple"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-white text-gray-900 font-semibold shadow-lg border border-gray-200 disabled:opacity-50 flex items-center justify-center gap-3 mt-3"
            >
              {socialLoading === "apple" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 384 512">
                  <path
                    fill="currentColor"
                    d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 46.9 101.4 84.7 100.8 24.3-.2 36.1-18.7 68-18.7 32.7 0 42.1 18.7 67.8 18.7 37 .3 63-63.3 83.2-96.6 6.9-11.3 15.6-27.3 21.6-43.3-66.2-19.8-85-81.9-85-146.9zM255.3 72.1c3.6-21.7-7.7-47.7-19.8-61.9-15.4-16.4-40.7-19.8-59.3-15.3-2.1 24.1 13.7 51.6 28.5 68.2 15.8 17.6 47.1 20.1 50.6-9v18z"
                  />
                </svg>
              )}
              {socialLoading === "apple" ? "Signing in..." : "Continue with Apple"}
            </motion.button>
          </div>
        </GlassCard>
      </motion.div>
    </div>;
};
export default Auth;