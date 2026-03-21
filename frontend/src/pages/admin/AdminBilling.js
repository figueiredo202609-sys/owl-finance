import { Sidebar } from '@/components/Sidebar';
import { Check, X, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Básico',
    price: 'R$ 49,90',
    period: '/mês',
    color: 'from-slate-700 to-slate-800',
    border: 'border-slate-600/30',
    features: [
      { label: 'OCR com IA', ok: false },
      { label: 'Histórico de 30 dias', ok: true },
      { label: 'Upload de comprovantes', ok: true },
      { label: 'Dashboard financeiro', ok: true },
      { label: 'Exportação PDF/Excel', ok: false },
      { label: 'Suporte prioritário', ok: false },
    ],
  },
  {
    name: 'Profissional',
    price: 'R$ 99,90',
    period: '/mês',
    color: 'from-blue-700 to-blue-900',
    border: 'border-blue-500/30',
    badge: 'Popular',
    features: [
      { label: 'OCR com IA', ok: true },
      { label: 'Histórico de 3 meses', ok: true },
      { label: 'Upload de comprovantes', ok: true },
      { label: 'Dashboard financeiro', ok: true },
      { label: 'Exportação PDF/Excel', ok: true },
      { label: 'Suporte prioritário', ok: false },
    ],
  },
  {
    name: 'Premium',
    price: 'R$ 199,90',
    period: '/mês',
    color: 'from-purple-700 to-blue-900',
    border: 'border-purple-500/30',
    features: [
      { label: 'OCR com IA', ok: true },
      { label: 'Histórico ilimitado', ok: true },
      { label: 'Upload de comprovantes', ok: true },
      { label: 'Dashboard financeiro', ok: true },
      { label: 'Exportação PDF/Excel', ok: true },
      { label: 'Suporte prioritário', ok: true },
    ],
  },
];

export default function AdminBilling() {
  return (
    <div className="flex h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 page-enter">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Cobranças</h1>
            <p className="text-slate-400 mt-1">Planos e faturamento da plataforma</p>
          </div>

          {/* Coming soon banner */}
          <div className="mb-8 flex items-center gap-3 glass-card p-5 border-l-4 border-purple-500">
            <Zap size={20} className="text-purple-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">Integração com Gateway de Pagamento</p>
              <p className="text-slate-400 text-sm mt-0.5">Em breve: integração com Stripe/PagSeguro para cobranças automáticas dos clientes.</p>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                data-testid={`plan-card-${plan.name.toLowerCase()}`}
                className={`relative glass-card p-6 border ${plan.border} overflow-hidden`}
              >
                {plan.badge && (
                  <span className="absolute top-4 right-4 bg-blue-500/30 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} mb-4`}>
                  <span className="text-white font-bold text-sm">{plan.name[0]}</span>
                </div>
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Manrope' }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-6">
                  <span className="text-white text-3xl font-black" style={{ fontFamily: 'Manrope' }}>{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      {f.ok
                        ? <Check size={15} className="text-emerald-400 shrink-0" />
                        : <X size={15} className="text-slate-600 shrink-0" />}
                      <span className={`text-sm ${f.ok ? 'text-slate-300' : 'text-slate-600'}`}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
