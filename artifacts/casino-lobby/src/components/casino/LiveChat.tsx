import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Headphones } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useT } from "@/lib/i18n";

interface ChatMessage {
  id: string;
  sender: "user" | "support";
  text: string;
  time: string;
}

const AUTO_REPLIES: Record<string, string[]> = {
  deposit: [
    "chat.autoDeposit",
  ],
  withdraw: [
    "chat.autoWithdraw",
  ],
  bonus: [
    "chat.autoBonus",
  ],
  game: [
    "chat.autoGame",
  ],
  default: [
    "chat.autoDefault",
  ],
};

function getAutoReplyKey(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("deposit") || lower.includes("জমা") || lower.includes("जमा") || lower.includes("payment") || lower.includes("pay")) return "deposit";
  if (lower.includes("withdraw") || lower.includes("উত্তোলন") || lower.includes("निकासी") || lower.includes("cashout")) return "withdraw";
  if (lower.includes("bonus") || lower.includes("বোনাস") || lower.includes("बोनस") || lower.includes("promo") || lower.includes("offer")) return "bonus";
  if (lower.includes("game") || lower.includes("গেম") || lower.includes("गेम") || lower.includes("slot") || lower.includes("play") || lower.includes("launch")) return "game";
  return "default";
}

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { user } = useAuthStore();
  const t = useT();

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "welcome",
        sender: "support",
        text: t("chat.welcome", { name: user?.displayName || t("chat.guest") }),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    }
  }, [isOpen]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    replyTimerRef.current = setTimeout(() => {
      const replyKey = getAutoReplyKey(text);
      const replies = AUTO_REPLIES[replyKey] || AUTO_REPLIES.default;
      const replyTranslationKey = replies[Math.floor(Math.random() * replies.length)];
      const replyMsg: ChatMessage = {
        id: `support-${Date.now()}`,
        sender: "support",
        text: t(replyTranslationKey),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, replyMsg]);
    }, 1200 + Math.random() * 800);
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <MessageCircle className="w-6 h-6 text-black" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0e1a] animate-pulse" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 w-[340px] sm:w-[380px] h-[480px] bg-[#0d1220] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-sm font-bold text-black">{t("chat.title")}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-600 rounded-full" />
                  <span className="text-xs text-black/70">{t("chat.online")}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-br-md"
                      : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-black/50" : "text-white/30"}`}>{msg.time}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={t("chat.placeholder")}
                className="flex-1 h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
