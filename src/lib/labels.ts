/** Which side of its plane a label sits on, so it never runs off the field. Pure. */
export type LabelSide = "right" | "left";

/** Extra room a label needs before it moves back, so it doesn't flip back and forth at the edge. */
export const LABEL_SIDE_HYSTERESIS = 24;

export function labelSide(
  was: LabelSide,
  geo: { x: number; fieldWidth: number; labelWidth: number; planeHalf: number; gap: number },
  hysteresis = LABEL_SIDE_HYSTERESIS,
): LabelSide {
  const reach = geo.planeHalf + geo.gap + geo.labelWidth;
  const roomRight = geo.fieldWidth - geo.x - reach;
  const roomLeft = geo.x - reach;
  if (was === "right") return roomRight >= 0 || roomLeft < roomRight ? "right" : "left";
  return roomRight >= hysteresis || roomLeft < 0 && roomRight > roomLeft ? "right" : "left";
}
