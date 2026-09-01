export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "as", label: "অসমীয়া" },
  { code: "bn", label: "বাংলা" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const copy: Record<LanguageCode, Record<string, string>> = {
  en: { home: "Home", crops: "My Crops", scan: "Scan", cases: "Cases", more: "More", profile: "Profile", experts: "Experts", stores: "Stores", farmers: "Farmers", analytics: "Analytics", save: "Save", back: "Back", language: "Language" },
  hi: { home: "होम", crops: "मेरी फसलें", scan: "स्कैन", cases: "केस", more: "और", profile: "प्रोफ़ाइल", experts: "विशेषज्ञ", stores: "दुकानें", farmers: "किसान", analytics: "विश्लेषण", save: "सहेजें", back: "वापस", language: "भाषा" },
  mr: { home: "मुख्यपृष्ठ", crops: "माझी पिके", scan: "स्कॅन", cases: "प्रकरणे", more: "अधिक", profile: "प्रोफाइल", experts: "तज्ज्ञ", stores: "दुकाने", farmers: "शेतकरी", analytics: "विश्लेषण", save: "जतन करा", back: "मागे", language: "भाषा" },
  as: { home: "হোম", crops: "মোৰ শস্য", scan: "স্কেন", cases: "কেছ", more: "অধিক", profile: "প্ৰফাইল", experts: "বিশেষজ্ঞ", stores: "দোকান", farmers: "কৃষক", analytics: "বিশ্লেষণ", save: "সংৰক্ষণ", back: "উভতি যাওক", language: "ভাষা" },
  bn: { home: "হোম", crops: "আমার ফসল", scan: "স্ক্যান", cases: "কেস", more: "আরও", profile: "প্রোফাইল", experts: "বিশেষজ্ঞ", stores: "দোকান", farmers: "কৃষক", analytics: "বিশ্লেষণ", save: "সংরক্ষণ", back: "পিছনে", language: "ভাষা" },
};

export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const value = window.localStorage.getItem("cropshield-language") as LanguageCode | null;
  return value && copy[value] ? value : "en";
}

export function setStoredLanguage(language: LanguageCode) {
  window.localStorage.setItem("cropshield-language", language);
  document.documentElement.lang = language;
}

export function translate(language: LanguageCode, key: string) {
  return copy[language][key] ?? copy.en[key] ?? key;
}
