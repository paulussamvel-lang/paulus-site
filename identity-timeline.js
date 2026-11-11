export const ICE_FRAMES = 36;
export const clamp = value => Math.max(0, Math.min(1, value));
const fade = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
const frameAt = (turn, count) => Math.round(clamp(turn) * count) % count;

export function identityTimeline(progress) {
  const p = clamp(progress);
  return {
    progress: p,
    intro: 1 - fade(.08, .18, p),
    ip: fade(.18, .24, p) * (1 - fade(.60, .68, p)),
    photo: fade(.66, .84, p),
    iceAlpha: 1 - fade(.66, .84, p),
    iceFrame: frameAt(p / .60, ICE_FRAMES)
  };
}
