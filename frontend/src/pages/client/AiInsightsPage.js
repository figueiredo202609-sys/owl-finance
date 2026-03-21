import { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { api, formatCurrency } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Send, Lock, ArrowRight, TrendingUp, TrendingDown, Scale, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUGGESTIONS = [
  'Qual foi meu maior gasto neste período?',
  'Em qual mês tive mais lucro?',
  'Faça um resumo geral das minhas finanças',
  'Quais são as principais despesas do meu restaurante?',
  'Como estão minhas entradas comparadas às saídas?',
  'Dê insights sobre como posso reduzir gastos',
  'Qual categoria gera mais receita para mim?',
];

const MessageBubble = ({ msg }) => (
  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    {msg.role === 'assistant' && (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-800 flex items-center justify-center shrink-0 mr-3 mt-1">
        <Sparkles size={14} className="text-white" />
      </div>
    )}
    <div
      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
        ${msg.role === 'user'
          ? 'bg-gradient-to-br from-purple-600/80 to-blue-800/80 text-white ml-3 border border-white/10'
          : 'bg-[#0d1b3e] text-slate-200 border border-white/8'
        }`}
    >
      {msg.content}
    </div>
  </div>
);

export default function AiInsightsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.plan_name === 'Premium';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Olá! Sou o seu assistente financeiro com IA.\n\nEstou aqui para ajudar você a entender melhor as finanças do ${user?.restaurant_name || 'seu restaurante'}.\n\nVocê pode me perguntar sobre gastos, lucros, tendências, insights e muito mais. Use as sugestões abaixo ou escreva sua própria pergunta.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const { data } = await api.post('/client/ai-insights', { question });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="flex h-screen bg-[#020617]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="glass-card p-10 max-w-md text-center" data-testid="premium-lock">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-800/30 border border-purple-500/30 flex items-center justify-center mx-auto mb-6">
              <Lock size={28} className="text-purple-400" />
            </div>
            <h2 className="text-white text-2xl font-black mb-3" style={{ fontFamily: 'Manrope' }}>
              Recurso Exclusivo Premium
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              A IA financeira analisa seus dados e responde perguntas sobre gastos, lucros e tendências do seu restaurante. Disponível apenas no plano Premium por <strong className="text-white">R$ 119,90/mês</strong>.
            </p>
            <ul className="text-left space-y-2 mb-8">
              {['Análise inteligente de gastos', 'Insights sobre lucros e despesas', 'Resumo financeiro automático', 'Sugestões para reduzir custos'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <Sparkles size={14} className="text-purple-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/client/profile')} className="btn-pill px-6 py-3 text-sm font-semibold flex items-center gap-2 mx-auto">
              Ver Planos <ArrowRight size={15} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden page-enter">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-white/8 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-800 flex items-center justify-center shadow-lg">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>
                IA Financeira
              </h1>
              <p className="text-slate-400 text-sm">Converse com a IA sobre os dados do {user?.restaurant_name}</p>
            </div>
            <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full font-bold border border-purple-500/30">
              Premium
            </span>
          </div>
        </div>

        {/* Suggestions */}
        <div className="px-8 py-4 border-b border-white/5 shrink-0">
          <div className="max-w-3xl mx-auto">
            <p className="text-slate-500 text-xs mb-3 flex items-center gap-1.5">
              <Lightbulb size={12} /> Sugestões de perguntas
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-800 flex items-center justify-center shrink-0 mr-3 mt-1">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="bg-[#0d1b3e] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-slate-400 text-xs">Analisando seus dados...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="px-8 pb-8 pt-4 border-t border-white/8 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              data-testid="ai-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Pergunte algo sobre suas finanças..."
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
            />
            <button
              data-testid="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-pill px-5 py-3 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} />
              {loading ? 'Pensando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
