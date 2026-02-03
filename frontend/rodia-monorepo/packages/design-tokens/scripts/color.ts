function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function isHexColor(input: string) {
  const s = input?.trim?.() ?? "";
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
}

function expandHex(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length === 3) {
    const r = raw[0] + raw[0];
    const g = raw[1] + raw[1];
    const b = raw[2] + raw[2];
    return `#${r}${g}${b}`.toUpperCase();
  }
  return `#${raw}`.toUpperCase();
}

export function hexToRgb(hex: string) {
  if (!isHexColor(hex)) return null;
  const full = expandHex(hex);
  const raw = full.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

// Returns: "H S% L%" (Shadcn-friendly) or null
export function hexToHslTriplet(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h = h * 60;
    if (h < 0) h += 360;
  }

  const H = Math.round(clamp(h, 0, 360));
  const S = Math.round(clamp(s * 100, 0, 100));
  const L = Math.round(clamp(l * 100, 0, 100));
  return `${H} ${S}% ${L}%`;
}
