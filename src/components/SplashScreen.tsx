import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Activity,
  Wifi,
  Cpu,
  Battery,
  Signal,
} from "lucide-react";

/**
 * Merged splash screen:
 * - Keeps Block-1 intended aesthetics: stages, CPU spin-slow, shield bounce, terminal boot text
 * - Keeps Block-2 platform compatibility: SplashScreen component + onComplete + inline styling
 */

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number; // optional override
}

type BootLine = { text: string; type?: "amber" | "green"; stage: number };

export const SplashScreen = ({ onComplete, durationMs = 7000 }: SplashScreenProps) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visibleLines, setVisibleLines] = useState<BootLine[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Boot lines based on Block-1 terminal text, but scheduled similarly to Block-2
  const BOOT_LINES: BootLine[] = useMemo(
    () => [
      { text: "> SYST: INIT VGL-043...", stage: 0 },
      { text: "> PROT: EDGE_OCR_READY", stage: 1 },
      { text: "> SYNC: VIGIL_SUPA_ACTIVE", type: "amber", stage: 2 },
      { text: "> STAT: DOMAIN SECURE", type: "green", stage: 3 },
    ],
    []
  );

  useEffect(() => {
    // ---- Stage timeline (mirrors Block-1 logic, but stable on platform) ----
    // stage 0 for ~800ms, stage 1 until ~2800ms, stage 2 until ~4000ms, stage 3 end
    const t0 = window.setTimeout(() => setStage(1), 800);
    const t1 = window.setTimeout(() => setStage(2), 2800);
    const t2 = window.setTimeout(() => setStage(3), 4000);

    // ---- Terminal lines timeline ----
    const lineTimers: number[] = [];
    BOOT_LINES.forEach((line) => {
      // schedule each line appearance near its stage transition for a similar feel
      const delayByStage =
        line.stage === 0 ? 300 : line.stage === 1 ? 1200 : line.stage === 2 ? 3000 : 4200;

      const tid = window.setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
      }, delayByStage);

      lineTimers.push(tid);
    });

    // ---- Progress bar (smooth duration-based fill) ----
    const start = Date.now();
    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) window.clearInterval(progressInterval);
    }, 50);

    // ---- Completion fadeout ----
    const completeTimeout = window.setTimeout(() => {
      setIsComplete(true);
      window.setTimeout(onComplete, 500); // fade out delay
    }, durationMs);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      lineTimers.forEach(window.clearTimeout);
      window.clearInterval(progressInterval);
      window.clearTimeout(completeTimeout);
    };
  }, [BOOT_LINES, durationMs, onComplete]);

  const isSecure = stage >= 3;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-500 ${
        isComplete ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: "#0a0a0a",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Refraction Elements (Block-1) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-10%",
              right: "-10%",
              width: 380,
              height: 380,
              background: "rgba(245, 158, 11, 0.10)",
              filter: "blur(120px)",
              borderRadius: 9999,
              animation: "splash-pulse 2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              left: "-10%",
              width: 380,
              height: 380,
              background: "rgba(16, 185, 129, 0.06)",
              filter: "blur(120px)",
              borderRadius: 9999,
            }}
          />
        </div>

        {/* Industrial Glass Container (merged) */}
        <div
          className="relative overflow-hidden flex flex-col justify-between"
          style={{
            width: "320px",
            height: "600px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "48px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
            padding: "32px",
          }}
        >
          {/* Top Status Bar (merged) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.4 }}>
            <span
              style={{
                fontSize: "10px",
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
              }}
            >
              Node VGL-043
            </span>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Signal className="w-3 h-3 text-white" />
              <Wifi className="w-3 h-3 text-white" />
              <Battery className="w-3 h-3 text-white" />
              <Activity className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Center Node */}
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 96, height: 96 }}>
              {/* glow ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 9999,
                  background: isSecure ? "rgba(16, 185, 129, 0.40)" : "rgba(245, 158, 11, 0.30)",
                  filter: "blur(18px)",
                  transition: "all 1000ms",
                  transform: isSecure ? "scale(1.25)" : "scale(1)",
                  animation: !isSecure ? "splash-pulse 2s ease-in-out infinite" : undefined,
                }}
              />

              {/* node */}
              <div
                style={{
                  position: "relative",
                  width: 96,
                  height: 96,
                  borderRadius: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 700ms",
                  border: isSecure
                    ? "1px solid rgba(16, 185, 129, 0.7)"
                    : "1px solid rgba(245, 158, 11, 0.55)",
                  background: isSecure ? "rgba(16, 185, 129, 1)" : "rgba(0,0,0,0.4)",
                  color: isSecure ? "#000" : "#f59e0b",
                }}
              >
                {isSecure ? (
                  <ShieldCheck
                    className="animate-bounce-short"
                    size={48}
                    style={{ color: "#000" }}
                  />
                ) : (
                  <Cpu
                    className={stage > 0 ? "animate-spin-slow" : ""}
                    size={40}
                    style={{ color: "#f59e0b" }}
                  />
                )}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <h1 style={{ color: "white", fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                Aste<span style={{ color: "#f59e0b" }}>Risk</span>
              </h1>
              <p
                style={{
                  fontSize: 10,
                  marginTop: 6,
                  marginBottom: 0,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontWeight: 600,
                }}
              >
                Safety by Design
              </p>
            </div>
          </div>

          {/* Bottom Terminal + Progress */}
          <div style={{ marginBottom: 32 }}>
            {/* Terminal */}
            <div
              style={{
                fontSize: 11,
                height: 56,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 4,
                color: "rgba(255,255,255,0.55)",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
              }}
            >
              {visibleLines.map((line, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in"
                  style={{
                    color:
                      line.type === "amber"
                        ? "rgba(245,158,11,0.95)"
                        : line.type === "green"
                          ? "rgba(16,185,129,0.95)"
                          : "rgba(255,255,255,0.55)",
                    fontWeight: line.type === "green" ? 800 : 400,
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div
              style={{
                marginTop: 10,
                width: "100%",
                height: 4,
                overflow: "hidden",
                position: "relative",
                background: "rgba(255,255,255,0.10)",
                borderRadius: 9999,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${Math.min(progress, 100)}%`,
                  background: isSecure ? "#10b981" : "#f59e0b",
                  borderRadius: 9999,
                  transition: "all 200ms ease-out",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: 9,
              opacity: 0.2,
              color: "white",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Terra LLC. 2026 | AsteRISK Home 1.0.1
          </div>
        </div>
      </div>

      {/* Inline CSS (platform-safe) */}
      <style>{`
        @keyframes splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 1s ease-in-out infinite;
        }

        @keyframes fadeInLine {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeInLine 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
