import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/api';
import { Users, TrendingUp, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4'];

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="glass-card p-6 flex items-start gap-4" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className="text-white text-2xl font-bold mt-0.5" style={{ fontFamily: 'Manrope' }}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1b3e] border border-white/10 rounded-xl p-3 text-sm">
      <p className="text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 page-enter">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>
              Dashboard Administrativo
            </h1>
            <p className="text-slate-400 mt-1">Visão geral da plataforma</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Total Clientes" value={stats?.total_clients || 0} icon={Users} color="bg-purple-600/30" />
                <StatCard title="Receita Mensal" value={formatCurrency(stats?.monthly_revenue)} icon={TrendingUp} color="bg-blue-600/30" sub="Planos ativos" />
                <StatCard title="Clientes Ativos" value={stats?.active_clients || 0} icon={CheckCircle} color="bg-emerald-600/30" />
                <StatCard title="Inativos" value={stats?.inactive_clients || 0} icon={XCircle} color="bg-red-600/30" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Area chart */}
                <div className="lg:col-span-2 glass-card p-6">
                  <h3 className="text-white font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Evolução de Receita</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats?.revenue_trend || []}>
                      <defs>
                        <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="receita" name="Receita" stroke="#8b5cf6" fill="url(#receitaGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div className="glass-card p-6">
                  <h3 className="text-white font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Distribuição de Planos</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats?.plan_distribution || []}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90}
                        dataKey="value" nameKey="name"
                      >
                        {(stats?.plan_distribution || []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0d1b3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} itemStyle={{ color: '#e2e8f0' }} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Transações Recentes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="recent-transactions-table">
                    <thead>
                      <tr className="border-b border-white/8 text-slate-400">
                        <th className="text-left pb-3 pr-4 font-medium">Restaurante</th>
                        <th className="text-left pb-3 pr-4 font-medium">Descrição</th>
                        <th className="text-left pb-3 pr-4 font-medium">Data</th>
                        <th className="text-right pb-3 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(stats?.recent_transactions || []).map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/3 transition-colors">
                          <td className="py-3 pr-4 text-slate-300">{tx.restaurant_name}</td>
                          <td className="py-3 pr-4 text-white font-medium">{tx.name}</td>
                          <td className="py-3 pr-4 text-slate-400">{tx.date}</td>
                          <td className="py-3 text-right">
                            <span className={`flex items-center justify-end gap-1 font-semibold ${tx.type === 'profit' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {tx.type === 'profit' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              {formatCurrency(tx.value)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!stats?.recent_transactions?.length && (
                    <p className="text-center text-slate-500 py-8">Nenhuma transação encontrada</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
