import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';

export default function AdminReceipts() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    api.get('/admin/all-transactions')
      .then(r => setTransactions(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(tx => {
    const matchSearch = tx.restaurant_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalProfit = filtered.filter(t => t.type === 'profit').reduce((s, t) => s + t.value, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);

  return (
    <Layout>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 page-enter">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Comprovantes</h1>
            <p className="text-slate-400 mt-1">Todas as transações da plataforma</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4 flex items-center gap-3">
              <span className="text-slate-400 text-sm">Total de registros</span>
              <span className="text-white font-bold ml-auto">{filtered.length}</span>
            </div>
            <div className="glass-card p-4 flex items-center gap-3">
              <ArrowUpRight size={16} className="text-emerald-400" />
              <span className="text-slate-400 text-sm">Total Lucros</span>
              <span className="text-emerald-400 font-bold ml-auto">{formatCurrency(totalProfit)}</span>
            </div>
            <div className="glass-card p-4 flex items-center gap-3">
              <ArrowDownRight size={16} className="text-red-400" />
              <span className="text-slate-400 text-sm">Total Despesas</span>
              <span className="text-red-400 font-bold ml-auto">{formatCurrency(totalExpense)}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors" />
            </div>
            <div className="flex gap-2">
              {[['all', 'Todos'], ['profit', 'Lucros'], ['expense', 'Despesas']].map(([v, l]) => (
                <button key={v} onClick={() => setTypeFilter(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${typeFilter === v ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 border border-white/10 hover:bg-white/5'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="receipts-table">
                <thead>
                  <tr className="border-b border-white/8 text-slate-400">
                    <th className="text-left px-6 py-4 font-medium">Restaurante</th>
                    <th className="text-left px-6 py-4 font-medium">Descrição</th>
                    <th className="text-left px-6 py-4 font-medium">Tipo</th>
                    <th className="text-left px-6 py-4 font-medium">Data</th>
                    <th className="text-right px-6 py-4 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Carregando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Nenhuma transação encontrada</td></tr>
                  ) : filtered.map(tx => (
                    <tr key={tx.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4 text-slate-300">{tx.restaurant_name}</td>
                      <td className="px-6 py-4 text-white font-medium">{tx.name}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold w-fit px-2.5 py-1 rounded-full ${tx.type === 'profit' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {tx.type === 'profit' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {tx.type === 'profit' ? 'Lucro' : 'Despesa'}
                        </span>
                      </td>
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
    </Layout>
  );
}
