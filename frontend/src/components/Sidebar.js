import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, CreditCard, Upload,
  TrendingUp, TrendingDown, History, User, LogOut,
  ChevronLeft, ChevronRight, Sparkles, X
} from 'lucide-react';
import { useState } from 'react';

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/clients', icon: Users, label: 'Clientes' },
  { to: '/admin/receipts', icon: FileText, label: 'Comprovantes' },
  { to: '/admin/billing', icon: CreditCard, label: 'Planos' },
];

const baseClientLinks = [
  { to: '/client/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/client/upload', icon: Upload, label: 'Upload Comprovante' },
  { to: '/client/profits', icon: TrendingUp, label: 'Lucros' },
  { to: '/client/expenses', icon: TrendingDown, label: 'Despesas' },
  { to: '/client/history', icon: History, label: 'Histórico' },
  { to: '/client/profile', icon: User, label: 'Perfil' },
];

const premiumLink = { to: '/client/ai', icon: Sparkles, label: 'IA Premium', premium: true };

export const Sidebar = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const isPremium = user?.plan_name === 'Premium';
  const clientLinks = isPremium ? [...baseClientLinks, premiumLink] : baseClientLinks;
  const links = user?.role === 'admin' ? adminLinks : clientLinks;
  const initials = (user?.restaurant_name || user?.email || 'U').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside
      data-testid="sidebar"
      className={`flex flex-col h-screen bg-[#0A1128] border-r border-white/8 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} relative shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/8 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-800 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Owl Finance
            </span>
          )}
        </div>
        {/* Close button - only on mobile */}
        {onCloseMobile && !collapsed && (
          <button
            onClick={onCloseMobile}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user?.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
            {user?.role === 'admin' ? 'Administrador' : 'Cliente'}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, premium }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150
              ${isActive
                ? 'bg-gradient-to-r from-purple-600/30 to-blue-800/30 text-white border border-purple-500/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }
              ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon size={18} className={`shrink-0 ${premium ? 'text-purple-400' : ''}`} />
            {!collapsed && (
              <span className="text-sm font-medium flex items-center gap-2">
                {label}
                {premium && (
                  <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">
                    PRO
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-white/8 px-2 py-3 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.restaurant_name || 'Admin'}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        )}
        <button
          data-testid="logout-button"
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
};
