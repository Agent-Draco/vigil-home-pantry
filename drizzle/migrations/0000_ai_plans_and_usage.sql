-- AI plans, redeemable access codes, usage counters, and server-side role checks.
-- This migration is additive and is applied when the draft is accepted.

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ai_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  monthly_scan_limit integer NOT NULL DEFAULT 10 CHECK (monthly_scan_limit >= 0),
  monthly_nudge_limit integer NOT NULL DEFAULT 10 CHECK (monthly_nudge_limit >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_plans TO authenticated;
GRANT ALL ON public.ai_plans TO service_role;
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active AI plans" ON public.ai_plans
  FOR SELECT TO authenticated USING (active = true);

CREATE TABLE IF NOT EXISTS public.ai_plan_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  plan_id uuid NOT NULL REFERENCES public.ai_plans(id) ON DELETE CASCADE,
  max_redemptions integer NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  redeemed_count integer NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_plan_codes TO service_role;
ALTER TABLE public.ai_plan_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_ai_plans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.ai_plans(id),
  source text NOT NULL DEFAULT 'code',
  assigned_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_ai_plans TO authenticated;
GRANT ALL ON public.user_ai_plans TO service_role;
ALTER TABLE public.user_ai_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their AI plan" ON public.user_ai_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  scan_count integer NOT NULL DEFAULT 0 CHECK (scan_count >= 0),
  nudge_count integer NOT NULL DEFAULT 0 CHECK (nudge_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their AI usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_ai_plan_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  plan_row public.ai_plans%ROWTYPE;
  usage_row public.ai_usage%ROWTYPE;
  current_period date := date_trunc('month', now())::date;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  SELECT p.* INTO plan_row
  FROM public.ai_plans p
  LEFT JOIN public.user_ai_plans u ON u.plan_id = p.id AND u.user_id = current_user_id
  WHERE p.name = 'free'
     OR (u.user_id IS NOT NULL AND (u.expires_at IS NULL OR u.expires_at > now()))
  ORDER BY (p.name = 'free') ASC, p.monthly_scan_limit DESC
  LIMIT 1;

  SELECT * INTO usage_row FROM public.ai_usage
  WHERE user_id = current_user_id AND period_start = current_period;

  RETURN jsonb_build_object(
    'plan', jsonb_build_object('id', plan_row.id, 'name', plan_row.name, 'description', plan_row.description,
      'monthly_scan_limit', plan_row.monthly_scan_limit, 'monthly_nudge_limit', plan_row.monthly_nudge_limit),
    'usage', jsonb_build_object('scan_count', COALESCE(usage_row.scan_count, 0), 'nudge_count', COALESCE(usage_row.nudge_count, 0),
      'period_start', current_period),
    'is_admin', public.has_role(current_user_id, 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_ai_usage(_feature text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_period date := date_trunc('month', now())::date;
  plan_row public.ai_plans%ROWTYPE;
  usage_row public.ai_usage%ROWTYPE;
  used_count integer;
  allowed_limit integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;
  IF _feature NOT IN ('scan', 'nudge') THEN
    RAISE EXCEPTION 'Unsupported AI feature' USING errcode = '22023';
  END IF;

  SELECT p.* INTO plan_row
  FROM public.ai_plans p
  LEFT JOIN public.user_ai_plans u ON u.plan_id = p.id AND u.user_id = current_user_id
  WHERE p.name = 'free'
     OR (u.user_id IS NOT NULL AND (u.expires_at IS NULL OR u.expires_at > now()))
  ORDER BY (p.name = 'free') ASC, p.monthly_scan_limit DESC
  LIMIT 1;

  INSERT INTO public.ai_usage (user_id, period_start)
  VALUES (current_user_id, current_period)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT * INTO usage_row FROM public.ai_usage
  WHERE user_id = current_user_id AND period_start = current_period FOR UPDATE;
  used_count := CASE WHEN _feature = 'scan' THEN usage_row.scan_count ELSE usage_row.nudge_count END;
  allowed_limit := CASE WHEN _feature = 'scan' THEN plan_row.monthly_scan_limit ELSE plan_row.monthly_nudge_limit END;

  IF used_count >= allowed_limit THEN
    RETURN jsonb_build_object('allowed', false, 'feature', _feature, 'used', used_count, 'limit', allowed_limit, 'plan', plan_row.name);
  END IF;

  IF _feature = 'scan' THEN
    UPDATE public.ai_usage SET scan_count = scan_count + 1, updated_at = now()
    WHERE user_id = current_user_id AND period_start = current_period;
  ELSE
    UPDATE public.ai_usage SET nudge_count = nudge_count + 1, updated_at = now()
    WHERE user_id = current_user_id AND period_start = current_period;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'feature', _feature, 'used', used_count + 1, 'limit', allowed_limit, 'plan', plan_row.name);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_ai_plan_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  code_row public.ai_plan_codes%ROWTYPE;
  plan_row public.ai_plans%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode = '42501'; END IF;
  SELECT * INTO code_row FROM public.ai_plan_codes
  WHERE code_hash = md5(upper(trim(_code))) AND (expires_at IS NULL OR expires_at > now())
    AND redeemed_count < max_redemptions FOR UPDATE;
  IF code_row.id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Invalid, expired, or fully redeemed code.'); END IF;
  UPDATE public.ai_plan_codes SET redeemed_count = redeemed_count + 1 WHERE id = code_row.id;
  INSERT INTO public.user_ai_plans (user_id, plan_id, source, updated_at)
  VALUES (current_user_id, code_row.plan_id, 'code', now())
  ON CONFLICT (user_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, source = 'code', expires_at = NULL, updated_at = now();
  SELECT * INTO plan_row FROM public.ai_plans WHERE id = code_row.plan_id;
  RETURN jsonb_build_object('success', true, 'plan', plan_row.name, 'message', 'Plan activated.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_ai_plan(_name text, _description text, _scan_limit integer, _nudge_limit integer)
RETURNS public.ai_plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE created_plan public.ai_plans;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin role required' USING errcode = '42501'; END IF;
  INSERT INTO public.ai_plans (name, description, monthly_scan_limit, monthly_nudge_limit)
  VALUES (lower(trim(_name)), trim(_description), _scan_limit, _nudge_limit)
  RETURNING * INTO created_plan;
  RETURN created_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_ai_code(_code text, _plan_id uuid, _max_redemptions integer, _expires_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE code_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin role required' USING errcode = '42501'; END IF;
  INSERT INTO public.ai_plan_codes (code_hash, plan_id, max_redemptions, expires_at, created_by)
  VALUES (md5(upper(trim(_code))), _plan_id, _max_redemptions, _expires_at, auth.uid())
  RETURNING id INTO code_id;
  RETURN jsonb_build_object('id', code_id, 'code', upper(trim(_code)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_plan_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_ai_plan_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_ai_plan(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_ai_code(text, uuid, integer, timestamptz) TO authenticated;

INSERT INTO public.ai_plans (name, description, monthly_scan_limit, monthly_nudge_limit)
VALUES
  ('free', 'A small monthly allowance for trying AI features.', 5, 5),
  ('plus', 'More scans and personalized kitchen guidance.', 50, 50),
  ('pro', 'A generous allowance for active households.', 200, 200)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'hatsoff2malav@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;