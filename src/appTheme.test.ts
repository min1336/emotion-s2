import { describe, expect, it } from "vitest";
import {
  APP_THEME_COLOR_OPTIONS,
  DEFAULT_APP_THEME,
  createAppThemeStyle,
  getNextAppTheme,
  getStoredAppTheme,
  saveStoredAppTheme,
} from "./appTheme";

function createStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  };
}

describe("appTheme", () => {
  it("provides fixed color chip options for background and accent colors", () => {
    expect(APP_THEME_COLOR_OPTIONS.backgroundColor.length).toBeGreaterThanOrEqual(4);
    expect(APP_THEME_COLOR_OPTIONS.accentColor.length).toBeGreaterThanOrEqual(4);
    expect(APP_THEME_COLOR_OPTIONS.backgroundColor[0]).toMatchObject({
      color: DEFAULT_APP_THEME.backgroundColor,
      label: expect.any(String),
    });
    expect(APP_THEME_COLOR_OPTIONS.accentColor[0]).toMatchObject({
      color: DEFAULT_APP_THEME.accentColor,
      label: expect.any(String),
    });
  });

  it("loads a stored theme while falling back from invalid color values", () => {
    const storage = createStorage({
      theme: JSON.stringify({
        accentColor: "#2563eb",
        backgroundColor: "not-a-color",
      }),
    });

    expect(getStoredAppTheme(storage, "theme")).toEqual({
      ...DEFAULT_APP_THEME,
      accentColor: "#2563eb",
    });
  });

  it("saves theme colors and creates scoped css variables", () => {
    const storage = createStorage();
    const theme = {
      accentColor: "#2563eb",
      backgroundColor: "#dbeafe",
    };

    saveStoredAppTheme(storage, "theme", theme);

    expect(getStoredAppTheme(storage, "theme")).toEqual(theme);
    expect(createAppThemeStyle(theme)).toMatchObject({
      "--accent": "#2563eb",
      "--app-bg": "#dbeafe",
    });
  });

  it("updates one theme color without dropping the other one", () => {
    expect(getNextAppTheme(DEFAULT_APP_THEME, "backgroundColor", "#ecfccb")).toEqual({
      ...DEFAULT_APP_THEME,
      backgroundColor: "#ecfccb",
    });
  });
});
