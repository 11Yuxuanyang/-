/**
 * 封禁/解封用户弹窗
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import * as adminService from '@/services/adminService';

interface BanUserModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BanUserModal({ userId, onClose, onSuccess }: BanUserModalProps) {
  const [user, setUser] = useState<adminService.UserDetail | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      const data = await adminService.getUserDetail(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const isBanned = user?.status === 'banned';

  const handleSubmit = async () => {
    if (!isBanned && !reason.trim()) {
      setError('请填写封禁原因');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isBanned) {
        await adminService.unbanUser(userId);
      } else {
        await adminService.banUser(userId, reason.trim());
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[9999] bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isBanned ? '解封用户' : '封禁用户'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {user && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-violet-600 font-medium">
                        {(user.nickname || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.nickname}</p>
                      <p className="text-sm text-gray-500">{user.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {isBanned ? (
                <p className="text-sm text-gray-600">
                  确定要解封该用户吗？解封后用户可以正常登录和使用服务。
                </p>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    封禁原因
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="请填写封禁原因..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
              isBanned
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? '处理中...' : isBanned ? '确认解封' : '确认封禁'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
