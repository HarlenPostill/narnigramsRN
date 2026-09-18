-- Run these in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. game_events table for real-time event relay
CREATE TABLE IF NOT EXISTS public.game_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id bigint NOT NULL REFERENCES public.games(id),
  player_id bigint NOT NULL REFERENCES public.players(id),
  event_type text NOT NULL,  -- 'peel', 'finish', 'forfeit', 'heartbeat'
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add columns to games table (if not already present)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS seed text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS pool_size smallint DEFAULT 72;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS hand_size smallint DEFAULT 15;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'standard';

-- 3. Add columns to players table (if not already present)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS peak_elo integer DEFAULT 800;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS wins integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS losses integer DEFAULT 0;

-- 4. Enable Realtime on relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- 5. Create finish_game RPC for atomic winner declaration + ELO update
CREATE OR REPLACE FUNCTION public.finish_game(p_game_id bigint, p_winner_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game record;
  v_loser_id bigint;
  v_winner_elo integer;
  v_loser_elo integer;
  v_expected_winner float;
  v_winner_delta integer;
  v_loser_delta integer;
  v_k integer := 32;
BEGIN
  -- Get the game and lock the row
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;

  -- Only process if game is still in_progress
  IF v_game.status != 'in_progress' THEN
    RETURN;
  END IF;

  -- Determine loser
  IF v_game.creator_id = p_winner_id THEN
    v_loser_id := v_game.opponent_id;
  ELSE
    v_loser_id := v_game.creator_id;
  END IF;

  -- Get current ELOs
  SELECT elo INTO v_winner_elo FROM public.players WHERE id = p_winner_id;
  SELECT elo INTO v_loser_elo FROM public.players WHERE id = v_loser_id;

  -- Calculate ELO changes
  v_expected_winner := 1.0 / (1.0 + power(10.0, (v_loser_elo - v_winner_elo)::float / 400.0));
  v_winner_delta := round(v_k * (1.0 - v_expected_winner));
  v_loser_delta := round(v_k * (0.0 - (1.0 - v_expected_winner)));

  -- Update winner
  UPDATE public.players
  SET elo = elo + v_winner_delta,
      peak_elo = GREATEST(peak_elo, elo + v_winner_delta),
      wins = wins + 1
  WHERE id = p_winner_id;

  -- Update loser
  UPDATE public.players
  SET elo = GREATEST(0, elo + v_loser_delta),
      losses = losses + 1
  WHERE id = v_loser_id;

  -- Mark game as finished
  UPDATE public.games
  SET status = 'finished',
      winner_id = p_winner_id
  WHERE id = p_game_id;
END;
$$;

-- 6. Row Level Security for game_events
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read events for their games"
  ON public.game_events FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM public.games
      WHERE creator_id IN (SELECT id FROM public.players WHERE uuid = auth.uid()::text)
         OR opponent_id IN (SELECT id FROM public.players WHERE uuid = auth.uid()::text)
    )
  );

CREATE POLICY "Players can insert events for their games"
  ON public.game_events FOR INSERT
  WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE uuid = auth.uid()::text)
  );
