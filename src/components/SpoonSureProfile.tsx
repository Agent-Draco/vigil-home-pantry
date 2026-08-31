import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSpoonSureProfile } from "@/hooks/useSpoonSureProfile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DIETS = [
  "none",
  "vegetarian",
  "vegan",
  "pescetarian",
  "ketogenic",
  "paleo",
  "gluten free",
];

export const SpoonSureProfile = () => {
  const { user } = useAuth();
  const { profile, loading, upsertProfile } = useSpoonSureProfile(user?.id ?? null);

  const [diet, setDiet] = useState<string>(profile?.diet ?? "none");
  const [allergiesText, setAllergiesText] = useState<string>((profile?.allergies ?? []).join(", "));

  const normalizedAllergies = useMemo(() => {
    return allergiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [allergiesText]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <div className="text-sm font-medium text-foreground mb-2">Diet</div>
          <select
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {DIETS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">Allergies / Intolerances (comma separated)</div>
          <Input
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
            placeholder="peanut, dairy, shellfish"
          />
        </div>
      </div>

      <Button
        disabled={loading || !user}
        onClick={() => upsertProfile({ diet: diet === "none" ? null : diet, allergies: normalizedAllergies })}
        className="w-full"
      >
        Save Profile
      </Button>
    </div>
  );
};
