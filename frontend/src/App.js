import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminClients from '@/pages/admin/AdminClients';
import AdminReceipts from '@/pages/admin/AdminReceipts';
import AdminBilling from '@/pages/admin/AdminBilling';
import ClientDashboard from '@/pages/client/ClientDashboard';
import UploadReceipt from '@/pages/client/UploadReceipt';
import ProfitsPage from '@/pages/client/ProfitsPage';
import ExpensesPage from '@/pages/client/ExpensesPage';
import HistoryPage from '@/pages/client/HistoryPage';
import ProfilePage from '@/pages/client/ProfilePage';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard'} replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard'} replace />
          : <LoginPage />
      } />
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/clients" element={<ProtectedRoute role="admin"><AdminClients /></ProtectedRoute>} />
      <Route path="/admin/receipts" element={<ProtectedRoute role="admin"><AdminReceipts /></ProtectedRoute>} />
      <Route path="/admin/billing" element={<ProtectedRoute role="admin"><AdminBilling /></ProtectedRoute>} />
      <Route path="/client/dashboard" element={<ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>} />
      <Route path="/client/upload" element={<ProtectedRoute role="client"><UploadReceipt /></ProtectedRoute>} />
      <Route path="/client/profits" element={<ProtectedRoute role="client"><ProfitsPage /></ProtectedRoute>} />
      <Route path="/client/expenses" element={<ProtectedRoute role="client"><ExpensesPage /></ProtectedRoute>} />
      <Route path="/client/history" element={<ProtectedRoute role="client"><HistoryPage /></ProtectedRoute>} />
      <Route path="/client/profile" element={<ProtectedRoute role="client"><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="bottom-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
