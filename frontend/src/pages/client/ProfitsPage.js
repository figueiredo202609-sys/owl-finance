import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, TrendingUp, X } from 'lucide-react';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors";

export default function ProfitsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ value: '', date: '', name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadItems = useCallback(() => {
    setLoading(true);
    api.get('/client/transactions?type=profit')
      .then(r => setItems(r.data))
      .catch(() => toast.error('Erro ao carregar lucros'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setForm({ value: '', date: new Date().toISOString().slice(0, 10), name: '', description: '' });
    setSelected(null);
    setModal('create');
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({ value: String(item.value), date: item.date, name: item.name, description: item.description || '' });
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'create') {
        await api.post('/client/transactions', { type: 'profit', value: parseFloat(form.value), date: form.date, name: form.name, description: form.description });
        toast.success('Lucro registrado!');
      } else {
        await api.put(`/client/transactions/${selected.id}`, { value: parseFloat(form.value), date: form.date, name: form.name, description: form.description });
        toast.success('Lucro atualizado!');
      }
      loadItems();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/client/transactions/${confirmDelete.id}`);
      toast.success('Lucro removido com sucesso!');
      setConfirmDelete(null);
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao remover');
      setConfirmDelete(null);
    }
  };

  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 page-enter">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Lucros</h1>
              <p className="text-slate-400 mt-1">Todas as entradas registradas</p>
            </div>
            <button data-testid="add-profit-btn" onClick={openCreate} className="btn-pill px-5 py-2.5 flex items-center gap-2 text-sm">
              <Plus size={16} /> Novo Lucro
            </button>
          </div>

          <div className="glass-card p-5 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <TrendingUp size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total de Lucros</p>
              <p className="text-white text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>{formatCurrency(total)}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-slate-500 text-xs">{items.length} registro(s)</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="profits-table">
                <thead>
                  <tr className="border-b border-white/8 text-slate-400">
                    <th className="text-left px-6 py-4 font-medium">Descrição</th>
                    <th className="text-left px-6 py-4 font-medium">Observações</th>
                    <th className="text-left px-6 py-4 font-medium">Data</th>
                    <th className="text-right px-6 py-4 font-medium">Valor</th>
                    <th className="text-right px-6 py-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Carregando...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-500">Nenhum lucro registrado ainda</td></tr>
                  ) : items.map(item => (
                    <tr key={item.id} className="hover:bg-white/3 transition-colors" data-testid={`profit-row-${item.id}`}>
                      <td className="px-6 py-4 text-white font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{item.description || '-'}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 text-right text-emerald-400 font-semibold">{formatCurrency(item.value)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button data-testid={`edit-profit-${item.id}`} onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"><Pencil size={15} /></button>
                          <button data-testid={`delete-profit-${item.id}`} onClick={() => setConfirmDelete(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Edit / Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 relative" data-testid="profit-modal">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-white font-bold text-xl mb-6" style={{ fontFamily: 'Manrope' }}>{modal === 'create' ? 'Novo Lucro' : 'Editar Lucro'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Descrição *</label>
                <input data-testid="profit-form-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputClass} placeholder="Ex: Vendas do almoço" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Valor (R$) *</label>
                <input data-testid="profit-form-value" type="number" step="0.01" min="0" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} required className={inputClass} placeholder="0,00" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Data *</label>
                <input data-testid="profit-form-date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Observações</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="Detalhes adicionais..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition-colors">Cancelar</button>
                <button data-testid="submit-profit" type="submit" disabled={submitting} className="flex-1 btn-pill py-2.5 text-sm disabled:opacity-50">
                  {submitting ? 'Salvando...' : modal === 'create' ? 'Registrar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir lucro"
        message={`Tem certeza que deseja excluir "${confirmDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Excluir"
      />
    </div>
  );
}
