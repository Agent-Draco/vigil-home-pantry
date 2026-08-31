import { useState, useRef, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Keyboard, X, Loader2, Check, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Gemini API key for AI image analysis
const GEMINI_API_KEY = "AIzaSyD5MIrOUgsyRFQg61hGmRf7BEgjYweqWn8";

const CATEGORY_OPTIONS = [
  "Dairy",
  "Eggs",
  "Gluten",
  "Wheat",
  "Peanuts",
  "Tree Nuts",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
  "Vegan",
  "Vegetarian",
  "Halal",
  "Kosher",
  "Keto",
  "Low Carb",
  "Low Sugar",
  "Low Sodium",
  "Low FODMAP",
];

interface ScanViewProps {
  onAddItem: (item: {
    name: string;
    barcode?: string;
    quantity?: number;
    unit?: string;
    exp?: string;
    mfg?: string;
    item_type?: "food" | "medicine";
    category?: string;
    medicine_is_dosaged?: boolean;
    medicine_dose_amount?: number;
    medicine_dose_unit?: string;
    medicine_dose_times?: string[];
    medicine_timezone?: string;
    medicine_next_dose_at?: string;
  }) => Promise<any>;
}

export const ScanView = ({ onAddItem }: ScanViewProps) => {
  const [mode, setMode] = useState<"choice" | "manual" | "photo" | "cvScan">("choice");

  const [manualName, setManualName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");
  const [manualUnit, setManualUnit] = useState("pcs");
  const [manualMfgDate, setManualMfgDate] = useState("");
  const [manualExpiryDate, setManualExpiryDate] = useState("");
  const [manualItemType, setManualItemType] = useState<"food" | "medicine">("food");
  const [manualCategory, setManualCategory] = useState<string>("");
  const [manualMedicineIsDosaged, setManualMedicineIsDosaged] = useState(false);
  const [manualDoseAmount, setManualDoseAmount] = useState("");
  const [manualDoseUnit, setManualDoseUnit] = useState("tablet");
  const [manualDoseTimesRaw, setManualDoseTimesRaw] = useState("09:00, 21:00");
  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState<string>("");
  const [photoScanResult, setPhotoScanResult] = useState<{ name: string; mfg?: string; exp?: string } | null>(null);
  const [cvScanResult, setCvScanResult] = useState<{ name: string; mfg?: string; exp?: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("");

  const parseDoseTimes = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Keep only basic HH:MM
    return parts.filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  };

  const computeNextDoseAt = (times: string[], now = new Date()) => {
    if (!times.length) return undefined;
    const sorted = [...times].sort();

    for (const t of sorted) {
      const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
      const candidate = new Date(now);
      candidate.setSeconds(0, 0);
      candidate.setHours(hh, mm, 0, 0);
      if (candidate.getTime() > now.getTime()) return candidate.toISOString();
    }

    // Next day at first time
    const [hh, mm] = sorted[0].split(":").map((n) => parseInt(n, 10));
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setSeconds(0, 0);
    next.setHours(hh, mm, 0, 0);
    return next.toISOString();
  };

  const guessItemType = (name: string): "food" | "medicine" => {
    const n = name.toLowerCase();
    if (
      n.includes("tablet") ||
      n.includes("capsule") ||
      n.includes("syrup") ||
      n.includes("ointment") ||
      n.includes("cream") ||
      n.includes("mg") ||
      n.includes("ml") ||
      n.includes("paracetam") ||
      n.includes("ibuprofen") ||
      n.includes("amox")
    ) {
      return "medicine";
    }
    return "food";
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoIntervalRef = useRef<number | null>(null);
  const cvScanIntervalRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const extractDates = (text: string) => {
    const normalized = text.replace(/\s+/g, " ").trim();

    const dateLike = (label: string) => {
      const re = new RegExp(`${label}[^0-9]*(\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2})`, "i");
      const m = normalized.match(re);
      if (m?.[1]) {
        return m[1].replace(/\./g, "-").replace(/\//g, "-");
      }
      return undefined;
    };

    const exp = dateLike("(exp|expiry|expires)");
    const mfg = dateLike("(mfg|mfd|manufactured)");

    return { exp, mfg };
  };

  const safeIsoDate = (raw: any) => {
    if (!raw || typeof raw !== "string") return undefined;
    const s = raw.trim();
    if (!s) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (m) {
      const yyyy = m[1];
      const mm = String(m[2]).padStart(2, "0");
      const dd = String(m[3]).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return undefined;
  };

  /**
   * Detect if there's meaningful content in the camera frame
   * by checking for sufficient variance in pixel data
   */
  const hasContentInFrame = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Sample pixels to check for content (skip alpha channel)
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    const step = 16; // Sample every 16th pixel for performance

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      sum += brightness;
      sumSq += brightness * brightness;
      count++;
    }

    if (count === 0) return false;

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);

    // Check if the image has sufficient variance (not blank/dark)
    // Also check if mean brightness is reasonable (not too dark or too bright)
    const hasVariance = variance > 100; // Enough contrast
    const hasReasonableBrightness = mean > 20 && mean < 240; // Not too dark/bright

    return hasVariance && hasReasonableBrightness;
  };

  /**
   * Send image to Gemini Vision API for analysis
   * Only call this when content is detected in the frame to preserve API usage
   */
  const runGeminiVision = async (base64Image: string): Promise<{
    name?: string;
    mfg?: string;
    exp?: string;
    item_type?: "food" | "medicine";
    category?: string;
    detected: boolean;
  }> => {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analyze this product image and extract information. Return ONLY strict JSON with these keys:
- name: The product name (string or null if not visible)
- mfg: Manufacturing date in YYYY-MM-DD format (string or null if not visible)
- exp: Expiry/Expiration date in YYYY-MM-DD format (string or null if not visible)
- item_type: Either "food" or "medicine" based on the product (string or null if unclear)
- category: One of these categories if applicable: ${CATEGORY_OPTIONS.join(", ")} (string or null if not applicable)
- detected: true if you can clearly see a product/label in the image, false if the image is blank, too blurry, or shows no product

Rules:
- Only extract information you can clearly see on the product label/packaging
- If you cannot see a product clearly, set detected to false
- Dates should be in YYYY-MM-DD format; convert from any other format you see
- For item_type, choose "medicine" if it appears to be medication, supplements, vitamins, or health products
- For item_type, choose "food" for food and beverage products
- Do NOT include dosage information - that will be collected separately from the user
- If information is not visible or unclear, use null`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ]);

      const text = result.response.text();

      // Strip code fences if present
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      return {
        name: typeof parsed?.name === "string" && parsed.name ? parsed.name : undefined,
        mfg: safeIsoDate(parsed?.mfg),
        exp: safeIsoDate(parsed?.exp),
        item_type: parsed?.item_type === "medicine" ? "medicine" : (parsed?.item_type === "food" ? "food" : undefined),
        category: typeof parsed?.category === "string" && parsed.category ? parsed.category : undefined,
        detected: parsed?.detected === true,
      };
    } catch (error) {
      console.error("Gemini Vision error:", error);
      return { detected: false };
    }
  };

  /**
   * Check if camera frame has actual content before sending to API
   * Returns true if the frame has sufficient variance and brightness
   */
  const checkFrameHasContent = useCallback((): { hasContent: boolean; base64Image: string | null } => {
    if (!videoRef.current || !canvasRef.current) {
      return { hasContent: false, base64Image: null };
    }

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return { hasContent: false, base64Image: null };
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { hasContent: false, base64Image: null };
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Check if frame has content
    const hasContent = hasContentInFrame(canvas);

    if (!hasContent) {
      return { hasContent: false, base64Image: null };
    }

    // Convert to base64
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1] || null;
    return { hasContent: true, base64Image: base64 };
  }, []);

  /**
   * Run AI photo scan using Gemini Vision
   * Only sends image to API when content is detected in the frame
   */
  const runPhotoOcrOnce = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Check for content in frame before calling API
    const { hasContent, base64Image } = checkFrameHasContent();

    if (!hasContent || !base64Image) {
      setScanStatus("Point camera at a product...");
      return;
    }

    setLoading(true);
    setScanStatus("Analyzing with AI...");

    try {
      // Use Gemini Vision to analyze the image
      const result = await runGeminiVision(base64Image);

      if (!result.detected) {
        setScanStatus("No product detected. Try again.");
        return;
      }

      // Update state with detected information
      const finalName = result.name?.trim() || manualName.trim() || "Scanned Item";

      if (!manualName.trim() && result.name?.trim()) {
        setManualName(result.name.trim());
      }

      if (result.item_type && result.item_type !== manualItemType) {
        setManualItemType(result.item_type);
        if (result.item_type === "food") {
          setManualMedicineIsDosaged(false);
        }
      }

      if (result.category?.trim()) {
        setManualCategory(result.category.trim());
      }

      if (result.mfg) {
        setManualMfgDate(result.mfg);
      }

      if (result.exp) {
        setManualExpiryDate(result.exp);
      }

      setPhotoScanResult({
        name: finalName,
        mfg: result.mfg,
        exp: result.exp,
      });

      setScanStatus("Product detected! Review and add.");
    } catch (err) {
      console.error("AI Photo scan failed:", err);
      setScanStatus("Scan failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [manualName, manualItemType, checkFrameHasContent]);

  /**
   * Run CV scan using Gemini Vision
   * Only sends image to API when content is detected in the frame
   */
  const runCvScanOcrOnce = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Check for content in frame before calling API
    const { hasContent, base64Image } = checkFrameHasContent();

    if (!hasContent || !base64Image) {
      setScanStatus("Point camera at a product...");
      return;
    }

    setLoading(true);
    setScanStatus("Analyzing with AI...");

    try {
      // Use Gemini Vision to analyze the image
      const result = await runGeminiVision(base64Image);

      if (!result.detected) {
        setScanStatus("No product detected. Try again.");
        return;
      }

      // Update state with detected information
      const finalName = result.name?.trim() || manualName.trim() || "CV Scanned Item";

      if (!manualName.trim() && result.name?.trim()) {
        setManualName(result.name.trim());
      }

      if (result.item_type && result.item_type !== manualItemType) {
        setManualItemType(result.item_type);
        if (result.item_type === "food") {
          setManualMedicineIsDosaged(false);
        }
      }

      if (result.category?.trim()) {
        setManualCategory(result.category.trim());
      }

      if (result.mfg) {
        setManualMfgDate(result.mfg);
      }

      if (result.exp) {
        setManualExpiryDate(result.exp);
      }

      setCvScanResult({
        name: finalName,
        mfg: result.mfg,
        exp: result.exp,
      });

      setScanStatus("Product detected! Review and add.");
    } catch (err) {
      console.error("CV Scan failed:", err);
      setScanStatus("Scan failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [manualName, manualItemType, checkFrameHasContent]);

  const stopCamera = useCallback(() => {
    const s = mediaStreamRef.current;
    if (s) {
      for (const t of s.getTracks()) t.stop();
    }
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Start camera with proper permission handling
   */
  const startCamera = useCallback(async () => {
    if (mediaStreamRef.current) return;
    if (!videoRef.current) return;

    setCameraError(null);

    try {
      // Check if we're on HTTPS or localhost (required for camera)
      const isSecure = window.location.protocol === 'https:' ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        setCameraError("Camera requires HTTPS or localhost connection.");
        return;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera not supported in this browser.");
        return;
      }

      // Request camera with fallback constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
      } catch (constraintError) {
        // Fallback to simpler constraints
        console.warn("Falling back to basic camera constraints:", constraintError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = () => reject(new Error("Video element error"));
      });

      setCameraError(null);
    } catch (error: any) {
      console.error("Camera access error:", error);

      let errorMessage = "Camera access failed. Please try again.";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = "Camera is in use by another application.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Camera access blocked. Please use HTTPS.";
      }

      setCameraError(errorMessage);
    }
  }, []);

  // Initialize camera when entering photo mode
  useEffect(() => {
    if (mode === "photo") {
      void startCamera();
      setOcrText("");
      setPhotoScanResult(null);
      setScanStatus("Point camera at product and tap 'Scan'");
    }

    return () => {
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
        photoIntervalRef.current = null;
      }
      stopCamera();
    };
  }, [mode, startCamera, stopCamera]);

  // Initialize camera when entering CV scan mode
  useEffect(() => {
    if (mode === "cvScan") {
      void startCamera();
      setOcrText("");
      setCvScanResult(null);
      setScanStatus("Point camera at product and tap 'Scan'");
    }

    return () => {
      if (cvScanIntervalRef.current) {
        clearInterval(cvScanIntervalRef.current);
        cvScanIntervalRef.current = null;
      }
      stopCamera();
    };
  }, [mode, startCamera, stopCamera]);

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualMfgDate.trim() || !manualExpiryDate.trim()) return;

    setLoading(true);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const doseTimes = manualItemType === "medicine" && manualMedicineIsDosaged ? parseDoseTimes(manualDoseTimesRaw) : [];
    const nextDoseAt = manualItemType === "medicine" && manualMedicineIsDosaged ? computeNextDoseAt(doseTimes) : undefined;

    await onAddItem({
      name: manualName.trim(),
      quantity: parseInt(manualQuantity) || 1,
      unit: manualUnit,
      mfg: manualMfgDate.trim(),
      exp: manualExpiryDate.trim(),
      item_type: manualItemType,
      category: manualCategory.trim() || undefined,
      medicine_is_dosaged: manualItemType === "medicine" ? manualMedicineIsDosaged : false,
      medicine_dose_amount: manualItemType === "medicine" && manualMedicineIsDosaged ? Number(manualDoseAmount) || 1 : undefined,
      medicine_dose_unit: manualItemType === "medicine" && manualMedicineIsDosaged ? manualDoseUnit : undefined,
      medicine_dose_times: manualItemType === "medicine" && manualMedicineIsDosaged ? doseTimes : undefined,
      medicine_timezone: manualItemType === "medicine" && manualMedicineIsDosaged ? tz : undefined,
      medicine_next_dose_at: manualItemType === "medicine" && manualMedicineIsDosaged ? nextDoseAt : undefined,
    });

    setManualName("");
    setManualQuantity("1");
    setManualUnit("pcs");
    setManualMfgDate("");
    setManualExpiryDate("");
    setManualItemType("food");
    setManualCategory("");
    setManualMedicineIsDosaged(false);
    setManualDoseAmount("");
    setManualDoseUnit("tablet");
    setManualDoseTimesRaw("09:00, 21:00");
    setCvScanResult(null);
    setMode("choice");
    setLoading(false);
  };

  const handleCloseScanner = () => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
    stopCamera();
    setMode("choice");
  };

  const handleCvSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    setLoading(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const doseTimes = manualItemType === "medicine" && manualMedicineIsDosaged ? parseDoseTimes(manualDoseTimesRaw) : [];
    const nextDoseAt = manualItemType === "medicine" && manualMedicineIsDosaged ? computeNextDoseAt(doseTimes) : undefined;

    await onAddItem({
      name: manualName.trim(),
      quantity: parseInt(manualQuantity) || 1,
      unit: manualUnit,
      mfg: manualMfgDate.trim() || undefined,
      exp: manualExpiryDate.trim() || undefined,
      item_type: manualItemType,
      category: manualCategory.trim() || undefined,
      medicine_is_dosaged: manualItemType === "medicine" ? manualMedicineIsDosaged : false,
      medicine_dose_amount: manualItemType === "medicine" && manualMedicineIsDosaged ? Number(manualDoseAmount) || 1 : undefined,
      medicine_dose_unit: manualItemType === "medicine" && manualMedicineIsDosaged ? manualDoseUnit : undefined,
      medicine_dose_times: manualItemType === "medicine" && manualMedicineIsDosaged ? doseTimes : undefined,
      medicine_timezone: manualItemType === "medicine" && manualMedicineIsDosaged ? tz : undefined,
      medicine_next_dose_at: manualItemType === "medicine" && manualMedicineIsDosaged ? nextDoseAt : undefined,
    });

    setManualName("");
    setManualQuantity("1");
    setManualUnit("pcs");
    setManualMfgDate("");
    setManualExpiryDate("");
    setManualItemType("food");
    setManualCategory("");
    setManualMedicineIsDosaged(false);
    setManualDoseAmount("");
    setManualDoseUnit("tablet");
    setManualDoseTimesRaw("09:00, 21:00");
    setCvScanResult(null);
    setMode("choice");
    setLoading(false);
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {mode === "choice" && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Add Items</h2>
              <p className="text-muted-foreground">Photo scan or enter manually</p>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-4">
              <GlassCard
                onClick={() => setMode("manual")}
                className="flex items-center gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Keyboard className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Manual Entry</h3>
                  <p className="text-sm text-muted-foreground">Add item details by hand</p>
                </div>
              </GlassCard>

              <GlassCard
                onClick={() => setMode("photo")}
                className="flex items-center gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Photo Scan</h3>
                  <p className="text-sm text-muted-foreground">Extracts name, dates, and category</p>
                </div>
              </GlassCard>

              <GlassCard
                onClick={() => setMode("cvScan")}
                className="flex items-center gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">CV Scan</h3>
                  <p className="text-sm text-muted-foreground">AI object identification & date extraction</p>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {mode === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm mx-auto"
          >
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4 text-center">
                Add Item Manually
              </h3>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Organic Milk"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={manualItemType}
                    onChange={(e) => setManualItemType(e.target.value as "food" | "medicine")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="food">Food</option>
                    <option value="medicine">Medicine</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mfg">Mfg</Label>
                  <Input
                    id="mfg"
                    type="date"
                    value={manualMfgDate}
                    onChange={(e) => setManualMfgDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exp">Exp</Label>
                  <Input
                    id="exp"
                    type="date"
                    value={manualExpiryDate}
                    onChange={(e) => setManualExpiryDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                {manualItemType === "medicine" && (
                  <div className="space-y-2">
                    <Label htmlFor="dosaged">Medicine dosing</Label>
                    <select
                      id="dosaged"
                      value={manualMedicineIsDosaged ? "dosaged" : "non"}
                      onChange={(e) => setManualMedicineIsDosaged(e.target.value === "dosaged")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="non">Non-dosaged medicine</option>
                      <option value="dosaged">Dosaged medicine</option>
                    </select>
                  </div>
                )}

                {manualItemType === "medicine" && manualMedicineIsDosaged && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="doseAmount">Dose amount</Label>
                        <Input
                          id="doseAmount"
                          type="number"
                          min="0"
                          step="0.5"
                          value={manualDoseAmount}
                          onChange={(e) => setManualDoseAmount(e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doseUnit">Dose unit</Label>
                        <Input
                          id="doseUnit"
                          value={manualDoseUnit}
                          onChange={(e) => setManualDoseUnit(e.target.value)}
                          placeholder="tablet / ml"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doseTimes">Dose times (HH:MM, comma-separated)</Label>
                      <Input
                        id="doseTimes"
                        value={manualDoseTimesRaw}
                        onChange={(e) => setManualDoseTimesRaw(e.target.value)}
                        placeholder="09:00, 21:00"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={manualQuantity}
                      onChange={(e) => setManualQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <select
                      id="unit"
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="pcs">Pieces</option>
                      <option value="kg">KG</option>
                      <option value="g">Grams</option>
                      <option value="mg">MG</option>
                      <option value="ml">ML</option>
                      <option value="l">Liters</option>
                      <option value="pack-small">Small Pack</option>
                      <option value="pack-medium">Medium Pack</option>
                      <option value="pack-large">Large Pack</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </span>
                  ) : (
                    "Add Item"
                  )}
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {mode === "photo" && (
          <motion.div
            key="photo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm mx-auto"
          >
            <div className="relative">
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
              </div>

              {/* Camera error message */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center p-4">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                    <p className="text-white text-sm">{cameraError}</p>
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-white text-sm mt-2">{scanStatus}</p>
                  </div>
                </div>
              )}

              {/* Status indicator */}
              {scanStatus && !loading && !cameraError && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 rounded-lg px-3 py-2">
                    <p className="text-white text-sm text-center">{scanStatus}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleCloseScanner}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <GlassCard className="p-4 mt-4">
              <div className="space-y-3">
                {/* Scan button */}
                <button
                  type="button"
                  onClick={() => void runPhotoOcrOnce()}
                  disabled={loading || !!cameraError}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </span>
                  ) : (
                    "Scan Product"
                  )}
                </button>

                <div>
                  <Label htmlFor="photoName">Item name</Label>
                  <Input
                    id="photoName"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="AI will detect the name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photoItemType">Type</Label>
                  <select
                    id="photoItemType"
                    value={manualItemType}
                    onChange={(e) => setManualItemType(e.target.value as "food" | "medicine")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="food">Food</option>
                    <option value="medicine">Medicine</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photoCategory">Category</Label>
                  <select
                    id="photoCategory"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {manualItemType === "medicine" && (
                  <div className="space-y-2">
                    <Label htmlFor="photoMedicineDosaged">Medicine dosing</Label>
                    <select
                      id="photoMedicineDosaged"
                      value={manualMedicineIsDosaged ? "dosaged" : "non"}
                      onChange={(e) => setManualMedicineIsDosaged(e.target.value === "dosaged")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="non">Non-dosaged medicine</option>
                      <option value="dosaged">Dosaged medicine</option>
                    </select>
                  </div>
                )}

                {manualItemType === "medicine" && manualMedicineIsDosaged && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="photoDoseAmount">Dose amount</Label>
                        <Input
                          id="photoDoseAmount"
                          type="number"
                          min="0"
                          step="0.5"
                          value={manualDoseAmount}
                          onChange={(e) => setManualDoseAmount(e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="photoDoseUnit">Dose unit</Label>
                        <Input
                          id="photoDoseUnit"
                          value={manualDoseUnit}
                          onChange={(e) => setManualDoseUnit(e.target.value)}
                          placeholder="tablet / ml"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photoDoseTimes">Dose times (HH:MM, comma-separated)</Label>
                      <Input
                        id="photoDoseTimes"
                        value={manualDoseTimesRaw}
                        onChange={(e) => setManualDoseTimesRaw(e.target.value)}
                        placeholder="09:00, 21:00"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="photoMfg">Mfg</Label>
                    <Input
                      id="photoMfg"
                      type="date"
                      value={manualMfgDate}
                      onChange={(e) => setManualMfgDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <Label htmlFor="photoExp">Exp</Label>
                    <Input
                      id="photoExp"
                      type="date"
                      value={manualExpiryDate}
                      onChange={(e) => setManualExpiryDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="photoQuantity">Quantity</Label>
                    <Input
                      id="photoQuantity"
                      type="number"
                      min="1"
                      value={manualQuantity}
                      onChange={(e) => setManualQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photoUnit">Unit</Label>
                    <select
                      id="photoUnit"
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="pcs">Pieces</option>
                      <option value="kg">KG</option>
                      <option value="g">Grams</option>
                      <option value="mg">MG</option>
                      <option value="ml">ML</option>
                      <option value="l">Liters</option>
                      <option value="pack-small">Small Pack</option>
                      <option value="pack-medium">Medium Pack</option>
                      <option value="pack-large">Large Pack</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading || !manualName.trim() || !manualExpiryDate}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                      const doseTimes = manualItemType === "medicine" && manualMedicineIsDosaged ? parseDoseTimes(manualDoseTimesRaw) : [];
                      const nextDoseAt = manualItemType === "medicine" && manualMedicineIsDosaged ? computeNextDoseAt(doseTimes) : undefined;

                      await onAddItem({
                        name: manualName.trim(),
                        quantity: parseInt(manualQuantity) || 1,
                        unit: manualUnit,
                        mfg: manualMfgDate.trim() || undefined,
                        exp: manualExpiryDate.trim(),
                        item_type: manualItemType,
                        category: manualCategory.trim() || undefined,
                        medicine_is_dosaged: manualItemType === "medicine" ? manualMedicineIsDosaged : false,
                        medicine_dose_amount: manualItemType === "medicine" && manualMedicineIsDosaged ? Number(manualDoseAmount) || 1 : undefined,
                        medicine_dose_unit: manualItemType === "medicine" && manualMedicineIsDosaged ? manualDoseUnit : undefined,
                        medicine_dose_times: manualItemType === "medicine" && manualMedicineIsDosaged ? doseTimes : undefined,
                        medicine_timezone: manualItemType === "medicine" && manualMedicineIsDosaged ? tz : undefined,
                        medicine_next_dose_at: manualItemType === "medicine" && manualMedicineIsDosaged ? nextDoseAt : undefined,
                      });

                      // Reset form
                      setManualName("");
                      setManualQuantity("1");
                      setManualUnit("pcs");
                      setManualMfgDate("");
                      setManualExpiryDate("");
                      setManualItemType("food");
                      setManualCategory("");
                      setManualMedicineIsDosaged(false);
                      setManualDoseAmount("");
                      setManualDoseUnit("tablet");
                      setManualDoseTimesRaw("09:00, 21:00");
                      setPhotoScanResult(null);
                      setMode("choice");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Add Item
                  </span>
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {mode === "cvScan" && (
          <motion.div
            key="cvScan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm mx-auto"
          >
            <div className="relative">
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
              </div>

              {/* Camera error message */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center p-4">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                    <p className="text-white text-sm">{cameraError}</p>
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-white text-sm mt-2">{scanStatus}</p>
                  </div>
                </div>
              )}

              {/* Status indicator */}
              {scanStatus && !loading && !cameraError && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 rounded-lg px-3 py-2">
                    <p className="text-white text-sm text-center">{scanStatus}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  stopCamera();
                  setCvScanResult(null);
                  setMode("choice");
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <GlassCard className="p-4 mt-4">
              <div className="space-y-3">
                {/* Scan button */}
                <button
                  type="button"
                  onClick={() => void runCvScanOcrOnce()}
                  disabled={loading || !!cameraError}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </span>
                  ) : (
                    "Scan Product"
                  )}
                </button>

                <form onSubmit={handleCvSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="cvScanName">Product Name</Label>
                    <Input
                      id="cvScanName"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="AI will detect the name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvScanType">Type</Label>
                    <select
                      id="cvScanType"
                      value={manualItemType}
                      onChange={(e) => setManualItemType(e.target.value as "food" | "medicine")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="food">Food</option>
                      <option value="medicine">Medicine</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvScanCategory">Category</Label>
                    <select
                      id="cvScanCategory"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">None</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cvScanMfg">Mfg</Label>
                      <Input
                        id="cvScanMfg"
                        type="date"
                        value={manualMfgDate}
                        onChange={(e) => setManualMfgDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvScanExp">Exp</Label>
                      <Input
                        id="cvScanExp"
                        type="date"
                        value={manualExpiryDate}
                        onChange={(e) => setManualExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cvScanQuantity">Quantity</Label>
                      <Input
                        id="cvScanQuantity"
                        type="number"
                        min="1"
                        value={manualQuantity}
                        onChange={(e) => setManualQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvScanUnit">Unit</Label>
                      <select
                        id="cvScanUnit"
                        value={manualUnit}
                        onChange={(e) => setManualUnit(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="pcs">Pieces</option>
                        <option value="kg">KG</option>
                        <option value="g">Grams</option>
                        <option value="mg">MG</option>
                        <option value="ml">ML</option>
                        <option value="l">Liters</option>
                        <option value="pack-small">Small Pack</option>
                        <option value="pack-medium">Medium Pack</option>
                        <option value="pack-large">Large Pack</option>
                      </select>
                    </div>
                  </div>

                  {manualItemType === "medicine" && (
                    <div className="space-y-2">
                      <Label htmlFor="cvScanMedicineDosaged">Medicine dosing</Label>
                      <select
                        id="cvScanMedicineDosaged"
                        value={manualMedicineIsDosaged ? "dosaged" : "non"}
                        onChange={(e) => setManualMedicineIsDosaged(e.target.value === "dosaged")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="non">Non-dosaged medicine</option>
                        <option value="dosaged">Dosaged medicine</option>
                      </select>
                    </div>
                  )}

                  {manualItemType === "medicine" && manualMedicineIsDosaged && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="cvScanDoseAmount">Dose amount</Label>
                          <Input
                            id="cvScanDoseAmount"
                            type="number"
                            min="0"
                            step="0.5"
                            value={manualDoseAmount}
                            onChange={(e) => setManualDoseAmount(e.target.value)}
                            placeholder="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvScanDoseUnit">Dose unit</Label>
                          <Input
                            id="cvScanDoseUnit"
                            value={manualDoseUnit}
                            onChange={(e) => setManualDoseUnit(e.target.value)}
                            placeholder="tablet / ml"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cvScanDoseTimes">Dose times (HH:MM, comma-separated)</Label>
                        <Input
                          id="cvScanDoseTimes"
                          value={manualDoseTimesRaw}
                          onChange={(e) => setManualDoseTimesRaw(e.target.value)}
                          placeholder="09:00, 21:00"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !manualName.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Add Item
                    </span>
                  </button>
                </form>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};