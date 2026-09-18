const K = 32;

/**
 * Calculate new ELO ratings after a game.
 * Returns [newWinnerElo, newLoserElo].
 */
export function calculateElo(
  winnerElo: number,
  loserElo: number,
): { newWinnerElo: number; newLoserElo: number; winnerDelta: number; loserDelta: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerDelta = Math.round(K * (1 - expectedWinner));
  const loserDelta = Math.round(K * (0 - expectedLoser));

  return {
    newWinnerElo: winnerElo + winnerDelta,
    newLoserElo: Math.max(0, loserElo + loserDelta),
    winnerDelta,
    loserDelta,
  };
}

/**
 * Get rank label for an ELO rating.
 */
export function getRank(elo: number): { label: string; color: string } {
  if (elo >= 2000) return { label: "MASTER", color: "#FF2D55" };
  if (elo >= 1600) return { label: "DIAMOND", color: "#5AC8FA" };
  if (elo >= 1200) return { label: "PLATINUM", color: "#8E8E93" };
  if (elo >= 800) return { label: "GOLD", color: "#FFC800" };
  if (elo >= 400) return { label: "SILVER", color: "#C0C0C0" };
  return { label: "BRONZE", color: "#CD7F32" };
}
