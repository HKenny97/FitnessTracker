// Barbell plate math. All weights are in a single unit (lb or kg); the caller
// passes the right bar + inventory for that unit. Pure / Node-testable.

export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR_LB = 45;
export const BAR_KG = 20;

export const defaultBar = (unit) => (unit === "kg" ? BAR_KG : BAR_LB);
export const defaultPlates = (unit) => (unit === "kg" ? PLATES_KG : PLATES_LB);

// Greedy plates-per-side to load `target` on a bar of `barWeight`, drawing from
// `inventory` (plate sizes, unlimited count). Returns:
//   perSide: [{ plate, count }]  — plates on EACH side, largest first
//   leftover: weight per side that can't be made with the inventory
//   loadable: the actual achievable bar weight (<= target)
export function platesPerSide(target, barWeight, inventory) {
  const t = Number(target);
  if (!Number.isFinite(t) || t <= barWeight) {
    return { perSide: [], leftover: 0, loadable: barWeight };
  }
  const perSideTarget = (t - barWeight) / 2;
  const plates = [...inventory].sort((a, b) => b - a);
  const perSide = [];
  let remaining = perSideTarget;
  for (const p of plates) {
    const count = Math.floor(remaining / p + 1e-9);
    if (count > 0) {
      perSide.push({ plate: p, count });
      remaining -= count * p;
    }
  }
  remaining = Math.round(remaining * 100) / 100;
  const loaded = perSideTarget - remaining;
  return { perSide, leftover: remaining, loadable: Math.round((barWeight + loaded * 2) * 100) / 100 };
}
