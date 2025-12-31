/**
 * 用户管理页面
 */

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Ban, Coins } from 'lucide-react';
import * as adminService from '@/services/adminService';
import { UserDetailModal } from './UserDetailModal';
import { CreditAdjustModal } from './CreditAdjustModal';
import { BanUserModal } from './BanUserModal';

const membershipLabels: Record<string, string> = {
  free: '免费版',
  standard: '标准版',
  advanced: '高级版',
  super: '超级版',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: '正常', color: 'bg-green-100 text-green-700' },
  banned: { label: '已封禁', color: 'bg-red-100 text-red-700' },
  suspended: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700' },
};

export function UserListPage() {
  const [users, setUsers] = useState<adminService.UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 弹窗状态
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getUserList({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openDetailModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowDetailModal(true);
  };

  const openCreditModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowCreditModal(true);
  };

  const openBanModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowBanModal(true);
  };

  const handleBanSuccess = () => {
    setShowBanModal(false);
    loadUsers();
  };

  const handleCreditSuccess = () => {
    setShowCreditModal(false);
    loadUsers();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          {/* 搜索框 */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索手机号或昵称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="banned">已封禁</option>
          </select>

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              重试
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  手机号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  会员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  积分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  注册时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const statusInfo = statusLabels[user.status] || statusLabels.active;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-violet-600 font-medium text-sm">
                              {(user.nickname || 'U').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {user.nickname || '未设置'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {maskPhone(user.phone)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {membershipLabels[user.membershipType] || user.membershipType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{user.balance}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(user.id)}
                          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openCreditModal(user.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="调整积分"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openBanModal(user.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.status === 'banned'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={user.status === 'banned' ? '解封' : '封禁'}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {showDetailModal && selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {showCreditModal && selectedUserId && (
        <CreditAdjustModal
          userId={selectedUserId}
          onClose={() => setShowCreditModal(false)}
          onSuccess={handleCreditSuccess}
        />
      )}

      {showBanModal && selectedUserId && (
        <BanUserModal
          userId={selectedUserId}
          onClose={() => setShowBanModal(false)}
          onSuccess={handleBanSuccess}
        />
      )}
    </div>
  );
}
