import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVigilSettings } from "@/hooks/useVigilSettings";
import { useAuth } from "@/hooks/useAuth";
import { vigilSupabase } from "@/integrations/vigil/client";
import { ArrowLeft, Loader2, Wifi, Check, AlertCircle, Monitor } from "lucide-react";
import desmoLogo from "@/assets/asterisk.png";

interface RegisteredDevice {
  device_serial: string;
  household_id: string;
  created_at: string;
}
const VigilSetup = () => {
  const [deviceSerial, setDeviceSerial] = useState("VGL-");
  const [saving, setSaving] = useState(false);
  const [serialError, setSerialError] = useState("");
  const [registeredDevices, setRegisteredDevices] = useState<RegisteredDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const navigate = useNavigate();
  const {
    householdId,
    saveSettings
  } = useVigilSettings();
  const {
    household,
    loading: authLoading
  } = useAuth();

  // Auto-fill household ID from user's household
  const userHouseholdId = household?.id || "";

  // Fetch registered devices for this household
  useEffect(() => {
    const fetchRegisteredDevices = async () => {
      if (!userHouseholdId) return;
      setLoadingDevices(true);
      try {
        const {
          data,
          error
        } = await vigilSupabase.from("vigil_settings").select("device_serial, household_id, created_at").eq("household_id", userHouseholdId).order("created_at", {
          ascending: false
        });
        if (error) throw error;
        setRegisteredDevices(data || []);
      } catch (error) {
        console.error("Error fetching registered devices:", error);
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchRegisteredDevices();
  }, [userHouseholdId]);

  // Validate device serial format: VGL-XXX (3 numeric digits after VGL-)
  const validateSerial = (serial: string): boolean => {
    const pattern = /^VGL-[0-9]{3}$/;
    return pattern.test(serial);
  };
  const handleSerialChange = (value: string) => {
    // Always uppercase and ensure it starts with VGL-
    let formatted = value.toUpperCase();

    // If user tries to delete VGL-, keep it
    if (!formatted.startsWith("VGL-")) {
      formatted = "VGL-" + formatted.replace("VGL-", "").replace("VGL", "");
    }

    // Only allow numbers after VGL-
    const prefix = "VGL-";
    const suffix = formatted.slice(4).replace(/[^0-9]/g, "");
    formatted = prefix + suffix;

    // Limit to VGL-XXX format (7 chars total)
    if (formatted.length > 7) {
      formatted = formatted.slice(0, 7);
    }
    setDeviceSerial(formatted);
    setSerialError("");
  };
  const handleBack = () => {
    navigate("/");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSerial(deviceSerial)) {
      setSerialError("Please enter a valid device code (VGL-XXX)");
      return;
    }
    if (!userHouseholdId) {
      setSerialError("No household found. Please create or join a household first.");
      return;
    }
    setSaving(true);
    const result = await saveSettings(deviceSerial.trim(), userHouseholdId);
    setSaving(false);
    if (result) {
      navigate("/");
    }
  };
  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background p-4">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="max-w-md mx-auto pt-8">
        {/* Back Button */}
        <motion.button whileHover={{
        scale: 1.05
      }} whileTap={{
        scale: 0.95
      }} onClick={handleBack} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div initial={{
          scale: 0.8
        }} animate={{
          scale: 1
        }} transition={{
          type: "spring",
          duration: 0.6
        }} className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center p-2">
            <img src={desmoLogo} alt="Desmo Logo" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Setup AsteRISK Surface</h1>
          <p className="text-muted-foreground mt-2">Connect your AsteRISK Surface to your household</p>
        </div>

        {/* Current Status */}
        {householdId && <GlassCard className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Currently Connected</p>
              <p className="text-xs text-muted-foreground font-mono">{householdId}</p>
            </div>
          </GlassCard>}

        {/* No Household Warning */}
        {!userHouseholdId && !authLoading && <GlassCard className="mb-6 flex items-center gap-3 border-destructive/50">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">No Household Found</p>
              <p className="text-xs text-muted-foreground">
                Please create or join a household before setting up a device.
              </p>
            </div>
          </GlassCard>}

        {/* Setup Form */}
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="deviceSerial">Device Code</Label>
              <div className="relative">
                <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="deviceSerial" type="text" placeholder="VGL-XXX" value={deviceSerial} onChange={e => handleSerialChange(e.target.value)} className="pl-10 font-mono text-lg tracking-wider" maxLength={7} />
              </div>
              {serialError && <p className="text-sm text-destructive">{serialError}</p>}
              <p className="text-xs text-muted-foreground">Enter the 3-digit code from your AsteRISK Surface (e.g., AST-001)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="householdId">Your Household</Label>
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="font-medium text-foreground text-sm">
                  {household?.name || "No household"}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {userHouseholdId || "Not available"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Your device will be linked to this household automatically
              </p>
            </div>

            <motion.button type="submit" disabled={saving || !validateSerial(deviceSerial) || !userHouseholdId} whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </> : "Connect Device"}
            </motion.button>
          </form>
        </GlassCard>

        {/* Registered Devices */}
        {userHouseholdId && <GlassCard className="mt-6 p-4" delay={0.15}>
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Registered Devices
            </h3>

            {loadingDevices ? <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div> : registeredDevices.length === 0 ? <p className="text-sm text-muted-foreground">
                No devices registered yet. Connect your first Vigil device above.
              </p> : <div className="space-y-3">
                {registeredDevices.map((device, index) => <motion.div key={device.device_serial} initial={{
            opacity: 0,
            x: -10
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: index * 0.1
          }} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Monitor className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {device.device_serial}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(device.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-success" />
                  </motion.div>)}
              </div>}
          </GlassCard>}

        {/* Info Card */}
        <GlassCard className="mt-6 p-4" delay={0.2}>
          <h3 className="font-medium text-foreground mb-2">How it works</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              Your Vigil device scans barcodes and syncs items to the cloud
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              This app syncs in real-time to show your inventory
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              All items are automatically linked to your household
            </li>
          </ul>
        </GlassCard>
      </motion.div>
    </div>;
};
export default VigilSetup;