import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Power, Search, X } from 'lucide-react';

const PLANS = ['Básico', 'Profissional', 'Premium'];

const initialForm = { email: '', password: '', restaurant_name: '', plan_name: 'Básico' };

const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
    {status === 'active' ? 'Ativo' : 'Inativo'}
  </span>
);

const PlanBadge = ({ plan }) => {
  const colors = { 'Básico': 'bg-slate-500/20 text-slate-300', 'Profissional': 'bg-blue-500/20 text-blue-300', 'Premium': 'bg-purple-500/20 text-purple-300' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[plan] || colors['Básico']}`}>{plan}</span>;
};

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(() => {
    setLoading(true);
    api.get('/admin/clients').then(r => setClients(r.data)).catch(() => toast.error('Erro ao carregar clientes')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openCreate = () => { setForm(initialForm); setSelected(null); setModal('create'); };
  const openEdit = (c) => { setSelected(c); setForm({ email: c.email, password: '', restaurant_name: c.restaurant_name, plan_name: c.plan_name }); setModal('edit'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'create') {
        await api.post('/admin/create-client', form);
        toast.success('Cliente criado com sucesso!');
      } else {
        const payload = { restaurant_name: form.restaurant_name, plan_name: form.plan_name, email: form.email };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/clients/${selected.id}`, payload);
        toast.success('Cliente atualizado!');
      }
      fetchClients();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Remover ${c.restaurant_name}?`)) return;
    try {
      await api.delete(`/admin/clients/${c.id}`);
      toast.success('Cliente removido');
      fetchClients();
    } catch { toast.error('Erro ao remover cliente'); }
  };

  const handleToggle = async (c) => {
    try {
      await api.put(`/admin/clients/${c.id}/toggle-status`);
      toast.success(`Cliente ${c.status === 'active' ? 'desativado' : 'ativado'}`);
      fetchClients();
    } catch { toast.error('Erro ao alterar status'); }
  };

  const filtered = clients.filter(c =>
    c.restaurant_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 page-enter">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Clientes</h1>
              <p className="text-slate-400 mt-1">{clients.length} cliente(s) cadastrado(s)</p>
            </div>
            <button data-testid="create-client-btn" onClick={openCreate} className="btn-pill px-5 py-2.5 flex items-center gap-2 text-sm">
              <Plus size={16} /> Novo Cliente
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              data-testid="search-clients"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="clients-table">
                <thead>
                  <tr className="border-b border-white/8 text-slate-400">
                    <th className="text-left px-6 py-4 font-medium">Restaurante</th>
                    <th className="text-left px-6 py-4 font-medium">Email</th>
                    <th className="text-left px-6 py-4 font-medium">Plano</th>
                    <th className="text-left px-6 py-4 font-medium">Status</th>
                    <th className="text-left px-6 py-4 font-medium">Criado em</th>
                    <th className="text-right px-6 py-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">Carregando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">Nenhum cliente encontrado</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="hover:bg-white/3 transition-colors" data-testid={`client-row-${c.id}`}>
                      <td className="px-6 py-4 text-white font-medium">{c.restaurant_name}</td>
                      <td className="px-6 py-4 text-slate-300">{c.email}</td>
                      <td className="px-6 py-4"><PlanBadge plan={c.plan_name} /></td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button data-testid={`edit-client-${c.id}`} onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"><Pencil size={15} /></button>
                          <button data-testid={`toggle-client-${c.id}`} onClick={() => handleToggle(c)} className={`p-1.5 rounded-lg transition-colors ${c.status === 'active' ? 'text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10'}`}><Power size={15} /></button>
                          <button data-testid={`delete-client-${c.id}`} onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={15} /></button>
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 relative" data-testid="client-modal">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-white font-bold text-xl mb-6" style={{ fontFamily: 'Manrope' }}>
              {modal === 'create' ? 'Novo Cliente' : 'Editar Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Nome do Restaurante</label>
                <input data-testid="form-restaurant-name" value={form.restaurant_name} onChange={e => setForm(p => ({ ...p, restaurant_name: e.target.value }))} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors" placeholder="Ex: Pizzaria do João" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Email</label>
                <input data-testid="form-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors" placeholder="cliente@email.com" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">
                  {modal === 'edit' ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <input data-testid="form-password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={modal === 'create'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Plano</label>
                <select data-testid="form-plan" value={form.plan_name} onChange={e => setForm(p => ({ ...p, plan_name: e.target.value }))}
                  className="w-full bg-[#0d1b3e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition-colors">Cancelar</button>
                <button data-testid="submit-client-form" type="submit" disabled={submitting} className="flex-1 btn-pill py-2.5 text-sm disabled:opacity-50">
                  {submitting ? 'Salvando...' : modal === 'create' ? 'Criar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
