import { useState } from "react";
import { Globe } from "lucide-react";
import { LANGUAGES, useI18nStore, type Lang } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18nStore();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
      >
        <Globe className="w-3.5 h-3.5 text-white/50" />
        <span className="text-xs font-semibold text-white/70">{current.flag}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-[80] bg-[#111827] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  lang === l.code ? "bg-amber-500/10 text-amber-400" : "text-white/60 hover:bg-white/5"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
