import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Headphones } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";

interface ChatMessage {
  id: number;
  sender: "user" | "admin";
  message: string;
  createdAt: string;
}

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);
  const { user } = useAuthStore();
  const t = useT();

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const data = await apiRequest("/api/support/messages");
      if (data.success && data.messages) {
        setMessages(data.messages);
        if (!isOpen) {
          const unread = data.messages.filter((m: ChatMessage) => m.sender === "admin" && !m.isRead).length;
          setUnreadCount(unread);
        }
      }
    } catch {}
    setLoaded(true);
  }, [isOpen]);

  const pollNewMessages = useCallback(async () => {
    try {
      const lastId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      const data = await apiRequest(`/api/support/messages?after=${lastId}`);
      if (data.success && data.messages && data.messages.length > 0) {
        setMessages((prev) => [...prev, ...data.messages]);
        if (!isOpen) {
          const newAdminMsgs = data.messages.filter((m: ChatMessage) => m.sender === "admin").length;
          if (newAdminMsgs > 0) setUnreadCount((c) => c + newAdminMsgs);
        }
      }
    } catch {}
  }, [messages, isOpen]);

  useEffect(() => {
    if (user && !loaded) {
      loadMessages();
    }
  }, [user, loaded]);

  useEffect(() => {
    if (user) {
      pollRef.current = setInterval(pollNewMessages, 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [user, pollNewMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      const data = await apiRequest("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {}
    setSending(false);
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
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full border-2 border-[#0a0e1a] flex items-center justify-center text-[10px] font-bold text-white px-1">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0e1a] animate-pulse" />
          )}
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
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Headphones className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
                <p className="text-sm text-white/40">{t("chat.welcome", { name: user?.displayName || t("chat.guest") })}</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-br-md"
                      : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                  }`}
                >
                  {msg.sender === "admin" && (
                    <p className="text-[10px] font-semibold text-amber-400 mb-0.5">{t("chat.supportAgent")}</p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-black/50" : "text-white/30"}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t("chat.placeholder")}
                className="flex-1 h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
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
