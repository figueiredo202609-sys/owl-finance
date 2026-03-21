# Owl Finance - PRD

## Visão Geral
**Plataforma SaaS** de controle financeiro para donos de restaurantes.  
**Data de início:** Março 2026 | **Última atualização:** Fevereiro 2026

## Stack Técnica
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui + Recharts + Lucide React + Sonner
- **Backend:** FastAPI (Python) + MongoDB (motor) + JWT
- **IA/OCR:** GPT-4o via emergentintegrations (EMERGENT_LLM_KEY)
- **Auth:** JWT Bearer Tokens (7 dias)
- **Fontes:** Manrope (títulos) + Inter (corpo)

## Credenciais de Teste
- **Admin:** figueiredo202609@gmail.com / Aires100686
- **Cliente:** owltest@test.com / Client123! (Plano Profissional)

## Arquitetura
```
/app/backend/server.py           - FastAPI completo (auth, admin, client, OCR, plans)
/app/frontend/src/
  App.js                          - Roteamento + ProtectedRoute
  contexts/AuthContext.js         - Auth state management
  lib/api.js                      - Axios instance + helpers
  components/Sidebar.js           - Navegação lateral
  components/DashboardBubble.js   - Bolha animada CSS
  pages/LoginPage.js              - Login com background restaurant
  pages/admin/AdminDashboard.js   - Stats + AreaChart + PieChart
  pages/admin/AdminClients.js     - CRUD completo de clientes
  pages/admin/AdminReceipts.js    - Visualização de comprovantes
  pages/admin/AdminBilling.js     - Cards de planos (placeholder)
  pages/client/ClientDashboard.js - 3 bolhas animadas + gráfico
  pages/client/UploadReceipt.js   - Drag&drop + câmera + OCR
  pages/client/ProfitsPage.js     - CRUD de lucros
  pages/client/ExpensesPage.js    - CRUD de despesas
  pages/client/HistoryPage.js     - Histórico com filtros
  pages/client/ProfilePage.js     - Edição de perfil + info plano
```

## O que foi implementado (Fevereiro 2026)
- [x] MVP completo — login separado admin/cliente, JWT auth
- [x] Admin auto-criado no startup + cliente de teste com dados sample
- [x] Painel Admin: dashboard com gráficos, CRUD clientes (criar/editar/excluir/toggle status/selecionar plano)
- [x] Painel Admin: visualização de comprovantes, cobranças (placeholder)
- [x] Painel Cliente: dashboard 3 bolhas animadas (Lucros/Despesas/Saldo)
- [x] Painel Cliente: upload + câmera + OCR com GPT-4o (apenas Profissional/Premium)
- [x] Painel Cliente: CRUD de lucros e despesas com modais
- [x] Painel Cliente: histórico com filtros por tipo e data (limitado por plano)
- [x] Painel Cliente: perfil com edição e info de plano
- [x] Sistema de Planos (Básico/Profissional/Premium) — restrições no backend E frontend
- [x] Autenticação bcrypt direto (sem passlib) — hash seguro e consistente
- [x] Design dark mode: fundo #020617, bolhas gradiente roxo-azul, fonte Manrope

## Backlog Priorizado

### P0 — Crítico
- [x] Sistema de planos frontend — CONCLUÍDO

### P1 — Alta Prioridade
- [ ] Exportação PDF/Excel por período (Profissional/Premium)
- [ ] Histórico de comprovantes com miniaturas de imagens
- [ ] Notificações por e-mail (vencimento, relatórios mensais)
- [ ] Gráficos de evolução financeira mais detalhados (por categoria)

### P2 — Melhorias Futuras
- [ ] Integração real com gateway de pagamento (Stripe/PagSeguro)
- [ ] Modo demonstração com dados fictícios
- [ ] Relatórios mensais automáticos por e-mail
- [ ] Rate limiting no endpoint de login
- [ ] Multi-moeda
- [ ] App mobile (PWA)
- [ ] Modo multi-restaurante por cliente
