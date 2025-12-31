/**
 * 积分调整弹窗
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import * as adminService from '@/services/adminService';

interface CreditAdjustModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreditAdjustModal({ userId, onClose, onSuccess }: CreditAdjustModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      setError('请输入有效的积分数量');
      return;
    }

    if (!reason.trim()) {
      setError('请填写调整原因');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adminService.adjustUserCredits(userId, numAmount, reason.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '调整积分失败');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[9999] bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">调整积分</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              积分数量
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="正数增加，负数扣除"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              输入正数增加积分，负数扣除积分
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              调整原因
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请填写调整原因..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
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
            disabled={loading}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? '处理中...' : '确认调整'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
