import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Scan, 
  Bell, 
  Users, 
  ShoppingCart, 
  Leaf, 
  Clock,
  ChevronRight,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";
import asteriskLogo from "@/assets/asterisk.png";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const features = [
  {
    icon: Scan,
    title: "Smart Scanning",
    description: "Scan barcodes or use AI vision to instantly add items with expiry dates auto-calculated"
  },
  {
    icon: Bell,
    title: "Expiry Alerts",
    description: "Get timely notifications before food expires—never waste groceries again"
  },
  {
    icon: Users,
    title: "Family Sharing",
    description: "Share your kitchen inventory with family members in real-time"
  },
  {
    icon: ShoppingCart,
    title: "Smart Shopping",
    description: "Auto-generate shopping lists based on what's running low or expired"
  },
  {
    icon: Leaf,
    title: "Reduce Waste",
    description: "Recipe suggestions using ingredients about to expire"
  },
  {
    icon: Clock,
    title: "Medicine Tracking",
    description: "Track medicine doses with reminders so you never miss a dose"
  }
];

const innovations = [
  {
    icon: Sparkles,
    title: "AI-Powered Recognition",
    description: "Our vision AI identifies products and auto-fills expiry dates based on market standards"
  },
  {
    icon: Shield,
    title: "Community Marketplace",
    description: "Share surplus food with neighbors or find deals on items others are giving away"
  },
  {
    icon: Zap,
    title: "Rules Engine",
    description: "Smart nudges suggest when to sell, donate, or use items before they go to waste"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/households", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={asteriskLogo} 
              alt="Asterisk" 
              className="w-10 h-10 object-contain"
              width={40}
              height={40}
            />
            <span className="text-xl font-semibold text-foreground">Asterisk</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent-foreground mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Reduce food waste by up to 40%</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your Kitchen,{" "}
              <span className="text-primary">Smarter</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track everything in your kitchen—from groceries to medicines. 
              Get expiry alerts, smart shopping lists, and recipe suggestions 
              to reduce waste and save money.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth">
                  Start Free
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                <a href="#features">See How It Works</a>
              </Button>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="glass-card p-8 max-w-lg mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-success" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Organic Milk</p>
                  <p className="text-sm text-muted-foreground">Expires in 3 days</p>
                </div>
                <div className="ml-auto px-3 py-1 rounded-full bg-warning/20 text-warning text-sm font-medium">
                  Use Soon
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Fresh Salmon</p>
                  <p className="text-sm text-muted-foreground">Added to shopping list</p>
                </div>
                <div className="ml-auto px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                  Reorder
                </div>
              </div>
            </div>
            
            {/* Decorative blurs */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete solution for managing your kitchen inventory, 
              reducing waste, and keeping your family organized.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="glass-card p-6 hover:shadow-glass-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Innovations Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">What Makes Us Different</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powered by Innovation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're not just another inventory app—we're building the future of 
              sustainable kitchen management.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {innovations.map((item) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass-card p-12 text-center relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Reduce Waste?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of families who are saving money and helping 
              the planet by tracking their kitchen smarter.
            </p>
            <Button size="lg" className="text-lg px-10 py-6" asChild>
              <Link to="/auth">
                Get Started Free
                <ChevronRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img 
              src={asteriskLogo} 
              alt="Asterisk" 
              className="w-6 h-6 object-contain"
              width={24}
              height={24}
            />
            <span className="text-sm text-muted-foreground">
              © 2025 Asterisk. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
