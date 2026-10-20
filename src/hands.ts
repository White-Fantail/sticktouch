/** Hand Landmarker geometry; deliberately independent of mirroring and UI pixels. */
import type { Landmark, HandAnchors } from "./core";

type HandSide = "left" | "right";
const POSE_WRIST: Record<HandSide, number> = { left: 15, right: 16 };

function usable(point: Landmark | undefined): point is Landmark {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1 &&
    (point.visibility ?? 1) >= 0.5 && (point.presence ?? 1) >= 0.5;
}

/** Wrist + four knuckles, placed inside the palm rather than on the wrist. */
export function palmCenter(hand: readonly Landmark[]): Landmark | null {
  const indices = [0, 5, 9, 13, 17] as const;
  const points = indices.map(index => hand[index]);
  if (!points.every(usable)) return null;
  const [wrist, index, middle, ring, pinky] = points as Landmark[];
  return {
    x: wrist.x * 0.15 + (index.x + middle.x + ring.x + pinky.x) * 0.2125,
    y: wrist.y * 0.15 + (index.y + middle.y + ring.y + pinky.y) * 0.2125
  };
}

/**
 * Match detected hands to the *unmirrored* Pose wrist coordinates.
 * Do not blindly trust handedness labels: hand and pose labeling/mirroring can
 * disagree on front-facing cameras. Nearest valid wrist gives stable identity.
 * Unmatched strangers/false positives never become game hitpoints.
 */
export function matchHandPalms(
  pose: readonly Landmark[] | undefined,
  hands: readonly (readonly Landmark[])[]
): HandAnchors {
  if (!pose || !hands.length) return {};
  const shoulderA = pose[11], shoulderB = pose[12];
  const shoulderWidth = usable(shoulderA) && usable(shoulderB)
    ? Math.hypot(shoulderA.x - shoulderB.x, shoulderA.y - shoulderB.y)
    : 0.17;
  const maxDistance = Math.max(0.12, Math.min(0.36, shoulderWidth * 1.25));
  const candidates: { side: HandSide; hand: number; distance: number; palm: Landmark }[] = [];
  for (const [i, landmarks] of hands.entries()) {
    const wrist = landmarks[0], palm = palmCenter(landmarks);
    if (!usable(wrist) || !palm) continue;
    for (const side of ["left", "right"] as const) {
      const poseWrist = pose[POSE_WRIST[side]];
      if (!usable(poseWrist)) continue;
      const distance = Math.hypot(wrist.x - poseWrist.x, wrist.y - poseWrist.y);
      if (distance <= maxDistance) candidates.push({ side, hand: i, distance, palm });
    }
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const usedHands = new Set<number>(), usedSides = new Set<HandSide>();
  const assigned: HandAnchors = {};
  for (const candidate of candidates) {
    if (usedHands.has(candidate.hand) || usedSides.has(candidate.side)) continue;
    assigned[candidate.side] = candidate.palm;
    usedHands.add(candidate.hand);
    usedSides.add(candidate.side);
  }
  return assigned;
}
