import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowUpRight, ArrowDownRight, Filter, AlertTriangle } from 'lucide-react';

const inputClass = "bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors";

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isBasic = user?.plan_name === 'Básico';
  const isPro = user?.plan_name === 'Profissional';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.append('type', typeFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    api.get(`/client/transactions?${params.toString()}`)
      .then(r => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [typeFilter, startDate, endDate]);

  const totalProfit = items.filter(t => t.type === 'profit').reduce((s, t) => s + t.value, 0);
  const totalExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);

  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 page-enter">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Histórico</h1>
            <p className="text-slate-400 mt-1">Todas as transações no período</p>
          </div>

          {/* Plan restriction notice */}
          {(isBasic || isPro) && (
            <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm">
                {isBasic ? 'Plano Básico: histórico limitado aos últimos 30 dias.' : 'Plano Profissional: histórico limitado aos últimos 3 meses.'}
                {' '}<span className="text-amber-400/70">Faça upgrade para acesso ilimitado.</span>
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
            <Filter size={16} className="text-slate-500 shrink-0" />
            <div className="flex gap-2">
              {[['all', 'Todos'], ['profit', 'Lucros'], ['expense', 'Despesas']].map(([v, l]) => (
                <button key={v} onClick={() => setTypeFilter(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${typeFilter === v ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 border border-white/10 hover:bg-white/5'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputClass} text-xs`} />
              <span className="text-slate-500 text-xs">até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputClass} text-xs`} />
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Limpar datas</button>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Total Registros</p>
              <p className="text-white text-xl font-bold">{items.length}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Total Lucros</p>
              <p className="text-emerald-400 text-xl font-bold">{formatCurrency(totalProfit)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Total Despesas</p>
              <p className="text-red-400 text-xl font-bold">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="history-table">
                <thead>
                  <tr className="border-b border-white/8 text-slate-400">
                    <th className="text-left px-6 py-4 font-medium">Tipo</th>
                    <th className="text-left px-6 py-4 font-medium">Descrição</th>
                    <th className="text-left px-6 py-4 font-medium">Observações</th>
                    <th className="text-left px-6 py-4 font-medium">Data</th>
                    <th className="text-right px-6 py-4 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Carregando...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Nenhuma transação encontrada</td></tr>
                  ) : items.map(tx => (
                    <tr key={tx.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold w-fit px-2.5 py-1 rounded-full ${tx.type === 'profit' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {tx.type === 'profit' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {tx.type === 'profit' ? 'Lucro' : 'Despesa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">{tx.name}</td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{tx.description || '-'}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(tx.date)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${tx.type === 'profit' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(tx.value)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
