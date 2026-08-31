import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Moon, Shield, LogOut, ChevronRight, Settings, Home, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/InviteModal";
interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  household_id: string | null;
}
interface Household {
  id: string;
  name: string;
  invite_code: string;
}
interface SettingsViewProps {
  profile: Profile | null;
  household: Household | null;
  onSignOut: () => Promise<void>;
}
const settingsItems = [{
  id: "profile",
  icon: User,
  label: "Profile",
  description: "Manage your account"
}, {
  id: "notifications",
  icon: Bell,
  label: "Notifications",
  description: "Configure alerts"
}, {
  id: "appearance",
  icon: Moon,
  label: "Appearance",
  description: "Theme & display"
}, {
  id: "privacy",
  icon: Shield,
  label: "Privacy",
  description: "Data & security"
}];
export const SettingsView = ({
  profile,
  household,
  onSignOut
}: SettingsViewProps) => {
  const navigate = useNavigate();
  const {
    theme,
    setTheme,
    themes
  } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const displayInitial = profile?.display_name?.charAt(0).toUpperCase() || "U";
  return <section>
      <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize your experience</p>
      </motion.div>

      {/* Profile Card */}
      <GlassCard className="mb-6 flex items-center gap-4 cursor-pointer" delay={0.1} onClick={() => navigate('/profile')}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center">
          <span className="text-2xl font-semibold text-primary">{displayInitial}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{profile?.display_name || "User"}</h3>
          <p className="text-sm text-muted-foreground">{household?.name || "No household"}</p>
          <p className="text-xs text-primary mt-1">Manage profile & household →</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </GlassCard>

      {/* Manage Households Card */}
      <GlassCard className="mb-6 flex items-center gap-4 cursor-pointer" delay={0.13} onClick={() => navigate('/households')}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">Manage Households</h4>
          <p className="text-sm text-muted-foreground">Create, join, or switch households</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </GlassCard>

      {/* Vigil Setup Card */}
      <GlassCard className="mb-6 flex items-center gap-4 cursor-pointer" delay={0.15} onClick={() => navigate('/vigil-setup')}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">AsteRISK Surface Setup</h4>
          <p className="text-sm text-muted-foreground">Connect your Raspberry Pi scanner</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </GlassCard>

      {/* Invite Members Card */}
      {household && (
        <GlassCard className="mb-6 flex items-center gap-4 cursor-pointer" delay={0.17} onClick={() => setShowInviteModal(true)}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Invite Members</h4>
            <p className="text-sm text-muted-foreground">OTP, invite code, or share link</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </GlassCard>
      )}

      {/* Settings Items */}
      <div className="space-y-3">
        {/* Profile Section */}
        <GlassCard onClick={() => setActiveSection(activeSection === 'profile' ? null : 'profile')} className="flex items-center gap-4 cursor-pointer" delay={0.2}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Profile</h4>
            <p className="text-sm text-muted-foreground">Manage your account details</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </GlassCard>

        {activeSection === 'profile' && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="px-4 pb-4">
            <GlassCard className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Display Name</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile?.display_name || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Household</Label>
                <p className="text-sm text-muted-foreground mt-1">{household?.name || 'Not set'}</p>
              </div>
            </GlassCard>
          </motion.div>}

        {/* Notifications Section */}
        <GlassCard onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')} className="flex items-center gap-4 cursor-pointer" delay={0.3}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Notifications</h4>
            <p className="text-sm text-muted-foreground">Configure alert preferences</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </GlassCard>

        {activeSection === 'notifications' && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="px-4 pb-4">
            <GlassCard className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Expiry Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when items are expiring</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
                </div>
                <Switch defaultChecked />
              </div>
            </GlassCard>
          </motion.div>}

        {/* Appearance Section */}
        <GlassCard onClick={() => setActiveSection(activeSection === 'appearance' ? null : 'appearance')} className="flex items-center gap-4 cursor-pointer" delay={0.4}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Moon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Appearance</h4>
            <p className="text-sm text-muted-foreground">Theme & display settings</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </GlassCard>

        {activeSection === 'appearance' && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="px-4 pb-4">
            <GlassCard className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map(themeOption => <Button key={themeOption.id} variant={theme === themeOption.id ? "default" : "outline"} size="sm" onClick={() => setTheme(themeOption.id)} className="justify-start">
                      {themeOption.name}
                    </Button>)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">High Contrast</Label>
                  <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                </div>
                <Switch />
              </div>
            </GlassCard>
          </motion.div>}

        {/* Privacy Section */}
        <GlassCard onClick={() => setActiveSection(activeSection === 'privacy' ? null : 'privacy')} className="flex items-center gap-4 cursor-pointer" delay={0.5}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Privacy</h4>
            <p className="text-sm text-muted-foreground">Control your data and privacy</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </GlassCard>

        {activeSection === 'privacy' && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="px-4 pb-4">
            <GlassCard className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help improve the app with usage data</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Privacy Mode</Label>
                  <p className="text-sm text-muted-foreground">Limit data sharing and tracking</p>
                </div>
                <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} />
              </div>
            </GlassCard>
          </motion.div>}
      </div>

      {/* Sign Out Button */}
      <motion.button initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.6
    }} whileHover={{
      scale: 1.02
    }} whileTap={{
      scale: 0.98
    }} onClick={onSignOut} className="w-full mt-8 py-4 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center gap-2 font-semibold">
        <LogOut className="w-5 h-5" />
        Sign Out
      </motion.button>

      {/* Invite Modal */}
      {household && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          householdId={household.id}
          householdName={household.name}
          inviteCode={household.invite_code}
        />
      )}
    </section>;
};