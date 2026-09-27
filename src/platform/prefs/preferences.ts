const LOCALE_KEY = "mia.interface.locale";
const TEXT_SIZE_KEY = "mia.interface.text-size";

export const textSizes = ["standard", "large", "extra-large"] as const;

export type TextSize = (typeof textSizes)[number];

const textSizeClasses = {
  standard: "text-base",
  large: "text-lg",
  "extra-large": "text-xl",
} satisfies Record<TextSize, string>;

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Device preferences remain active in memory when browser storage is unavailable.
  }
}

export function readStoredLocale(): string | null {
  return readPreference(LOCALE_KEY);
}

export function storeLocale(locale: string): void {
  writePreference(LOCALE_KEY, locale);
}

export function readTextSize(): TextSize {
  const storedValue = readPreference(TEXT_SIZE_KEY);
  return textSizes.find((textSize) => textSize === storedValue) ?? "standard";
}

export function applyTextSize(textSize: TextSize): void {
  const root = document.documentElement;
  root.classList.remove(...Object.values(textSizeClasses));
  root.classList.add(textSizeClasses[textSize]);
}

export function setTextSize(textSize: TextSize): void {
  applyTextSize(textSize);
  writePreference(TEXT_SIZE_KEY, textSize);
}
