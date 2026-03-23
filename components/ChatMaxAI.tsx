import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X, Trash2, Loader2, Bot, User, Minimize2, Maximize2, GripVertical } from "lucide-react";

const COBA_API_URL = import.meta.env.VITE_COBA_API_URL;
const COBA_API_KEY = import.meta.env.VITE_COBA_API_KEY;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatMaxAIProps {
  tenantId: string;
  proUserId: string;
  proUserName: string;
  restaurantName: string;
}

const HOLD_DELAY = 400;

function useDraggable(initialPos: { x: number; y: number }) {
  const [pos, setPos] = useState(initialPos);
  const [dragging, setDragging] = useState(false);
  const [holdReady, setHoldReady] = useState(false);
  const didDrag = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldReady(false);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    didDrag.current = false;
    pointerIdRef.current = e.pointerId;
    targetRef.current = e.target as HTMLElement;
    targetRef.current.setPointerCapture(e.pointerId);

    holdTimer.current = setTimeout(() => {
      setHoldReady(true);
      setDragging(true);
    }, HOLD_DELAY);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const dx = Math.abs(e.clientX - (rect.left + dragOffset.current.x));
        const dy = Math.abs(e.clientY - (rect.top + dragOffset.current.y));
        if (dx > 8 || dy > 8) cancelHold();
      }
      return;
    }
    didDrag.current = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = containerRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;
    newX = Math.max(0, Math.min(vw - w, newX));
    newY = Math.max(0, Math.min(vh - h, newY));
    setPos({ x: newX, y: newY });
  }, [dragging, cancelHold]);

  const onPointerUp = useCallback(() => {
    cancelHold();
    setDragging(false);
    setHoldReady(false);
  }, [cancelHold]);

  return { pos, dragging, holdReady, didDrag, containerRef, onPointerDown, onPointerMove, onPointerUp };
}

export default function ChatMaxAI({ tenantId, proUserId, proUserName, restaurantName }: ChatMaxAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const btnDrag = useDraggable({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const chatDrag = useDraggable({ x: window.innerWidth - 420, y: window.innerHeight - 520 });

  const isConfigured = !!COBA_API_URL && !!COBA_API_KEY;

  useEffect(() => {
    if (isOpen && messages.length === 0 && isConfigured) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${COBA_API_URL}/api/coba/chat/history?tenantId=${tenantId}&proUserId=${proUserId}`, {
        headers: { "x-coba-key": COBA_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages.map((m: any) => ({
            role: m.role || (m.fromUser ? "user" : "assistant"),
            content: m.content || m.message || m.reply || "",
            timestamp: m.timestamp || Date.now(),
          })));
        }
      }
    } catch (err) {
      console.warn("[ChatMaxAI] Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${COBA_API_URL}/api/coba/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coba-key": COBA_API_KEY,
        },
        body: JSON.stringify({
          tenantId,
          proUserId,
          proUserName,
          restaurantName,
          message: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.reply || "Pas de reponse.",
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Erreur de communication avec MaxAI. Reessayez.",
          timestamp: Date.now(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Impossible de joindre MaxAI. Verifiez votre connexion.",
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearConversation() {
    try {
      await fetch(`${COBA_API_URL}/api/coba/chat/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coba-key": COBA_API_KEY,
        },
        body: JSON.stringify({ tenantId, proUserId }),
      });
    } catch {}
    setMessages([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!isConfigured) return null;

  if (!isOpen) {
    return (
      <div
        ref={btnDrag.containerRef}
        style={{ position: "fixed", left: btnDrag.pos.x, top: btnDrag.pos.y, zIndex: 50, touchAction: "none" }}
        onPointerDown={btnDrag.onPointerDown}
        onPointerMove={btnDrag.onPointerMove}
        onPointerUp={btnDrag.onPointerUp}
      >
        <button
          onClick={() => { if (!btnDrag.didDrag.current) setIsOpen(true); }}
          className={`w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center relative ${btnDrag.holdReady ? "ring-2 ring-white/70 scale-110 cursor-grabbing" : "hover:scale-105 cursor-pointer"}`}
          data-testid="button-open-chat-maxai"
        >
          <MessageCircle className="w-6 h-6" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
              {messages.filter(m => m.role === "assistant").length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={chatDrag.containerRef}
      style={{ position: "fixed", left: chatDrag.pos.x, top: chatDrag.pos.y, zIndex: 50, touchAction: "none" }}
      className={`${isMinimized ? "w-72" : "w-96"} transition-[width]`}
      onPointerMove={chatDrag.onPointerMove}
      onPointerUp={chatDrag.onPointerUp}
      data-testid="chat-maxai-container"
    >
      <Card className="shadow-2xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden">
        <CardHeader
          className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 select-none transition-all ${chatDrag.holdReady ? "ring-2 ring-white/50 ring-offset-1" : ""}`}
          onPointerDown={chatDrag.onPointerDown}
          onPointerMove={chatDrag.onPointerMove}
          onPointerUp={chatDrag.onPointerUp}
          style={{ cursor: chatDrag.dragging ? "grabbing" : "default", touchAction: "none" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className={`w-4 h-4 transition-opacity ${chatDrag.holdReady ? "opacity-100" : "opacity-40"}`} />
              <Bot className="w-5 h-5" />
              <CardTitle className="text-sm font-semibold text-white">MaxAI Assistant</CardTitle>
              <Badge variant="outline" className="text-[10px] border-white/40 text-white/80 px-1.5 py-0">
                COBA
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); clearConversation(); }} className="p-1 hover:bg-white/20 rounded" title="Nouvelle conversation" data-testid="button-clear-chat">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1 hover:bg-white/20 rounded" data-testid="button-minimize-chat">
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded" data-testid="button-close-chat">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0">
            <div className="h-80 overflow-y-auto p-3 space-y-3 bg-muted/30">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Chargement...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <Bot className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">Bonjour {proUserName} !</p>
                  <p className="text-xs">Je suis MaxAI, votre assistant intelligent. Posez-moi vos questions sur votre activite.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border shadow-sm"
                      }`}
                      data-testid={`chat-message-${msg.role}-${i}`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-card border shadow-sm rounded-lg px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question..."
                  disabled={loading}
                  className="text-sm"
                  data-testid="input-chat-maxai"
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex-shrink-0"
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                MaxAI par COBA — {restaurantName}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
