import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, QrCode, Mail, KeyRound, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  householdName: string;
  inviteCode: string;
}

export const InviteModal = ({ isOpen, onClose, householdId, householdName, inviteCode }: InviteModalProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"code" | "otp" | "email">("code");
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer for OTP
  useEffect(() => {
    if (!otpExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((otpExpiry.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setOtpCode(null);
        setOtpExpiry(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpExpiry]);

  const generateOTP = async () => {
    setOtpLoading(true);
    try {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("household_invitations")
        .insert({
          household_id: householdId,
          created_by: user.id,
          code,
          expires_at: expiresAt.toISOString(),
        } as any);
      if (error) throw error;

      setOtpCode(code);
      setOtpExpiry(expiresAt);
      toast({ title: "Code generated", description: "Valid for 10 minutes" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const handleEmailInvite = async () => {
    if (!emailTo.trim()) return;
    setEmailSending(true);
    try {
      // Generate an OTP for the email invite
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("household_invitations")
        .insert({
          household_id: householdId,
          created_by: user.id,
          code,
          expires_at: expiresAt.toISOString(),
        } as any);
      if (error) throw error;

      // For now, copy invite text to clipboard since we don't have email sending
      const inviteText = `You've been invited to join "${householdName}" on Asterisk!\n\nUse this one-time code to join: ${code}\nOr use the permanent invite code: ${inviteCode}\n\nThis one-time code expires in 10 minutes.`;
      await navigator.clipboard.writeText(inviteText);

      toast({ title: "Invite copied!", description: `Share the copied invite text with ${emailTo}` });
      setEmailTo("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  };

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  // QR code as a simple SVG-based display of the invite code
  const qrContent = `ASTERISK-INVITE:${inviteCode}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-background rounded-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Invite to {householdName}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {([
              { id: "code" as const, icon: QrCode, label: "Invite Code" },
              { id: "otp" as const, icon: KeyRound, label: "One-Time PIN" },
              { id: "email" as const, icon: Mail, label: "Share" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  tab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {tab === "code" && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">Share this permanent invite code</p>
                <div className="bg-muted rounded-xl p-6">
                  <p className="text-3xl font-mono font-bold tracking-widest text-foreground">{inviteCode}</p>
                </div>
                <button
                  onClick={() => handleCopy(inviteCode)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy Code"}
                </button>
                <p className="text-xs text-muted-foreground">This code never expires. Anyone with it can join.</p>
              </div>
            )}

            {tab === "otp" && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">Generate a 4-digit code valid for 10 minutes</p>
                {otpCode ? (
                  <>
                    <div className="bg-muted rounded-xl p-6">
                      <p className="text-4xl font-mono font-bold tracking-[0.5em] text-foreground">{otpCode}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires in <span className="font-semibold text-foreground">{formatTime(timeLeft)}</span>
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleCopy(otpCode)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy
                      </button>
                      <button
                        onClick={generateOTP}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground font-medium text-sm"
                      >
                        New Code
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={generateOTP}
                    disabled={otpLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                  >
                    {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    Generate Code
                  </button>
                )}
              </div>
            )}

            {tab === "email" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter an email address to prepare an invite message</p>
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="friend@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleEmailInvite}
                  disabled={emailSending || !emailTo.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Copy Invite Message
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  This will copy an invite message with a one-time code to your clipboard
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
