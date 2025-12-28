/**
 * 积分显示组件
 * 单按钮显示余额，点击打开会员充值弹窗
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getCreditsBalance,
  CreditBalance,
} from '@/services/api';
import { MembershipModal } from './MembershipModal';

interface CreditDisplayProps {
  onBalanceChange?: (balance: number) => void;
}

export function CreditDisplay({ onBalanceChange }: CreditDisplayProps) {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await getCreditsBalance();
      setBalance(data);
      onBalanceChange?.(data.balance);
    } catch (error) {
      console.error('获取积分余额失败:', error);
    } finally {
      setLoading(false);
    }
  }, [onBalanceChange]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchBalance();
    } else {
      setLoading(false);
    }
  }, [fetchBalance]);

  // 格式化余额显示
  const formatBalance = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}w`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // 未登录状态 - 显示默认按钮
  if (!localStorage.getItem('auth_token')) {
    return (
      <>
        <button
          onClick={() => setShowMembershipModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm transition-colors cursor-pointer"
          style={{ backgroundColor: '#F472B6' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F472B6'}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {/* 傻币图标 - 基于三傻logo设计 */}
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              {/* 金币背景 */}
              <circle cx="12" cy="12" r="11" fill="#FCD34D" />
              <circle cx="12" cy="12" r="9" fill="#FBBF24" />
              <circle cx="12" cy="12" r="7.5" fill="#F59E0B" />
              {/* 三个小幽灵剪影 */}
              <g transform="translate(6, 5) scale(0.5)">
                {/* 顶部幽灵 - 紫色 */}
                <path d="M12 0C9 0 7 2 7 4.5V8C7 8 7.4 7.4 8 8C8.6 8.6 9 8 9.5 8C10 8 10.3 8.6 12 8C13.7 8.6 14 8 14.5 8C15 8 15.4 8.6 16 8C16.6 7.4 17 8 17 8V4.5C17 2 15 0 12 0Z" fill="white" opacity="0.95"/>
                {/* 左下幽灵 - 橙色 */}
                <path d="M6.5 7C3.5 7 1.5 9 1.5 11.5V15C1.5 15 1.9 14.4 2.5 15C3.1 15.6 3.5 15 4 15C4.5 15 4.8 15.6 6.5 15C8.2 15.6 8.5 15 9 15C9.5 15 9.9 15.6 10.5 15C11.1 14.4 11.5 15 11.5 15V11.5C11.5 9 9.5 7 6.5 7Z" fill="white" opacity="0.9"/>
                {/* 右下幽灵 - 青色 */}
                <path d="M17.5 7C14.5 7 12.5 9 12.5 11.5V15C12.5 15 12.9 14.4 13.5 15C14.1 15.6 14.5 15 15 15C15.5 15 15.8 15.6 17.5 15C19.2 15.6 19.5 15 20 15C20.5 15 20.9 15.6 21.5 15C22.1 14.4 22.5 15 22.5 15V11.5C22.5 9 20.5 7 17.5 7Z" fill="white" opacity="0.9"/>
              </g>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white min-w-[2ch] text-right tabular-nums">
            0
          </span>
        </button>

        {showMembershipModal && createPortal(
          <MembershipModal
            currentBalance={0}
            currentMembership={null}
            onClose={() => setShowMembershipModal(false)}
            onPurchaseSuccess={() => setShowMembershipModal(false)}
          />,
          document.body
        )}
      </>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm" style={{ backgroundColor: '#F472B6' }}>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white">...</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowMembershipModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm transition-colors cursor-pointer"
        style={{ backgroundColor: '#F472B6' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F472B6'}
        title={`傻币余额: ${balance?.balance ?? 0}，点击充值`}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {/* 傻币图标 - 基于三傻logo设计 */}
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            {/* 金币背景 */}
            <circle cx="12" cy="12" r="11" fill="#FCD34D" />
            <circle cx="12" cy="12" r="9" fill="#FBBF24" />
            <circle cx="12" cy="12" r="7.5" fill="#F59E0B" />
            {/* 三个小幽灵剪影 */}
            <g transform="translate(6, 5) scale(0.5)">
              {/* 顶部幽灵 */}
              <path d="M12 0C9 0 7 2 7 4.5V8C7 8 7.4 7.4 8 8C8.6 8.6 9 8 9.5 8C10 8 10.3 8.6 12 8C13.7 8.6 14 8 14.5 8C15 8 15.4 8.6 16 8C16.6 7.4 17 8 17 8V4.5C17 2 15 0 12 0Z" fill="white" opacity="0.95"/>
              {/* 左下幽灵 */}
              <path d="M6.5 7C3.5 7 1.5 9 1.5 11.5V15C1.5 15 1.9 14.4 2.5 15C3.1 15.6 3.5 15 4 15C4.5 15 4.8 15.6 6.5 15C8.2 15.6 8.5 15 9 15C9.5 15 9.9 15.6 10.5 15C11.1 14.4 11.5 15 11.5 15V11.5C11.5 9 9.5 7 6.5 7Z" fill="white" opacity="0.9"/>
              {/* 右下幽灵 */}
              <path d="M17.5 7C14.5 7 12.5 9 12.5 11.5V15C12.5 15 12.9 14.4 13.5 15C14.1 15.6 14.5 15 15 15C15.5 15 15.8 15.6 17.5 15C19.2 15.6 19.5 15 20 15C20.5 15 20.9 15.6 21.5 15C22.1 14.4 22.5 15 22.5 15V11.5C22.5 9 20.5 7 17.5 7Z" fill="white" opacity="0.9"/>
            </g>
          </svg>
        </div>
        <span className="text-sm font-semibold text-white min-w-[2ch] text-right tabular-nums">
          {formatBalance(balance?.balance ?? 0)}
        </span>
        {balance?.membership && (
          <span className="px-1.5 py-0.5 text-xs bg-white/20 text-white rounded-full">
            {balance.membership.planName.replace('会员', '')}
          </span>
        )}
      </button>

      {/* 会员套餐弹窗 */}
      {showMembershipModal && createPortal(
        <MembershipModal
          currentBalance={balance?.balance ?? 0}
          currentMembership={balance?.membership ?? null}
          onClose={() => setShowMembershipModal(false)}
          onPurchaseSuccess={() => {
            fetchBalance();
            setShowMembershipModal(false);
          }}
        />,
        document.body
      )}
    </>
  );
}

export default CreditDisplay;
