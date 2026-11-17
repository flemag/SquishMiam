/**
 * Déplacement des yeux vers le curseur : direction centre de la boîte → curseur,
 * magnitude bornée à porteeMax px (les yeux doivent rester dans le visage).
 */
export function regardVers(
  curseurX: number,
  curseurY: number,
  boite: { x: number; y: number; largeur: number; hauteur: number },
  porteeMax = 3
): { dx: number; dy: number } {
  const centreX = boite.x + boite.largeur / 2;
  const centreY = boite.y + boite.hauteur / 2;
  const vx = curseurX - centreX;
  const vy = curseurY - centreY;
  const distance = Math.hypot(vx, vy);
  if (distance === 0) return { dx: 0, dy: 0 };

  const rapport = Math.min(1, distance / (boite.largeur / 2 + boite.hauteur / 2));
  const portee = porteeMax * rapport;
  return { dx: Math.round((vx / distance) * portee), dy: Math.round((vy / distance) * portee) };
}
