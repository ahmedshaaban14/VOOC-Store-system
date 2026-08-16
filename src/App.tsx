import React, { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { InventoryMovementsPage } from './pages/InventoryMovementsPage';
import { PosPage } from './pages/PosPage';
import { SalesPage } from './pages/SalesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SalesReturnsPage } from './pages/SalesReturnsPage';
import { PurchaseReturnsPage } from './pages/PurchaseReturnsPage';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { UsersPage } from './pages/UsersPage';
import { BackupRestorePage } from './pages/BackupRestorePage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { PrintSettingsPage } from './pages/PrintSettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { LoginPage } from './pages/LoginPage';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { ToastContainer } from './components/ui/Toast';
import { Shirt } from 'lucide-react';

export const App: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();
  const { currentUser, isAuthenticated, isLoading, loadCurrentUser } = useAuthStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
    loadCurrentUser();
  }, [initializeTheme, loadCurrentUser]);

  // Handle Tab Redirection if Seller tries to open restricted tab
  useEffect(() => {
    if (currentUser && currentUser.role === 'SELLER') {
      const allowedSellerTabs = ['pos', 'products', 'sales', 'sales_returns', 'customers', 'reports'];
      if (!allowedSellerTabs.includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [currentUser, activeTab, setActiveTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans dir-rtl">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse mb-3">
          <Shirt className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-300">جاري التحقق من الجلسة المحلّية...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;

      case 'products':
        return <ProductsPage />;

      case 'inventory':
        return <InventoryPage />;

      case 'inventory_movements':
        return <InventoryMovementsPage />;

      case 'pos':
        return <PosPage />;

      case 'sales':
        return <SalesPage />;

      case 'suppliers':
        return <SuppliersPage />;

      case 'purchases':
        return <PurchasesPage />;

      case 'sales_returns':
        return <SalesReturnsPage />;

      case 'purchase_returns':
        return <PurchaseReturnsPage />;

      case 'cash_register':
        return <CashRegisterPage />;

      case 'users':
        return <UsersPage />;

      case 'backup':
        return <BackupRestorePage />;

      case 'audit_logs':
        return <AuditLogsPage />;

      case 'print_settings':
        return <PrintSettingsPage />;

      case 'customers':
        return <CustomersPage />;

      case 'expenses':
        return <ExpensesPage />;

      case 'reports':
        return <ReportsPage />;

      default:
        return currentUser?.role === 'SELLER' ? <PosPage /> : <DashboardPage />;
    }
  };

  return (
    <MainLayout>
      {renderContent()}
      <ToastContainer />
    </MainLayout>
  );
};

export default App;
