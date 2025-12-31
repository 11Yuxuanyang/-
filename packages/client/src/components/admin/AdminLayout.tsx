/**
 * 管理后台布局组件
 */

import { useState } from 'react';
import { User, logout as authLogout } from '@/services/auth';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';

interface AdminLayoutProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const menuItems = [
  { id: 'overview', label: '仪表盘', icon: LayoutDashboard },
  { id: 'users', label: '用户管理', icon: Users },
  { id: 'orders', label: '订单管理', icon: ShoppingCart },
  { id: 'config', label: '系统配置', icon: Settings },
];

export function AdminLayout({
  user,
  activeTab,
  onTabChange,
  onLogout,
  children,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    authLogout();
    onLogout();
  };

  const handleBackToHome = () => {
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside
        className={`bg-gray-900 text-white flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {!sidebarCollapsed && (
            <span className="text-lg font-semibold">管理后台</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 底部操作 */}
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={handleBackToHome}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
            {!sidebarCollapsed && <span>返回首页</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 mt-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-gray-900">
            {menuItems.find((m) => m.id === activeTab)?.label || '仪表盘'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.nickname || user.phone}
            </span>
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-violet-600 font-medium text-sm">
                {(user.nickname || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
