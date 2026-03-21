import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardBubble } from '@/components/DashboardBubble';
import { api, formatCurrency } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, TrendingDown, Scale, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1b3e] border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: R$ {Number(p.value).toFixed(2)}</p>
      ))}
    </div>
  );
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/client/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const isBasic = user?.plan_name === 'Básico';

  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 page-enter">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>
                Olá, {user?.restaurant_name || 'Bem-vindo'}!
              </h1>
              <p className="text-slate-400 mt-1">Aqui está o resumo financeiro do seu restaurante</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${user?.plan_name === 'Premium' ? 'bg-purple-500/20 text-purple-300' : user?.plan_name === 'Profissional' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'}`}>
                {user?.plan_name || 'Básico'}
              </span>
            </div>
          </div>

          {/* Upgrade banner for Básico */}
          {isBasic && (
            <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-amber-300 font-semibold text-sm">Plano Básico — Recursos limitados</p>
                <p className="text-amber-400/70 text-xs mt-0.5">Histórico limitado a 30 dias. Sem OCR e exportação. Considere fazer upgrade.</p>
              </div>
              <button onClick={() => navigate('/client/profile')} className="flex items-center gap-1 text-amber-300 text-xs font-semibold hover:text-amber-200 transition-colors whitespace-nowrap">
                Ver Planos <ArrowRight size={14} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* 3 Bubbles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <DashboardBubble
                  title="Lucros"
                  value={formatCurrency(data?.profits)}
                  icon={TrendingUp}
                  colorClass="from-emerald-500/70 to-blue-900/80"
                  delay={0}
                />
                <DashboardBubble
                  title="Despesas"
                  value={formatCurrency(data?.expenses)}
                  icon={TrendingDown}
                  colorClass="from-red-500/60 to-purple-900/80"
                  delay={1}
                />
                <DashboardBubble
                  title="Saldo"
                  value={formatCurrency(data?.balance)}
                  icon={Scale}
                  colorClass="from-purple-600/80 to-blue-900/80"
                  delay={2}
                />
              </div>

              {/* Chart */}
              {data?.chart_data?.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-white font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Evolução Financeira</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data.chart_data}>
                      <defs>
                        <linearGradient id="lucrosGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="despesasGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="lucros" name="Lucros" stroke="#10b981" fill="url(#lucrosGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" fill="url(#despesasGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Registrar Lucro', to: '/client/profits', color: 'text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10' },
                  { label: 'Registrar Despesa', to: '/client/expenses', color: 'text-red-400 border-red-400/20 hover:bg-red-400/10' },
                  { label: 'Upload Comprovante', to: '/client/upload', color: 'text-blue-400 border-blue-400/20 hover:bg-blue-400/10' },
                  { label: 'Ver Histórico', to: '/client/history', color: 'text-purple-400 border-purple-400/20 hover:bg-purple-400/10' },
                ].map(({ label, to, color }) => (
                  <button key={to} onClick={() => navigate(to)}
                    className={`glass-card p-4 text-sm font-semibold border ${color} transition-colors flex items-center justify-between`}>
                    {label} <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
