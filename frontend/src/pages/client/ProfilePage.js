import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User, Mail, Store, Lock, Check, ArrowUpRight } from 'lucide-react';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors";

const planDetails = {
  'Básico': { color: 'from-slate-600 to-slate-800', badge: 'bg-slate-500/20 text-slate-300', features: ['Dashboard financeiro', 'Upload de comprovantes', 'Histórico de 30 dias'] },
  'Profissional': { color: 'from-blue-600 to-blue-900', badge: 'bg-blue-500/20 text-blue-300', features: ['Tudo do Básico', 'OCR com IA', 'Histórico de 3 meses', 'Exportação'] },
  'Premium': { color: 'from-purple-600 to-blue-900', badge: 'bg-purple-500/20 text-purple-300', features: ['Tudo do Profissional', 'Histórico ilimitado', 'Suporte prioritário'] },
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ restaurant_name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/client/profile').then(r => {
      setProfile(r.data);
      setForm(p => ({ ...p, restaurant_name: r.data.restaurant_name || '', email: r.data.email || '' }));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) return toast.error('Senhas não coincidem');
    setSaving(true);
    try {
      const payload = {};
      if (form.restaurant_name && form.restaurant_name !== profile.restaurant_name) payload.restaurant_name = form.restaurant_name;
      if (form.email && form.email !== profile.email) payload.email = form.email;
      if (form.password) payload.password = form.password;
      if (!Object.keys(payload).length) return toast.info('Nenhuma alteração detectada');
      await api.put('/client/profile', payload);
      updateUser({ restaurant_name: form.restaurant_name, email: form.email });
      toast.success('Perfil atualizado!');
      setForm(p => ({ ...p, password: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const plan = profile?.plan_name || 'Básico';
  const planInfo = planDetails[plan] || planDetails['Básico'];
  const initials = (profile?.restaurant_name || profile?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <Layout>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 page-enter">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Meu Perfil</h1>
            <p className="text-slate-400 mt-1">Gerencie suas informações e plano</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Edit form */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-800 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">{initials}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold" style={{ fontFamily: 'Manrope' }}>{profile?.restaurant_name}</h3>
                    <p className="text-slate-400 text-sm">{profile?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" data-testid="profile-form">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      <Store size={14} className="text-slate-500" /> Nome do Restaurante
                    </label>
                    <input data-testid="profile-restaurant-name" value={form.restaurant_name} onChange={e => setForm(p => ({ ...p, restaurant_name: e.target.value }))} className={inputClass} placeholder="Nome do estabelecimento" />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-500" /> E-mail
                    </label>
                    <input data-testid="profile-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      <Lock size={14} className="text-slate-500" /> Nova Senha
                    </label>
                    <input data-testid="profile-password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={inputClass} placeholder="Deixe em branco para manter" />
                  </div>
                  {form.password && (
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-1.5">Confirmar Senha</label>
                      <input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} className={inputClass} placeholder="Repita a nova senha" />
                    </div>
                  )}
                  <button data-testid="save-profile-btn" type="submit" disabled={saving} className="w-full btn-pill py-3 text-sm font-semibold disabled:opacity-50 mt-2">
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </form>
              </div>

              {/* Plan info */}
              <div className="space-y-4">
                <div className={`glass-card p-6 bg-gradient-to-br ${planInfo.color} border-0`} data-testid="plan-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Manrope' }}>Plano {plan}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${planInfo.badge}`}>{plan}</span>
                  </div>
                  <ul className="space-y-2">
                    {planInfo.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/90">
                        <Check size={14} className="text-emerald-300 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan !== 'Premium' && (
                  <div className="glass-card p-5 border border-purple-500/20">
                    <p className="text-white font-semibold text-sm mb-1">Faça upgrade do seu plano</p>
                    <p className="text-slate-400 text-xs mb-3">Acesse mais recursos e aumente sua produtividade.</p>
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold">
                      <ArrowUpRight size={14} />
                      <span>Entre em contato com o administrador</span>
                    </div>
                  </div>
                )}

                <div className="glass-card p-4 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between"><span>Membro desde</span><span className="text-slate-400">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '-'}</span></div>
                  <div className="flex justify-between"><span>Status</span><span className="text-emerald-400">Ativo</span></div>
                  <div className="flex justify-between"><span>Plano atual</span><span className="text-slate-400">{plan}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
