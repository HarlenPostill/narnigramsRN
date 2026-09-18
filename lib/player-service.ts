import { supabase } from "./supabase";

export interface PlayerRecord {
  id: number;
  uuid: string;
  username: string;
  elo: number;
  peak_elo: number;
  wins: number;
  losses: number;
  created_at: string;
}

export async function getOrCreatePlayer(
  uuid: string,
): Promise<PlayerRecord> {
  // Try to find existing player
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("uuid", uuid)
    .single();

  if (existing) return existing as PlayerRecord;

  // Create new player
  const { data: created, error } = await supabase
    .from("players")
    .insert({ uuid, username: `Player${Math.floor(Math.random() * 9999)}` })
    .select()
    .single();

  if (error) throw error;
  return created as PlayerRecord;
}

export async function setUsername(
  playerId: number,
  username: string,
): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ username })
    .eq("id", playerId);

  if (error) throw error;
}

export async function getPlayer(playerId: number): Promise<PlayerRecord> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (error) throw error;
  return data as PlayerRecord;
}
