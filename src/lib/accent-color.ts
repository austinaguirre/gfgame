/** localStorage key for the chosen accent (hex #rrggbb). */
export const ACCENT_COLOR_STORAGE_KEY = "brigid-accent-color";

/** Legacy key — migrated once to hex. */
const LEGACY_ACCENT_HUE_KEY = "brigid-accent-hue";

/** Default (~teal-600) to match previous defaults. */
export const DEFAULT_ACCENT_COLOR = "#0d9488";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toLowerCase();
}

/** HSL (h 0–360, s/l 0–100) → #rrggbb — for one-time migration from hue slider. */
export function hslToHex(hIn: number, s: number, l: number): string {
  const h = ((hIn % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function normalizeHex(input: string): string | null {
  const t = input.trim();
  if (HEX_RE.test(t)) return t.toLowerCase();
  return null;
}

export function readStoredAccentColor(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT_COLOR;
  try {
    const raw = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
    if (raw) {
      const n = normalizeHex(raw);
      if (n) return n;
    }
    const legacy = window.localStorage.getItem(LEGACY_ACCENT_HUE_KEY);
    if (legacy !== null) {
      const hue = Number.parseInt(legacy, 10);
      if (Number.isFinite(hue) && hue >= 0 && hue <= 360) {
        const migrated = hslToHex(hue, 65, 46);
        window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, migrated);
        window.localStorage.removeItem(LEGACY_ACCENT_HUE_KEY);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ACCENT_COLOR;
}

export function writeStoredAccentColor(hex: string): void {
  if (typeof window === "undefined") return;
  const n = normalizeHex(hex);
  if (!n) return;
  window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, n);
  window.dispatchEvent(new Event("accent-color-change"));
}
