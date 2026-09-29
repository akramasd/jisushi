-- ============================================================================
-- AUTO-ACCEPT I DAG (MIDLERTIDIG): webordrer springer ejer-bekræftelsen over
-- og går DIREKTE til køkkenet som 'accepted'.
--
-- Køres i: Supabase Dashboard → projekt bczgdophgxjltnpzmkic → SQL Editor
--           → New query → indsæt TRIN 1 → Run.
--
-- Sådan virker det: create_web_order opretter fortsat ordren som
-- 'pending_owner_confirmation', men triggeren herunder flipper den til
-- 'accepted' (+ accepted_at) FØR rækken gemmes — men KUN når flaget
-- auto_accept_orders er true. Køkkenportalen ser 'accepted' ordrer direkte.
--
-- Revert i aften: kør TRIN 2 (flag OFF + drop trigger). Ordrer går derefter
-- tilbage til normal ejer-bekræftelse. Intet andet ændres.
--
-- Bivirkninger i dag (kendte, accepterede):
-- - Gælder ALLE ordrer, også fra live-hjemmesiden, så snart flaget er ON.
-- - Ingen "bekræftet"-SMS ved accept (der er intet accept-øjeblik at sende fra).
-- - pickup_minutes kan mangle på auto-accepterede ordrer (køkkenets default gælder).
-- ============================================================================

-- ------------------------------- TRIN 1 ------------------------------------
-- 1) Flag (default OFF = normal adfærd, uændret)
ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS auto_accept_orders BOOLEAN NOT NULL DEFAULT false;

-- 2) Trigger-funktion
CREATE OR REPLACE FUNCTION public.auto_accept_new_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag BOOLEAN;
BEGIN
  SELECT COALESCE(auto_accept_orders, false) INTO flag
  FROM public.restaurant_settings
  WHERE id = 'main';

  IF COALESCE(flag, false) AND NEW.status = 'pending_owner_confirmation' THEN
    NEW.status := 'accepted';
    NEW.accepted_at := NOW();
  END IF;

  RETURN NEW;
END
$$;

-- 3) Trigger (erstatter evt. gammel version)
DROP TRIGGER IF EXISTS trg_auto_accept_new_orders ON public.orders;
CREATE TRIGGER trg_auto_accept_new_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_new_orders();

-- 4) TÆND for i dag (kør denne linje når køkkenet er klar)
UPDATE public.restaurant_settings
SET auto_accept_orders = true
WHERE id = 'main';

-- Tjek: skal vise auto_accept_orders = true
SELECT id, ordering_paused, auto_accept_orders, updated_at
FROM public.restaurant_settings
WHERE id = 'main';


-- ------------------------------- TRIN 2 (I AFTEN) --------------------------
-- Kør disse to linjer for at gå tilbage til normal ejer-bekræftelse:
/*
UPDATE public.restaurant_settings
SET auto_accept_orders = false
WHERE id = 'main';

DROP TRIGGER IF EXISTS trg_auto_accept_new_orders ON public.orders;
*/
