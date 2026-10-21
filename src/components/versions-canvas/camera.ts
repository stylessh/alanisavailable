// The canvas camera: where the world sits on screen. A world point p lands
// at p * z + (x, y) on screen.
export type Camera = { x: number; y: number; z: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const MIN_ZOOM = 0.04;
export const MAX_ZOOM = 2;
const LIMIT = 1e5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Finite and in bounds, whatever came in (a gesture, a saved layout). */
export function sane(c: Camera): Camera {
  const ok = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);
  return {
    x: clamp(ok(c.x, 0), -LIMIT, LIMIT),
    y: clamp(ok(c.y, 0), -LIMIT, LIMIT),
    z: clamp(ok(c.z, 1), MIN_ZOOM, MAX_ZOOM),
  };
}

/** Zoom by `factor` keeping the screen point (sx, sy) over the same world point. */
export function zoomAt(c: Camera, factor: number, sx: number, sy: number): Camera {
  const z = clamp(c.z * factor, MIN_ZOOM, MAX_ZOOM);
  const k = z / c.z;
  return sane({ x: sx - (sx - c.x) * k, y: sy - (sy - c.y) * k, z });
}

/** The camera that shows `rect` whole and centered in a viewport, with `pad` screen pixels around it. */
export function fit(rect: Rect, vw: number, vh: number, pad = 0): Camera {
  const z = clamp(Math.min((vw - pad * 2) / rect.w, (vh - pad * 2) / rect.h), MIN_ZOOM, MAX_ZOOM);
  return sane({ x: (vw - rect.w * z) / 2 - rect.x * z, y: (vh - rect.h * z) / 2 - rect.y * z, z });
}

/** Partway from a to b, as seen in a viewport centered on (cx, cy). */
export function lerp(a: Camera, b: Camera, t: number, cx: number, cy: number): Camera {
  // zoom eases in log space, so zooming in and out move at the same pace
  const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
  // and the world point under the viewport's center travels in a straight line
  const ax = (cx - a.x) / a.z, ay = (cy - a.y) / a.z;
  const bx = (cx - b.x) / b.z, by = (cy - b.y) / b.z;
  return { x: cx - (ax + (bx - ax) * t) * z, y: cy - (ay + (by - ay) * t) * z, z };
}

const SAVE_VERSION = 1;

export function loadCamera(key: string): Camera | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 500) return null;
    const doc = JSON.parse(raw);
    if (doc?.v !== SAVE_VERSION || typeof doc.camera !== "object") return null;
    const { x, y, z } = doc.camera;
    if (![x, y, z].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return sane({ x, y, z });
  } catch {
    return null;
  }
}

export function saveCamera(key: string, camera: Camera) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: SAVE_VERSION, camera: sane(camera) }));
  } catch {
    // storage full or blocked: the canvas works the same, it just won't remember the view
  }
}
