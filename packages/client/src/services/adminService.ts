/**
 * 管理后台 API 服务
 */

import { authFetch } from './auth';

// ============ 类型定义 ============

export interface OverviewStats {
  totalUsers: number;
  newUsersToday: number;
  activeUsers24h: number;
  totalRevenue: number;
  revenueToday: number;
  totalGenerations: number;
  generationsToday: number;
  paidMembers: number;
}

export interface UserListItem {
  id: string;
  phone: string;
  nickname: string;
  avatarUrl: string | null;
  membershipType: string;
  status: string;
  balance: number;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface UserDetail extends UserListItem {
  totalEarned: number;
  totalSpent: number;
  projectCount: number;
  generationCount: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  chatStats: {
    totalChats: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalInputCost: number;
    totalOutputCost: number;
    totalCost: number;
  };
}

export interface OrderListItem {
  id: string;
  orderNo: string;
  userId: string;
  userName: string;
  userPhone: string;
  planId: string;
  planName: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChatStats {
  totalChats: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  cacheHitRate: number;
  totalInputCost: number;
  totalOutputCost: number;
  totalCacheSavings: number;
  totalCost: number;
  totalCredits: number;
  byModel: Array<{
    model: string;
    count: number;
    promptTokens: number;
    completionTokens: number;
    tokens: number;
    cacheReadTokens: number;
    inputCost: number;
    outputCost: number;
    cacheSavings: number;
    cost: number;
  }>;
}

// ============ API 函数 ============

/**
 * 获取概览统计
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  const res = await authFetch('/api/admin/stats/overview');
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取统计失败');
  return data.data;
}

/**
 * 获取用户趋势数据
 */
export async function getUserStats(period: string = '7d') {
  const res = await authFetch(`/api/admin/stats/users?period=${period}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取用户统计失败');
  return data.data;
}

/**
 * 获取收入趋势数据
 */
export async function getRevenueStats(period: string = '30d') {
  const res = await authFetch(`/api/admin/stats/revenue?period=${period}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取收入统计失败');
  return data.data;
}

/**
 * 获取使用统计
 */
export async function getUsageStats(period: string = '7d') {
  const res = await authFetch(`/api/admin/stats/usage?period=${period}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取使用统计失败');
  return data.data;
}

/**
 * 获取聊天统计
 */
export async function getChatStats(period: string = '7d'): Promise<ChatStats> {
  const res = await authFetch(`/api/admin/stats/chat?period=${period}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取聊天统计失败');
  return data.data;
}

/**
 * 获取用户列表
 */
export async function getUserList(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  membershipType?: string;
}): Promise<PaginatedResult<UserListItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.membershipType) query.set('membershipType', params.membershipType);

  const res = await authFetch(`/api/admin/users?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取用户列表失败');

  return {
    items: data.data.users,
    total: data.data.total,
    page: data.data.page,
    limit: data.data.limit,
    totalPages: data.data.totalPages,
  };
}

/**
 * 获取用户详情
 */
export async function getUserDetail(userId: string): Promise<UserDetail> {
  const res = await authFetch(`/api/admin/users/${userId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取用户详情失败');
  return data.data.user;
}

/**
 * 调整用户积分
 */
export async function adjustUserCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const res = await authFetch(`/api/admin/users/${userId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '调整积分失败');
}

/**
 * 封禁用户
 */
export async function banUser(userId: string, reason: string): Promise<void> {
  const res = await authFetch(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '封禁用户失败');
}

/**
 * 解封用户
 */
export async function unbanUser(userId: string): Promise<void> {
  const res = await authFetch(`/api/admin/users/${userId}/unban`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '解封用户失败');
}

/**
 * 获取订单列表
 */
export async function getOrderList(params: {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResult<OrderListItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.status) query.set('status', params.status);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  const res = await authFetch(`/api/admin/orders?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '获取订单列表失败');

  return {
    items: data.data.orders,
    total: data.data.total,
    page: data.data.page,
    limit: data.data.limit,
    totalPages: data.data.totalPages,
  };
}

/**
 * 处理退款
 */
export async function refundOrder(
  orderId: string,
  reason: string,
  refundCredits: boolean = false
): Promise<void> {
  const res = await authFetch(`/api/admin/orders/${orderId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason, refundCredits }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '处理退款失败');
}
