import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Crown, Rocket } from 'lucide-react';

// localStorage 键
const COINS_KEY = 'sansa_shabi_coins';

// 套餐配置
const PACKAGES = [
  {
    id: 'free',
    name: '免费',
    coins: 0,
    price: 0,
    period: '永久',
    features: [
      '每日签到领 10 傻币',
      '基础 AI 生成功能',
      '标准生成速度',
    ],
  },
  {
    id: 'starter',
    name: '基础会员',
    icon: Zap,
    coins: 500,
    price: 29,
    originalPrice: 50,
    period: '月',
    monthlyPrice: 29,
    features: [
      '每月获得 500 傻币',
      '~500 张生成图片',
      '登录每日领 20 傻币',
      '生图加速',
      '高清图片导出',
    ],
  },
  {
    id: 'pro',
    name: '专业会员',
    icon: Crown,
    coins: 2000,
    price: 79,
    originalPrice: 150,
    period: '月',
    monthlyPrice: 79,
    popular: true,
    features: [
      '每月获得 2000 傻币',
      '~2000 张生成图片',
      '登录每日领 50 傻币',
      '生图优先加速',
      '高清图片导出',
      '专属客服支持',
    ],
  },
  {
    id: 'ultimate',
    name: '旗舰会员',
    icon: Rocket,
    coins: 5000,
    price: 169,
    originalPrice: 350,
    period: '月',
    monthlyPrice: 169,
    features: [
      '每月获得 5000 傻币',
      '~5000 张生成图片',
      '登录每日领 100 傻币',
      '生图最高优先级',
      '高清图片导出',
      '专属客服支持',
      '抢先体验新功能',
    ],
  },
];

// 获取傻币数量
function getCoins(): number {
  try {
    const stored = localStorage.getItem(COINS_KEY);
    return stored ? parseInt(stored, 10) : 100;
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
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    saveCoins(coins);
  }, [coins]);

  const handlePurchase = (pkg: typeof PACKAGES[0]) => {
    if (pkg.coins > 0) {
      addCoins(pkg.coins);
    }
    setShowModal(false);
  };

  return (
    <>
      <div
        className={`relative ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm transition-colors cursor-pointer"
          style={{ backgroundColor: '#F472B6' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F472B6'}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <circle cx="12" cy="12" r="10" fill="white" opacity="0.9" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="#DB2777" strokeWidth="1.5" />
              <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#DB2777">S</text>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white min-w-[2ch] text-right tabular-nums">
            {coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : coins}
          </span>
        </div>

        {showTooltip && !showModal && (
          <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
            <div className="font-medium mb-1">傻币余额</div>
            <div className="text-amber-300">{coins} 傻币</div>
            <div className="text-gray-400 mt-1 text-[10px]">点击充值</div>
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45" />
          </div>
        )}
      </div>

      {/* 充值弹窗 - 使用 Portal 渲染到 body 确保在最顶层 */}
      {showModal && createPortal(
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => setShowModal(false)}
          />
          {/* 弹窗内容 */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="relative w-full max-w-5xl bg-white rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl pointer-events-auto">
            {/* 顶部栏 */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-600 font-bold">U</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">傻币充值</div>
                  <div className="text-sm text-gray-400">选择适合你的套餐</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-gray-400">傻币余额</div>
                  <div className="font-bold text-gray-900">{coins} <span className="text-orange-500">傻币</span></div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* 套餐卡片 */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-4 gap-3">
                {PACKAGES.map((pkg) => {
                  const Icon = pkg.icon;
                  return (
                    <div
                      key={pkg.id}
                      className={`relative flex flex-col p-4 rounded-xl border-2 transition-all ${
                        pkg.popular
                          ? 'border-orange-400 shadow-lg shadow-orange-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* 推荐标签 */}
                      {pkg.popular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-medium rounded-full">
                          推荐
                        </div>
                      )}

                      {/* 套餐名称 */}
                      <div className="flex items-center gap-2 mb-3 h-6">
                        {Icon ? (
                          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                            <Icon size={12} className="text-orange-500" />
                          </div>
                        ) : (
                          <div className="w-5 h-5" />
                        )}
                        <span className="font-semibold text-gray-900 text-sm">{pkg.name}</span>
                      </div>

                      {/* 价格 */}
                      <div className="mb-0.5">
                        <span className="text-gray-400 text-xs">¥</span>
                        <span className="text-3xl font-black text-gray-900">{pkg.price}</span>
                        <span className="text-gray-400 text-xs">/{pkg.period}</span>
                        {pkg.originalPrice && (
                          <span className="ml-1 text-xs text-gray-300 line-through">¥{pkg.originalPrice}</span>
                        )}
                      </div>

                      {/* 月均价占位 */}
                      <div className="text-[10px] text-gray-400 mb-3 h-4">
                        {pkg.monthlyPrice ? `低至 ¥${pkg.monthlyPrice}/月` : '\u00A0'}
                      </div>

                      {/* 购买按钮 */}
                      <button
                        onClick={() => handlePurchase(pkg)}
                        className={`w-full py-2 rounded-lg font-medium transition-colors mb-3 text-sm ${
                          pkg.price === 0
                            ? 'bg-gray-100 text-gray-400 cursor-default'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                        disabled={pkg.price === 0}
                      >
                        {pkg.price === 0 ? '免费' : '立即订购'}
                      </button>

                      {/* 傻币数量占位 */}
                      <div className="text-xs mb-2 h-4">
                        {pkg.coins > 0 ? (
                          <>每月获得 <span className="font-bold text-orange-500">{pkg.coins}</span> 傻币</>
                        ) : '\u00A0'}
                      </div>

                      {/* 功能列表 */}
                      <ul className="space-y-1">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <span className="text-gray-300">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 底部说明 */}
            <div className="px-6 py-3 bg-gray-50 text-center text-xs text-gray-400">
              傻币用于 AI 生成消耗，购买即表示同意 <span className="text-gray-600 hover:underline cursor-pointer">服务条款</span> 和 <span className="text-gray-600 hover:underline cursor-pointer">隐私政策</span>
            </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
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
