/**
 * 仪表盘概览页面
 */

import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  CreditCard,
  Zap,
  UserPlus,
  Activity,
  MessageSquare,
} from 'lucide-react';
import * as adminService from '@/services/adminService';

interface StatsCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function StatsCard({ title, value, subValue, icon, trend, trendValue }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className="p-3 bg-violet-50 rounded-lg">{icon}</div>
      </div>
      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-1">
          <span
            className={`text-sm font-medium ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
          <span className="text-sm text-gray-500">较昨日</span>
        </div>
      )}
    </div>
  );
}

interface UsageBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function UsageBar({ label, count, total, color }: UsageBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const [stats, setStats] = useState<adminService.OverviewStats | null>(null);
  const [usageStats, setUsageStats] = useState<Array<{ type: string; count: number; credits: number }>>([]);
  const [chatStats, setChatStats] = useState<adminService.ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, usageData, chatData] = await Promise.all([
        adminService.getOverviewStats(),
        adminService.getUsageStats('7d'),
        adminService.getChatStats('7d'),
      ]);
      setStats(overviewData);
      setUsageStats(usageData);
      setChatStats(chatData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const totalUsage = usageStats.reduce((sum, u) => sum + u.count, 0);

  const typeLabels: Record<string, string> = {
    generate: '文生图',
    edit: '图生图',
    inpaint: '擦除重绘',
    upscale: '图片放大',
  };

  const typeColors: Record<string, string> = {
    generate: 'bg-violet-500',
    edit: 'bg-blue-500',
    inpaint: 'bg-green-500',
    upscale: 'bg-orange-500',
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="总用户数"
          value={stats.totalUsers.toLocaleString()}
          subValue={`今日新增 ${stats.newUsersToday}`}
          icon={<Users className="w-6 h-6 text-violet-600" />}
        />
        <StatsCard
          title="付费会员"
          value={stats.paidMembers.toLocaleString()}
          subValue={`转化率 ${stats.totalUsers > 0 ? ((stats.paidMembers / stats.totalUsers) * 100).toFixed(1) : 0}%`}
          icon={<UserPlus className="w-6 h-6 text-violet-600" />}
        />
        <StatsCard
          title="总收入"
          value={`¥${stats.totalRevenue.toLocaleString()}`}
          subValue={`今日 ¥${stats.revenueToday.toLocaleString()}`}
          icon={<CreditCard className="w-6 h-6 text-violet-600" />}
        />
        <StatsCard
          title="24h 活跃用户"
          value={stats.activeUsers24h.toLocaleString()}
          icon={<Activity className="w-6 h-6 text-violet-600" />}
        />
      </div>

      {/* 下方内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI 图片生成统计 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">AI 图片统计</h3>
            <span className="text-sm text-gray-500">近 7 天</span>
          </div>

          <div className="space-y-4">
            {usageStats.map((usage) => (
              <UsageBar
                key={usage.type}
                label={typeLabels[usage.type] || usage.type}
                count={usage.count}
                total={totalUsage}
                color={typeColors[usage.type] || 'bg-gray-500'}
              />
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">总生成次数</span>
              <span className="font-semibold text-gray-900">
                {stats.totalGenerations.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">今日生成</span>
              <span className="font-semibold text-gray-900">
                {stats.generationsToday.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* AI 聊天统计 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI 聊天统计</h3>
            </div>
            <span className="text-sm text-gray-500">近 7 天</span>
          </div>

          {chatStats && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-violet-50 rounded-lg">
                  <p className="text-xl font-bold text-violet-600">{chatStats.totalChats}</p>
                  <p className="text-xs text-gray-600 mt-1">对话次数</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{(chatStats.totalPromptTokens / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-gray-600 mt-1">输入 Tokens</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{(chatStats.totalCompletionTokens / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-gray-600 mt-1">输出 Tokens</p>
                </div>
              </div>

              <div className="space-y-2">
                {chatStats.byModel.slice(0, 3).map((model) => (
                  <div key={model.model} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 truncate max-w-[120px]" title={model.model}>
                        {model.model.split('/').pop()}
                      </span>
                      <span className="font-medium text-gray-900">{model.count} 次</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500 mt-1">
                      <span>入: {(model.promptTokens / 1000).toFixed(1)}k</span>
                      <span>出: {(model.completionTokens / 1000).toFixed(1)}k</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 缓存命中统计 */}
              {chatStats.cacheHitRate > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">缓存命中率</span>
                    <span className="font-bold text-emerald-600">{chatStats.cacheHitRate}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-emerald-600">缓存节省</span>
                    <span className="text-sm font-medium text-emerald-600">
                      ¥{(chatStats.totalCacheSavings / 100).toFixed(4)}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">输入费用</span>
                  <span className="font-medium text-green-600">
                    ¥{(chatStats.totalInputCost / 100).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">输出费用</span>
                  <span className="font-medium text-blue-600">
                    ¥{(chatStats.totalOutputCost / 100).toFixed(4)}
                  </span>
                </div>
                {chatStats.totalCacheSavings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">缓存节省</span>
                    <span className="font-medium text-emerald-600">
                      -¥{(chatStats.totalCacheSavings / 100).toFixed(4)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">总成本</span>
                  <span className="font-bold text-orange-600">
                    ¥{(chatStats.totalCost / 100).toFixed(4)}
                  </span>
                </div>
              </div>
            </>
          )}

          {!chatStats && (
            <div className="text-center py-8 text-gray-500">暂无数据</div>
          )}
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">快速操作</h3>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => window.location.hash = '#/admin/users'}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              <Users className="w-5 h-5 text-violet-600" />
              <span className="font-medium text-gray-900">用户管理</span>
            </button>
            <button
              onClick={() => window.location.hash = '#/admin/orders'}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              <CreditCard className="w-5 h-5 text-violet-600" />
              <span className="font-medium text-gray-900">订单管理</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-violet-600" />
              <span className="font-medium text-gray-900">刷新数据</span>
            </button>
            <button
              onClick={() => window.location.hash = '#/admin/config'}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              <Zap className="w-5 h-5 text-violet-600" />
              <span className="font-medium text-gray-900">系统配置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
