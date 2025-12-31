/**
 * 用户管理页面 - 可展开行显示详情
 */

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Ban, Coins, Loader2 } from 'lucide-react';
import * as adminService from '@/services/adminService';
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

const transactionTypeLabels: Record<string, string> = {
  purchase: '充值',
  consume: '消费',
  daily_signin: '签到',
  register_bonus: '注册奖励',
  admin_grant: '管理员发放',
  admin_deduct: '管理员扣除',
  refund: '退款',
  monthly_grant: '月度发放',
};

export function UserListPage() {
  const [users, setUsers] = useState<adminService.UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 展开行状态
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedUserDetail, setExpandedUserDetail] = useState<adminService.UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 弹窗状态
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  const toggleExpand = async (userId: string) => {
    if (expandedUserId === userId) {
      // 收起
      setExpandedUserId(null);
      setExpandedUserDetail(null);
    } else {
      // 展开并加载详情
      setExpandedUserId(userId);
      setExpandedUserDetail(null);
      setLoadingDetail(true);
      try {
        const detail = await adminService.getUserDetail(userId);
        setExpandedUserDetail(detail);
      } catch (err) {
        console.error('加载用户详情失败:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const openCreditModal = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserId(userId);
    setShowCreditModal(true);
  };

  const openBanModal = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserId(userId);
    setShowBanModal(true);
  };

  const handleBanSuccess = () => {
    setShowBanModal(false);
    loadUsers();
    // 如果展开的用户被操作，重新加载详情
    if (expandedUserId) {
      toggleExpand(expandedUserId);
      setTimeout(() => toggleExpand(expandedUserId), 100);
    }
  };

  const handleCreditSuccess = () => {
    setShowCreditModal(false);
    loadUsers();
    // 如果展开的用户被操作，重新加载详情
    if (expandedUserId) {
      toggleExpand(expandedUserId);
      setTimeout(() => toggleExpand(expandedUserId), 100);
    }
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
                <th className="w-8"></th>
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
                const isExpanded = expandedUserId === user.id;
                return (
                  <>
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-violet-50' : ''}`}
                      onClick={() => toggleExpand(user.id)}
                    >
                      <td className="pl-4 py-4">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-violet-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
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
                            onClick={(e) => openCreditModal(user.id, e)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="调整积分"
                          >
                            <Coins className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => openBanModal(user.id, e)}
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
                    {/* 展开的详情行 */}
                    {isExpanded && (
                      <tr key={`${user.id}-detail`}>
                        <td colSpan={8} className="bg-gray-50 px-6 py-4">
                          {loadingDetail ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                              <span className="ml-2 text-gray-500">加载中...</span>
                            </div>
                          ) : expandedUserDetail ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* 左侧：积分和统计 */}
                              <div className="space-y-4">
                                {/* 积分信息 */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">积分信息</h4>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-violet-100 rounded-lg p-3 text-center">
                                      <span className="text-xs text-violet-600">当前余额</span>
                                      <p className="text-xl font-bold text-violet-700">{expandedUserDetail.balance}</p>
                                    </div>
                                    <div className="bg-green-100 rounded-lg p-3 text-center">
                                      <span className="text-xs text-green-600">累计获得</span>
                                      <p className="text-xl font-bold text-green-700">{expandedUserDetail.totalEarned}</p>
                                    </div>
                                    <div className="bg-orange-100 rounded-lg p-3 text-center">
                                      <span className="text-xs text-orange-600">累计消费</span>
                                      <p className="text-xl font-bold text-orange-700">{expandedUserDetail.totalSpent}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* 使用统计 */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">使用统计</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <span className="text-xs text-gray-500">项目数量</span>
                                      <p className="text-lg font-semibold text-gray-900">{expandedUserDetail.projectCount}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <span className="text-xs text-gray-500">图片生成</span>
                                      <p className="text-lg font-semibold text-gray-900">{expandedUserDetail.generationCount}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* 聊天统计 */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">聊天统计</h4>
                                  <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                                      <span className="text-xs text-gray-500">对话次数</span>
                                      <p className="text-base font-semibold text-gray-900">{expandedUserDetail.chatStats.totalChats}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                                      <span className="text-xs text-gray-500">输入 Tokens</span>
                                      <p className="text-base font-semibold text-green-600">
                                        {(expandedUserDetail.chatStats.totalPromptTokens / 1000).toFixed(1)}k
                                      </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                                      <span className="text-xs text-gray-500">输出 Tokens</span>
                                      <p className="text-base font-semibold text-blue-600">
                                        {(expandedUserDetail.chatStats.totalCompletionTokens / 1000).toFixed(1)}k
                                      </p>
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg p-2 border border-gray-200 flex justify-between text-sm">
                                    <span className="text-gray-500">聊天成本</span>
                                    <span className="text-orange-600 font-medium">¥{(expandedUserDetail.chatStats.totalCost / 100).toFixed(4)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 右侧：最近交易 */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">最近交易</h4>
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  {expandedUserDetail.recentTransactions.length > 0 ? (
                                    <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                      {expandedUserDetail.recentTransactions.map((tx) => (
                                        <div
                                          key={tx.id}
                                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                                        >
                                          <div>
                                            <span className="text-sm font-medium text-gray-900">
                                              {transactionTypeLabels[tx.type] || tx.type}
                                            </span>
                                            {tx.description && (
                                              <p className="text-xs text-gray-500 truncate max-w-48">{tx.description}</p>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <span
                                              className={`font-medium text-sm ${
                                                tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                                              }`}
                                            >
                                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </span>
                                            <p className="text-xs text-gray-400">
                                              {formatDate(tx.createdAt)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="p-4 text-sm text-gray-500 text-center">暂无交易记录</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">加载失败</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
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

      {/* 弹窗 - 只保留调整积分和封禁 */}
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
