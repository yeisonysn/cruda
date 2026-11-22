import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X, RotateCcw, ShieldCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CrudaAiChatDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  '¿Qué materas tienen disponibles en catálogo y sus precios?',
  'Recomiéndame una matera mediana para interior en Bogotá',
  'Quiero cotizar 2 Materas Hexagonales S',
];

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: 'welcome-cruda-ai',
  role: 'assistant',
  content:
    'Hola, soy el asesor de ventas IA de CRUDA (conectado en tiempo real a n8n + PostgreSQL). Puedo consultar precios y stock oficial en COP, recomendarte materas según tu espacio y generar una cotización formal para aprobación. ¿En qué te asesoro hoy?',
  timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
};

export const CrudaAiChatDrawer: React.FC<CrudaAiChatDrawerProps> = ({ isOpen, onOpen, onClose }) => {
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cruda_n8n_session_id');
      if (saved) return saved;
      const fresh = `cruda-web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('cruda_n8n_session_id', fresh);
      return fresh;
    } catch {
      return `cruda-web-${Date.now()}`;
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('cruda_n8n_chat_history');
      return saved ? JSON.parse(saved) : [INITIAL_ASSISTANT_MESSAGE];
    } catch {
      return [INITIAL_ASSISTANT_MESSAGE];
    }
  });

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('cruda_n8n_chat_history', JSON.stringify(messages));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleResetSession = () => {
    const fresh = `cruda-web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(fresh);
    setMessages([
      {
        ...INITIAL_ASSISTANT_MESSAGE,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMsg(null);
    try {
      localStorage.setItem('cruda_n8n_session_id', fresh);
      localStorage.removeItem('cruda_n8n_chat_history');
    } catch {
      // Ignorar
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const cleanText = (textToSend ?? input).trim();
    if (!cleanText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanText,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let replyText = '';
      const payload = {
        action: 'sendMessage',
        sessionId,
        chatInput: cleanText,
      };

      // 1. Intenta vía backend (/api/ai-chat)
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: cleanText,
          sessionId,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        replyText = data.reply || 'Recibido.';
      } else {
        // 2. Fallback para Vite local (/n8n-webhook) o desde Vercel conectando al n8n local del navegador (http://localhost:5678)
        const customWebhook = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL;
        const candidateUrls = [
          customWebhook,
          '/n8n-webhook/cruda-agente-ventas/chat',
          'http://localhost:5678/webhook/cruda-agente-ventas/chat',
        ].filter(Boolean) as string[];

        let connected = false;
        let lastErr = 'Error comunicándose con el agente de n8n.';

        for (const url of candidateUrls) {
          try {
            const directRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const contentType = directRes.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) continue;

            const directData = await directRes.json();
            if (directRes.ok) {
              replyText =
                directData.output ||
                directData.text ||
                (Array.isArray(directData) && directData[0]?.output) ||
                'Recibido.';
              connected = true;
              break;
            } else {
              lastErr = directData.message || directData.error || lastErr;
            }
          } catch {
            // Probar siguiente URL candidata
          }
        }

        if (!connected) {
          throw new Error(lastErr);
        }
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMsg(err.message || 'No fue posible conectar con el flujo de n8n.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <>
      {/* Botón Flotante en Esquina Inferior Derecha */}
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3.5 bg-[#111313] hover:bg-[#2B2D2D] text-[#FDFCFA] border border-[#B6A17E]/60 shadow-2xl transition-all group"
          aria-label="Abrir chat con Asesor IA CRUDA"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366]" />
          </span>
          <Sparkles className="w-4 h-4 text-[#B6A17E] group-hover:rotate-12 transition-transform" />
          <div className="text-left">
            <span className="block font-mono text-[11px] uppercase tracking-widest font-bold leading-none">
              Asesor IA · n8n
            </span>
            <span className="block font-mono text-[9px] text-[#B6A17E] tracking-wider mt-0.5">
              Cotizador en línea
            </span>
          </div>
        </button>
      )}

      {/* Backdrop sutil en móvil */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#111313]/30 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none sm:pointer-events-none"
        />
      )}

      {/* Panel Lateral (Drawer Derecho) */}
      <aside
        aria-label="Asesor de Ventas IA CRUDA"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[410px] bg-[#FDFCFA] border-l border-[#111313] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera del Chat Lateral */}
        <div className="p-4 bg-[#111313] text-[#FDFCFA] border-b border-[#2B2D2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#B6A17E]/20 border border-[#B6A17E] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#B6A17E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base tracking-wider font-bold text-[#FDFCFA]">
                  ASESOR CRUDA IA
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#25D366]/20 text-[#25D366] font-mono text-[9px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  Gemini · n8n
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#B6A17E]">
                Catálogo y Cotizaciones con PostgreSQL Blindado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetSession}
              title="Nueva conversación"
              className="p-1.5 text-[#8C8C87] hover:text-[#FDFCFA] border border-transparent hover:border-[#303333] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar chat"
              className="p-1.5 text-[#8C8C87] hover:text-[#FDFCFA] border border-transparent hover:border-[#303333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cinta Informativa de Seguridad Transaccional */}
        <div className="px-4 py-2 bg-[#FAF8F5] border-b border-[#EAE5DC] flex items-center gap-2 font-mono text-[10px] text-[#5C5C57]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8C7A5E] shrink-0" />
          <span>Precios oficiales calculados por PostgreSQL · Sujeto a aprobación humana</span>
        </div>

        {/* Historial de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCFA]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[86%] p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#111313] text-[#FDFCFA] border border-[#111313]'
                    : 'bg-[#FAF8F5] text-[#191B1B] border border-[#EAE5DC]'
                }`}
              >
                {msg.content}
              </div>
              <span className="font-mono text-[9px] text-[#8C8C87] mt-1 px-1">
                {msg.role === 'user' ? 'Tú' : 'CRUDA IA'} · {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="bg-[#FAF8F5] border border-[#EAE5DC] px-4 py-3 text-xs font-mono text-[#5C5C57] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#B6A17E] animate-ping" />
                <span>Consultando n8n & PostgreSQL...</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 font-mono text-[11px]">
              {errorMsg}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias Rápidas (cuando hay pocos mensajes) */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-4 py-2.5 bg-[#FAF8F5] border-t border-[#EAE5DC] space-y-1.5">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-[#8C8C87]">
              Preguntas rápidas:
            </span>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="text-left px-2.5 py-1.5 bg-[#FDFCFA] hover:bg-[#111313] hover:text-[#FDFCFA] border border-[#EAE5DC] font-mono text-[10px] text-[#191B1B] transition-colors truncate"
                >
                  → {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Caja de Entrada */}
        <form onSubmit={handleFormSubmit} className="p-3 bg-[#FAF8F5] border-t border-[#EAE5DC] flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Pregunta por materas, precios o cotiza aquí..."
            className="flex-1 bg-[#FDFCFA] border border-[#EAE5DC] focus:border-[#111313] px-3 py-2.5 text-xs outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-[#111313] hover:bg-[#2B2D2D] disabled:opacity-40 text-[#FDFCFA] font-mono text-xs uppercase flex items-center justify-center transition-colors"
            aria-label="Enviar mensaje"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </aside>
    </>
  );
};
