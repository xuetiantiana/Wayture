import { createI18n } from "vue-i18n";
import zhCN from "./zh-CN";
import enUS from "./en-US";

export type Locale = "zh-CN" | "en-US";

const STORAGE_KEY = "wayture.locale";

const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

function detectInitialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved === "zh-CN" || saved === "en-US") return saved;
  return navigator.language?.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}

const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: "zh-CN",
  messages,
});

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

export function toggleLocale() {
  const next: Locale = i18n.global.locale.value === "zh-CN" ? "en-US" : "zh-CN";
  setLocale(next);
}

document.documentElement.lang = i18n.global.locale.value;

export default i18n;
