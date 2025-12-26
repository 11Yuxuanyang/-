import React, { useState, useEffect } from 'react';
import { Coins, Plus } from 'lucide-react';

// localStorage 键
const COINS_KEY = 'sansa_shabi_coins';

// 获取傻币数量
function getCoins(): number {
  try {
    const stored = localStorage.getItem(COINS_KEY);
    return stored ? parseInt(stored, 10) : 100; // 初始赠送 100 傻币
  } catch {
    return 100;
  }
}

// 保存傻币数量
function saveCoins(coins: number) {
  localStorage.setItem(COINS_KEY, String(coins));
}

interface ShabiCoinsProps {
  className?: string;
}

export function ShabiCoins({ className = '' }: ShabiCoinsProps) {
  const [coins, setCoins] = useState(getCoins);
  const [showTooltip, setShowTooltip] = useState(false);

  // 监听傻币变化事件（其他组件可以触发）
  useEffect(() => {
    const handleCoinsChange = (e: CustomEvent<{ amount: number }>) => {
      setCoins(prev => {
        const newCoins = Math.max(0, prev + e.detail.amount);
        saveCoins(newCoins);
        return newCoins;
      });
    };

    window.addEventListener('shabi-coins-change', handleCoinsChange as EventListener);
    return () => {
      window.removeEventListener('shabi-coins-change', handleCoinsChange as EventListener);
    };
  }, []);

  // 同步到 localStorage
  useEffect(() => {
    saveCoins(coins);
  }, [coins]);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-full shadow-sm">
        {/* 傻币图标 */}
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-inner">
          <span className="text-[10px] font-bold text-white">傻</span>
        </div>

        {/* 数量 */}
        <span className="text-sm font-semibold text-amber-700 min-w-[2ch] text-right">
          {coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : coins}
        </span>

        {/* 充值按钮 */}
        <button
          className="w-4 h-4 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
          title="获取傻币"
        >
          <Plus size={10} className="text-amber-600" />
        </button>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
          <div className="font-medium mb-1">傻币余额</div>
          <div className="text-amber-300">{coins} 傻币</div>
          <div className="text-gray-400 mt-1 text-[10px]">用于 AI 生成消耗</div>
          {/* 箭头 */}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45" />
        </div>
      )}
    </div>
  );
}

// 工具函数：消耗傻币
export function consumeCoins(amount: number): boolean {
  const current = getCoins();
  if (current < amount) {
    return false;
  }
  window.dispatchEvent(new CustomEvent('shabi-coins-change', { detail: { amount: -amount } }));
  return true;
}

// 工具函数：增加傻币
export function addCoins(amount: number) {
  window.dispatchEvent(new CustomEvent('shabi-coins-change', { detail: { amount } }));
}

// 工具函数：获取当前傻币数量
export function getCurrentCoins(): number {
  return getCoins();
}
