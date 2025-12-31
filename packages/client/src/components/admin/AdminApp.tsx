/**
 * 管理后台入口组件
 */

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { AdminLayout } from './AdminLayout';
import { OverviewPage } from './dashboard/OverviewPage';
import { UserListPage } from './users/UserListPage';
import { OrderListPage } from './orders/OrderListPage';

interface AdminAppProps {
  user: User;
  onLogout: () => void;
}

export function AdminApp({ user, onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // 解析子路由
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === '/admin' || hash === '/admin/overview') {
        setActiveTab('overview');
      } else if (hash === '/admin/users') {
        setActiveTab('users');
      } else if (hash === '/admin/orders') {
        setActiveTab('orders');
      } else if (hash === '/admin/config') {
        setActiveTab('config');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/admin/${tab === 'overview' ? '' : tab}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'users':
        return <UserListPage />;
      case 'orders':
        return <OrderListPage />;
      case 'config':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">系统配置功能开发中...</p>
          </div>
        );
      default:
        return <OverviewPage />;
    }
  };

  return (
    <AdminLayout
      user={user}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onLogout={onLogout}
    >
      {renderContent()}
    </AdminLayout>
  );
}
