import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";

type AuthorizationDetails = {
  client?: { name?: string; uri?: string };
  redirect_url?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (authorizationId: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (authorizationId: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (authorizationId: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};

const oauthApi = (supabase.auth as typeof supabase.auth & { oauth?: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAuthorization = async () => {
      if (!authorizationId) {
        setError("This authorization request is missing its identifier.");
        return;
      }
      if (!oauthApi) {
        setError("Agent integrations are not available in this environment yet.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const next = `${window.location.pathname}${window.location.search}`;
        navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      const { data, error: detailsError } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }

      const immediateRedirect = data?.redirect_url;
      if (immediateRedirect && !data?.client) {
        window.location.assign(immediateRedirect);
        return;
      }
      setDetails(data);
    };

    void loadAuthorization();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  const decide = async (approve: boolean) => {
    if (!oauthApi) return;
    setBusy(true);
    const result = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);

    if (result.error) {
      setBusy(false);
      setError(result.error.message);
      return;
    }

    const redirect = result.data?.redirect_url;
    if (!redirect) {
      setBusy(false);
      setError("The authorization server did not return a destination.");
      return;
    }
    window.location.assign(redirect);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        {error ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-foreground">Could not connect agent</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>Return home</Button>
          </div>
        ) : !details ? (
          <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading authorization request…</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent integration request</p>
                <h1 className="text-xl font-semibold text-foreground">
                  Connect {details.client?.name ?? "this agent"}?
                </h1>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              This gives the connected agent read-only access to app orientation and the household context available to your account.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => void decide(true)}>Approve</Button>
              <Button className="flex-1" variant="outline" disabled={busy} onClick={() => void decide(false)}>Deny</Button>
            </div>
          </div>
        )}
      </GlassCard>
    </main>
  );
};

export default OAuthConsent;