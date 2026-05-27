import { createI18n } from "vue-i18n";
import zhCN from "./zh-CN";
import enUS from "./en-US";
const STORAGE_KEY = "wayture.locale";
const messages = {
    "zh-CN": zhCN,
    "en-US": enUS,
};
function detectInitialLocale() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en-US")
        return saved;
    return "en-US";
}
const i18n = createI18n({
    legacy: false,
    locale: detectInitialLocale(),
    fallbackLocale: "en-US",
    messages,
});
export function setLocale(locale) {
    i18n.global.locale.value = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
}
export function toggleLocale() {
    const next = i18n.global.locale.value === "zh-CN" ? "en-US" : "zh-CN";
    setLocale(next);
}
document.documentElement.lang = i18n.global.locale.value;
export default i18n;
//# sourceMappingURL=index.js.map