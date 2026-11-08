// The same palette is enforced by the checks on public.profiles.
export const DOT_BODY_COLORS = ['#FFD84D', '#FFB23E', '#7ED957', '#FF8FC7'] as const;
export const DOT_HELMET_COLORS = ['#6A45F5', '#FF5C72', '#2F9BFF', '#7B5CFF', '#7ED957'] as const;
export const DOT_EXTRAS = ['none', 'mohawk', 'ears', 'horns', 'stache'] as const;

export type DotBodyColor = (typeof DOT_BODY_COLORS)[number];
export type DotHelmetColor = (typeof DOT_HELMET_COLORS)[number];
export type DotExtra = (typeof DOT_EXTRAS)[number];

export type DotAppearance = {
  readonly bodyColor: DotBodyColor;
  readonly helmetColor: DotHelmetColor;
  readonly extra: DotExtra;
};

export const DEFAULT_DOT_APPEARANCE: DotAppearance = {
  bodyColor: '#FFD84D',
  helmetColor: '#6A45F5',
  extra: 'none',
};

const isOneOf = <T extends string>(allowed: readonly T[], value: string): value is T =>
  (allowed as readonly string[]).includes(value);

export function parseDotAppearance(raw: {
  bodyColor: string;
  helmetColor: string;
  extra: string;
}): DotAppearance | null {
  const { bodyColor, helmetColor, extra } = raw;
  return isOneOf(DOT_BODY_COLORS, bodyColor) &&
    isOneOf(DOT_HELMET_COLORS, helmetColor) &&
    isOneOf(DOT_EXTRAS, extra)
    ? { bodyColor, helmetColor, extra }
    : null;
}
