export type AppTheme = {
  accentColor: string;
  backgroundColor: string;
};

export type AppThemeColorField = keyof AppTheme;

type ReadableStorage = {
  getItem: (key: string) => string | null;
};

type WritableStorage = ReadableStorage & {
  setItem: (key: string, value: string) => void;
};

type ThemeStyleVariable =
  | "--accent"
  | "--accent-soft"
  | "--accent-strong"
  | "--app-bg"
  | "--app-bg-soft"
  | "--app-bg-strong"
  | "--surface"
  | "--surface-solid";

export const DEFAULT_APP_THEME: AppTheme = {
  accentColor: "#ee7b72",
  backgroundColor: "#f5e4cf",
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

function normalizeHexColor(value: unknown, fallback: string) {
  return isHexColor(value) ? value.toLowerCase() : fallback;
}

function normalizeAppTheme(value: Partial<AppTheme> | null | undefined): AppTheme {
  return {
    accentColor: normalizeHexColor(value?.accentColor, DEFAULT_APP_THEME.accentColor),
    backgroundColor: normalizeHexColor(value?.backgroundColor, DEFAULT_APP_THEME.backgroundColor),
  };
}

function hexToRgb(hexColor: string) {
  return {
    blue: Number.parseInt(hexColor.slice(5, 7), 16),
    green: Number.parseInt(hexColor.slice(3, 5), 16),
    red: Number.parseInt(hexColor.slice(1, 3), 16),
  };
}

function rgbToHex({ blue, green, red }: { blue: number; green: number; red: number }) {
  const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function mixHexColor(sourceColor: string, targetColor: string, targetWeight: number) {
  const source = hexToRgb(sourceColor);
  const target = hexToRgb(targetColor);
  const weight = Math.min(1, Math.max(0, targetWeight));

  return rgbToHex({
    blue: source.blue + (target.blue - source.blue) * weight,
    green: source.green + (target.green - source.green) * weight,
    red: source.red + (target.red - source.red) * weight,
  });
}

export function getStoredAppTheme(storage: ReadableStorage, storageKey: string) {
  try {
    const storedValue = storage.getItem(storageKey);
    if (!storedValue) {
      return DEFAULT_APP_THEME;
    }

    return normalizeAppTheme(JSON.parse(storedValue) as Partial<AppTheme>);
  } catch {
    return DEFAULT_APP_THEME;
  }
}

export function saveStoredAppTheme(storage: WritableStorage, storageKey: string, theme: AppTheme) {
  storage.setItem(storageKey, JSON.stringify(normalizeAppTheme(theme)));
}

export function getNextAppTheme(theme: AppTheme, field: AppThemeColorField, color: string) {
  return normalizeAppTheme({
    ...theme,
    [field]: color,
  });
}

export function createAppThemeStyle(theme: AppTheme): Record<ThemeStyleVariable, string> {
  const normalizedTheme = normalizeAppTheme(theme);
  const accentSoft = mixHexColor(normalizedTheme.accentColor, "#ffffff", 0.58);
  const accentStrong = mixHexColor(normalizedTheme.accentColor, "#7d4439", 0.32);
  const backgroundSoft = mixHexColor(normalizedTheme.backgroundColor, "#ffffff", 0.45);
  const backgroundStrong = mixHexColor(normalizedTheme.backgroundColor, "#b88763", 0.22);

  return {
    "--accent": normalizedTheme.accentColor,
    "--accent-soft": accentSoft,
    "--accent-strong": accentStrong,
    "--app-bg": normalizedTheme.backgroundColor,
    "--app-bg-soft": backgroundSoft,
    "--app-bg-strong": backgroundStrong,
    "--surface": mixHexColor(normalizedTheme.backgroundColor, "#ffffff", 0.6),
    "--surface-solid": mixHexColor(normalizedTheme.backgroundColor, "#ffffff", 0.72),
  };
}
