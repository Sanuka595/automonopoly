export const PLAYER_TOKENS = [
  { border: '#E5A93C', bg: '#1A1810', text: '#E5A93C', label: '1' },
  { border: '#5B9BD5', bg: '#0E1724', text: '#5B9BD5', label: '2' },
  { border: '#F59E0B', bg: '#1F170A', text: '#F59E0B', label: '3' },
  { border: '#C084FC', bg: '#191124', text: '#C084FC', label: '4' },
] as const;

export function playerToken(index: number) {
  return PLAYER_TOKENS[index % PLAYER_TOKENS.length] ?? PLAYER_TOKENS[0];
}
