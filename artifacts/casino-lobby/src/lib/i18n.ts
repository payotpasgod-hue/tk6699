import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "bn" | "hi";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
];

const translations: Record<Lang, Record<string, string>> = {
  en: {
    "nav.bonus": "Bonus",
    "nav.admin": "Admin",
    "nav.deposit": "Deposit",
    "nav.logout": "Logout",
    "nav.balance": "Balance",
    "nav.refresh": "Refresh",
    "nav.search": "Search games...",
    "nav.adminDashboard": "Admin Dashboard",
    "nav.bonusCenter": "Bonus Center",
    "nav.lobby": "Casino Lobby",

    "login.title": "Sign in to your account",
    "login.phone": "Phone Number",
    "login.password": "Password",
    "login.submit": "Sign In",
    "login.or": "OR",
    "login.google": "Sign in with Google",
    "login.noAccount": "Don't have an account?",
    "login.register": "Register",
    "login.welcomeBack": "Welcome back!",
    "login.loggedInAs": "Logged in as",
    "login.failed": "Login Failed",
    "login.newPlayer": "New Player? Get ৳575 Bonus!",
    "login.freeBonus": "৳19 FREE just for registering — No deposit needed",
    "login.claim": "CLAIM",

    "register.title": "Create your account",
    "register.displayName": "Display Name",
    "register.namePlaceholder": "Your name",
    "register.phonePlaceholder": "01XXXXXXXXX",
    "register.passwordPlaceholder": "Min 6 characters",
    "register.submit": "Register & Get ৳19 Free",
    "register.google": "Sign up with Google",
    "register.hasAccount": "Already have an account?",
    "register.signIn": "Sign In",
    "register.bonus": "Registration Bonus",
    "register.free": "FREE",
    "register.instantCredit": "Instant credit — No deposit required!",
    "register.failed": "Registration Failed",
    "register.bonusAdded": "৳19 Bonus Added!",
    "register.welcome": "Welcome",
    "register.bonusReady": "Your registration bonus is ready.",

    "bottom.all": "All",
    "bottom.slots": "Slots",
    "bottom.live": "Live",
    "bottom.fish": "Fish",
    "bottom.bonus": "Bonus",

    "lobby.hotInBD": "Hot in Bangladesh",
    "lobby.searchResults": "Search Results",
    "lobby.noGames": "No games found",
    "lobby.playNow": "Play Now",
    "lobby.loading": "Loading games...",
    "lobby.allGames": "All Games",

    "bonus.giftBoxes": "Gift Boxes",
    "bonus.luckySpin": "Lucky Spin",
    "bonus.dailyRewards": "Daily Rewards",
    "bonus.hourlyBonus": "Hourly Bonus",

    "common.comingSoon": "Coming Soon",
    "common.error": "Error",
    "common.success": "Success",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.balanceUpdated": "Balance Updated",
    "common.couldNotSync": "Could not sync balance",

    "google.configNeeded": "Google Sign-In requires configuration. Contact admin.",
  },
  bn: {
    "nav.bonus": "বোনাস",
    "nav.admin": "অ্যাডমিন",
    "nav.deposit": "জমা",
    "nav.logout": "লগআউট",
    "nav.balance": "ব্যালেন্স",
    "nav.refresh": "রিফ্রেশ",
    "nav.search": "গেম খুঁজুন...",
    "nav.adminDashboard": "অ্যাডমিন ড্যাশবোর্ড",
    "nav.bonusCenter": "বোনাস সেন্টার",
    "nav.lobby": "ক্যাসিনো লবি",

    "login.title": "আপনার অ্যাকাউন্টে সাইন ইন করুন",
    "login.phone": "ফোন নম্বর",
    "login.password": "পাসওয়ার্ড",
    "login.submit": "সাইন ইন",
    "login.or": "অথবা",
    "login.google": "গুগল দিয়ে সাইন ইন",
    "login.noAccount": "অ্যাকাউন্ট নেই?",
    "login.register": "রেজিস্টার",
    "login.welcomeBack": "আবার স্বাগতম!",
    "login.loggedInAs": "লগইন করেছেন",
    "login.failed": "লগইন ব্যর্থ",
    "login.newPlayer": "নতুন খেলোয়াড়? ৳৫৭৫ বোনাস পান!",
    "login.freeBonus": "রেজিস্ট্রেশনের জন্য ৳১৯ ফ্রি — জমা প্রয়োজন নেই",
    "login.claim": "দাবি",

    "register.title": "আপনার অ্যাকাউন্ট তৈরি করুন",
    "register.displayName": "প্রদর্শন নাম",
    "register.namePlaceholder": "আপনার নাম",
    "register.phonePlaceholder": "01XXXXXXXXX",
    "register.passwordPlaceholder": "সর্বনিম্ন ৬ অক্ষর",
    "register.submit": "রেজিস্টার করুন ও ৳১৯ ফ্রি পান",
    "register.google": "গুগল দিয়ে সাইন আপ",
    "register.hasAccount": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
    "register.signIn": "সাইন ইন",
    "register.bonus": "রেজিস্ট্রেশন বোনাস",
    "register.free": "ফ্রি",
    "register.instantCredit": "তাৎক্ষণিক ক্রেডিট — জমা প্রয়োজন নেই!",
    "register.failed": "রেজিস্ট্রেশন ব্যর্থ",
    "register.bonusAdded": "৳১৯ বোনাস যোগ হয়েছে!",
    "register.welcome": "স্বাগতম",
    "register.bonusReady": "আপনার রেজিস্ট্রেশন বোনাস প্রস্তুত।",

    "bottom.all": "সব",
    "bottom.slots": "স্লট",
    "bottom.live": "লাইভ",
    "bottom.fish": "মাছ",
    "bottom.bonus": "বোনাস",

    "lobby.hotInBD": "বাংলাদেশে জনপ্রিয়",
    "lobby.searchResults": "অনুসন্ধান ফলাফল",
    "lobby.noGames": "কোনো গেম পাওয়া যায়নি",
    "lobby.playNow": "এখন খেলুন",
    "lobby.loading": "গেম লোড হচ্ছে...",
    "lobby.allGames": "সব গেম",

    "bonus.giftBoxes": "গিফট বক্স",
    "bonus.luckySpin": "লাকি স্পিন",
    "bonus.dailyRewards": "দৈনিক পুরস্কার",
    "bonus.hourlyBonus": "ঘণ্টার বোনাস",

    "common.comingSoon": "শীঘ্রই আসছে",
    "common.error": "ত্রুটি",
    "common.success": "সফল",
    "common.close": "বন্ধ",
    "common.cancel": "বাতিল",
    "common.confirm": "নিশ্চিত",
    "common.balanceUpdated": "ব্যালেন্স আপডেট হয়েছে",
    "common.couldNotSync": "ব্যালেন্স সিঙ্ক করা যায়নি",

    "google.configNeeded": "গুগল সাইন-ইন কনফিগারেশন প্রয়োজন। অ্যাডমিনের সাথে যোগাযোগ করুন।",
  },
  hi: {
    "nav.bonus": "बोनस",
    "nav.admin": "एडमिन",
    "nav.deposit": "जमा",
    "nav.logout": "लॉगआउट",
    "nav.balance": "बैलेंस",
    "nav.refresh": "रिफ्रेश",
    "nav.search": "गेम खोजें...",
    "nav.adminDashboard": "एडमिन डैशबोर्ड",
    "nav.bonusCenter": "बोनस सेंटर",
    "nav.lobby": "कैसीनो लॉबी",

    "login.title": "अपने अकाउंट में साइन इन करें",
    "login.phone": "फोन नंबर",
    "login.password": "पासवर्ड",
    "login.submit": "साइन इन",
    "login.or": "या",
    "login.google": "Google से साइन इन",
    "login.noAccount": "अकाउंट नहीं है?",
    "login.register": "रजिस्टर",
    "login.welcomeBack": "वापस स्वागत है!",
    "login.loggedInAs": "के रूप में लॉगिन",
    "login.failed": "लॉगिन विफल",
    "login.newPlayer": "नए खिलाड़ी? ৳575 बोनस पाएं!",
    "login.freeBonus": "रजिस्ट्रेशन के लिए ৳19 मुफ्त — जमा जरूरी नहीं",
    "login.claim": "दावा",

    "register.title": "अपना अकाउंट बनाएं",
    "register.displayName": "डिस्प्ले नाम",
    "register.namePlaceholder": "आपका नाम",
    "register.phonePlaceholder": "01XXXXXXXXX",
    "register.passwordPlaceholder": "न्यूनतम 6 अक्षर",
    "register.submit": "रजिस्टर करें और ৳19 मुफ्त पाएं",
    "register.google": "Google से साइन अप",
    "register.hasAccount": "पहले से अकाउंट है?",
    "register.signIn": "साइन इन",
    "register.bonus": "रजिस्ट्रेशन बोनस",
    "register.free": "मुफ्त",
    "register.instantCredit": "तुरंत क्रेडिट — जमा जरूरी नहीं!",
    "register.failed": "रजिस्ट्रेशन विफल",
    "register.bonusAdded": "৳19 बोनस जोड़ा गया!",
    "register.welcome": "स्वागत है",
    "register.bonusReady": "आपका रजिस्ट्रेशन बोनस तैयार है।",

    "bottom.all": "सभी",
    "bottom.slots": "स्लॉट",
    "bottom.live": "लाइव",
    "bottom.fish": "मछली",
    "bottom.bonus": "बोनस",

    "lobby.hotInBD": "बांग्लादेश में लोकप्रिय",
    "lobby.searchResults": "खोज परिणाम",
    "lobby.noGames": "कोई गेम नहीं मिला",
    "lobby.playNow": "अभी खेलें",
    "lobby.loading": "गेम लोड हो रहे हैं...",
    "lobby.allGames": "सभी गेम",

    "bonus.giftBoxes": "गिफ्ट बॉक्स",
    "bonus.luckySpin": "लकी स्पिन",
    "bonus.dailyRewards": "दैनिक पुरस्कार",
    "bonus.hourlyBonus": "प्रति घंटा बोनस",

    "common.comingSoon": "जल्द आ रहा है",
    "common.error": "त्रुटि",
    "common.success": "सफल",
    "common.close": "बंद करें",
    "common.cancel": "रद्द करें",
    "common.confirm": "पुष्टि करें",
    "common.balanceUpdated": "बैलेंस अपडेट हुआ",
    "common.couldNotSync": "बैलेंस सिंक नहीं हो सका",

    "google.configNeeded": "Google साइन-इन कॉन्फ़िगरेशन आवश्यक। एडमिन से संपर्क करें।",
  },
};

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
    }),
    { name: "tk6699-lang" }
  )
);

export function t(key: string): string {
  const lang = useI18nStore.getState().lang;
  return translations[lang]?.[key] || translations.en[key] || key;
}

export function useT() {
  const lang = useI18nStore((s) => s.lang);
  return (key: string): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };
}
