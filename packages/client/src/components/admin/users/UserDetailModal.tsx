/**
 * 用户详情弹窗
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import * as adminService from '@/services/adminService';

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
}

const membershipLabels: Record<string, string> = {
  free: '免费版',
  standard: '标准版',
  advanced: '高级版',
  super: '超级版',
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

export function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const [user, setUser] = useState<adminService.UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUserDetail(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户详情失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const modal = (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[9999] bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">用户详情</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : user ? (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">昵称</span>
                    <p className="font-medium text-gray-900">{user.nickname}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">手机号</span>
                    <p className="font-medium text-gray-900">{user.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">会员类型</span>
                    <p className="font-medium text-gray-900">
                      {membershipLabels[user.membershipType] || user.membershipType}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">注册时间</span>
                    <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* 积分信息 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">积分信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-violet-50 rounded-lg p-4">
                    <span className="text-sm text-violet-600">当前余额</span>
                    <p className="text-2xl font-bold text-violet-700">{user.balance}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <span className="text-sm text-green-600">累计获得</span>
                    <p className="text-2xl font-bold text-green-700">{user.totalEarned}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <span className="text-sm text-orange-600">累计消费</span>
                    <p className="text-2xl font-bold text-orange-700">{user.totalSpent}</p>
                  </div>
                </div>
              </div>

              {/* 使用统计 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">使用统计</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">项目数量</span>
                    <p className="font-medium text-gray-900">{user.projectCount}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">图片生成次数</span>
                    <p className="font-medium text-gray-900">{user.generationCount}</p>
                  </div>
                </div>
              </div>

              {/* 聊天 Token 统计 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">聊天 Token 统计</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <span className="text-xs text-violet-600">对话次数</span>
                    <p className="text-xl font-bold text-violet-700">{user.chatStats.totalChats}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <span className="text-xs text-green-600">输入 Tokens</span>
                    <p className="text-xl font-bold text-green-700">
                      {(user.chatStats.totalPromptTokens / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <span className="text-xs text-blue-600">输出 Tokens</span>
                    <p className="text-xl font-bold text-blue-700">
                      {(user.chatStats.totalCompletionTokens / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">输入费用</span>
                    <span className="text-green-600">¥{(user.chatStats.totalInputCost / 100).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">输出费用</span>
                    <span className="text-blue-600">¥{(user.chatStats.totalOutputCost / 100).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">总成本</span>
                    <span className="text-orange-600 font-bold">¥{(user.chatStats.totalCost / 100).toFixed(4)}</span>
                  </div>
                </div>
              </div>

              {/* 最近交易 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">最近交易</h3>
                {user.recentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {user.recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {transactionTypeLabels[tx.type] || tx.type}
                          </span>
                          {tx.description && (
                            <p className="text-xs text-gray-500">{tx.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-medium ${
                              tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">暂无交易记录</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
