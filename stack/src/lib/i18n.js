import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import hi from "@/locales/hi.json";
import pt from "@/locales/pt.json";
import zh from "@/locales/zh.json";

export const supportedLanguages = [
  { code: "en", labelKey: "language.english" },
  { code: "es", labelKey: "language.spanish" },
  { code: "hi", labelKey: "language.hindi" },
  { code: "pt", labelKey: "language.portuguese" },
  { code: "zh", labelKey: "language.chinese" },
  { code: "fr", labelKey: "language.french" },
];

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      hi: { translation: hi },
      pt: { translation: pt },
      zh: { translation: zh },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
