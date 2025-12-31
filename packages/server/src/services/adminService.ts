/**
 * 管理后台服务
 * 处理管理员相关的业务逻辑
 */

import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { logAdminAction } from '../middleware/adminAuth';

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

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  membershipType?: string;
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
  // 聊天 token 统计
  chatStats: {
    totalChats: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalInputCost: number;
    totalOutputCost: number;
    totalCost: number;
  };
}

export interface OrderListParams {
  page: number;
  limit: number;
  status?: string;
  startDate?: string;
  endDate?: string;
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

// ============ 仪表盘统计 ============

/**
 * 获取概览统计数据
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 并行查询多个统计数据
  const [
    usersResult,
    newUsersResult,
    activeUsersResult,
    revenueResult,
    revenueTodayResult,
    generationsResult,
    generationsTodayResult,
    paidMembersResult,
  ] = await Promise.all([
    // 总用户数
    supabase!.from('users').select('id', { count: 'exact', head: true }),
    // 今日新增用户
    supabase!
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    // 24小时活跃用户（有消费记录）
    supabase!
      .from('credit_consumptions')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', yesterday),
    // 总收入（分 -> 元）
    supabase!
      .from('payment_orders')
      .select('amount')
      .eq('status', 'paid'),
    // 今日收入
    supabase!
      .from('payment_orders')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', todayStart),
    // 总生成次数
    supabase!
      .from('credit_consumptions')
      .select('id', { count: 'exact', head: true }),
    // 今日生成次数
    supabase!
      .from('credit_consumptions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    // 付费会员数
    supabase!
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('membership_type', 'free'),
  ]);

  // 计算总收入
  const totalRevenue = revenueResult.data?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
  const revenueToday = revenueTodayResult.data?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

  return {
    totalUsers: usersResult.count || 0,
    newUsersToday: newUsersResult.count || 0,
    activeUsers24h: activeUsersResult.count || 0,
    totalRevenue: totalRevenue / 100, // 分转元
    revenueToday: revenueToday / 100,
    totalGenerations: generationsResult.count || 0,
    generationsToday: generationsTodayResult.count || 0,
    paidMembers: paidMembersResult.count || 0,
  };
}

/**
 * 获取用户趋势数据
 */
export async function getUserStats(period: string = '7d') {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const days = period === '30d' ? 30 : 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 查询每日注册用户
  const { data: registrations } = await supabase!
    .from('users')
    .select('created_at')
    .gte('created_at', startDate.toISOString());

  // 按日期分组
  const dailyData: Record<string, { registrations: number; active: number }> = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    dailyData[key] = { registrations: 0, active: 0 };
  }

  registrations?.forEach((u) => {
    const key = new Date(u.created_at).toISOString().split('T')[0];
    if (dailyData[key]) {
      dailyData[key].registrations++;
    }
  });

  return Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 获取收入趋势数据
 */
export async function getRevenueStats(period: string = '30d') {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const days = period === '7d' ? 7 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: orders } = await supabase!
    .from('payment_orders')
    .select('amount, paid_at, plan_id')
    .eq('status', 'paid')
    .gte('paid_at', startDate.toISOString());

  // 按日期分组
  const dailyData: Record<string, number> = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    dailyData[key] = 0;
  }

  orders?.forEach((o) => {
    if (o.paid_at) {
      const key = new Date(o.paid_at).toISOString().split('T')[0];
      if (dailyData[key] !== undefined) {
        dailyData[key] += o.amount / 100; // 分转元
      }
    }
  });

  return Object.entries(dailyData)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 获取使用统计数据
 */
export async function getUsageStats(period: string = '7d') {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const days = period === '30d' ? 30 : 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: consumptions } = await supabase!
    .from('credit_consumptions')
    .select('action_type, credits_used, created_at')
    .gte('created_at', startDate.toISOString());

  // 按类型统计
  const byType: Record<string, { count: number; credits: number }> = {
    generate: { count: 0, credits: 0 },
    edit: { count: 0, credits: 0 },
    inpaint: { count: 0, credits: 0 },
    upscale: { count: 0, credits: 0 },
  };

  consumptions?.forEach((c) => {
    const type = c.action_type || 'generate';
    if (byType[type]) {
      byType[type].count++;
      byType[type].credits += c.credits_used || 0;
    }
  });

  return Object.entries(byType).map(([type, data]) => ({
    type,
    ...data,
  }));
}

// ============ 用户管理 ============

/**
 * 获取用户列表
 */
export async function getUserList(params: UserListParams) {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const { page, limit, search, status, membershipType } = params;
  const offset = (page - 1) * limit;

  let query = supabase!
    .from('users')
    .select(`
      id,
      phone,
      nickname,
      avatar_url,
      membership_type,
      status,
      created_at,
      user_credits!left(balance)
    `, { count: 'exact' });

  // 搜索条件
  if (search) {
    query = query.or(`phone.ilike.%${search}%,nickname.ilike.%${search}%`);
  }

  // 状态筛选
  if (status) {
    query = query.eq('status', status);
  }

  // 会员类型筛选
  if (membershipType) {
    query = query.eq('membership_type', membershipType);
  }

  // 分页和排序
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminService] 获取用户列表失败:', error);
    throw new Error('获取用户列表失败');
  }

  const users: UserListItem[] = (data || []).map((u: any) => ({
    id: u.id,
    phone: u.phone || '',
    nickname: u.nickname || '未设置',
    avatarUrl: u.avatar_url,
    membershipType: u.membership_type || 'free',
    status: u.status || 'active',
    balance: u.user_credits?.balance || 0,
    createdAt: u.created_at,
    lastActiveAt: null,
  }));

  return {
    users,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * 获取用户详情
 */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  // 查询用户基本信息和积分
  const { data: user, error } = await supabase!
    .from('users')
    .select(`
      id,
      phone,
      nickname,
      avatar_url,
      membership_type,
      status,
      created_at,
      user_credits!left(balance, total_earned, total_spent)
    `)
    .eq('id', userId)
    .single();

  if (error || !user) {
    return null;
  }

  // 查询项目数量
  const { count: projectCount } = await supabase!
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_deleted', false);

  // 查询生成次数
  const { count: generationCount } = await supabase!
    .from('credit_consumptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // 查询最近交易记录
  const { data: transactions } = await supabase!
    .from('credit_transactions')
    .select('id, type, amount, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // 查询聊天 token 统计
  const { data: chatData } = await supabase!
    .from('chat_consumptions')
    .select('prompt_tokens, completion_tokens, input_cost_cents, output_cost_cents, cost_cents')
    .eq('user_id', userId);

  // 计算聊天统计
  let chatStats = {
    totalChats: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalInputCost: 0,
    totalOutputCost: 0,
    totalCost: 0,
  };

  if (chatData && chatData.length > 0) {
    chatStats.totalChats = chatData.length;
    for (const row of chatData) {
      chatStats.totalPromptTokens += row.prompt_tokens || 0;
      chatStats.totalCompletionTokens += row.completion_tokens || 0;
      chatStats.totalInputCost += row.input_cost_cents || 0;
      chatStats.totalOutputCost += row.output_cost_cents || 0;
      chatStats.totalCost += row.cost_cents || 0;
    }
  }

  // user_credits 是 left join，可能是数组或对象
  const credits = Array.isArray(user.user_credits)
    ? user.user_credits[0]
    : user.user_credits;

  return {
    id: user.id,
    phone: user.phone || '',
    nickname: user.nickname || '未设置',
    avatarUrl: user.avatar_url,
    membershipType: user.membership_type || 'free',
    status: user.status || 'active',
    balance: credits?.balance || 0,
    totalEarned: credits?.total_earned || 0,
    totalSpent: credits?.total_spent || 0,
    createdAt: user.created_at,
    lastActiveAt: null,
    projectCount: projectCount || 0,
    generationCount: generationCount || 0,
    recentTransactions: (transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description || '',
      createdAt: t.created_at,
    })),
    chatStats,
  };
}

/**
 * 调整用户积分
 */
export async function adjustUserCredits(
  userId: string,
  amount: number,
  reason: string,
  adminId: string
) {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  // 获取当前余额
  const { data: credits, error: getError } = await supabase!
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (getError) {
    // 如果不存在，创建记录
    const { error: insertError } = await supabase!
      .from('user_credits')
      .insert({
        user_id: userId,
        balance: Math.max(0, amount),
        total_earned: amount > 0 ? amount : 0,
        total_spent: 0,
      });

    if (insertError) {
      throw new Error('创建积分账户失败');
    }
  } else {
    // 更新余额
    const newBalance = Math.max(0, (credits?.balance || 0) + amount);
    const { error: updateError } = await supabase!
      .from('user_credits')
      .update({
        balance: newBalance,
        total_earned: amount > 0
          ? supabase!.rpc('increment', { x: amount })
          : undefined,
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error('更新积分失败');
    }
  }

  // 记录交易
  await supabase!.from('credit_transactions').insert({
    user_id: userId,
    type: amount > 0 ? 'admin_grant' : 'admin_deduct',
    amount: Math.abs(amount),
    balance_after: (credits?.balance || 0) + amount,
    description: `管理员调整: ${reason}`,
    metadata: { admin_id: adminId, reason },
  });

  // 记录管理员操作
  await logAdminAction(adminId, 'adjust_credits', 'user', userId, { amount, reason });

  return { success: true };
}

/**
 * 封禁用户
 */
export async function banUser(userId: string, reason: string, adminId: string) {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const { error } = await supabase!
    .from('users')
    .update({
      status: 'banned',
      banned_at: new Date().toISOString(),
      banned_reason: reason,
    })
    .eq('id', userId);

  if (error) {
    throw new Error('封禁用户失败');
  }

  await logAdminAction(adminId, 'ban_user', 'user', userId, { reason });

  return { success: true };
}

/**
 * 解封用户
 */
export async function unbanUser(userId: string, adminId: string) {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const { error } = await supabase!
    .from('users')
    .update({
      status: 'active',
      banned_at: null,
      banned_reason: null,
    })
    .eq('id', userId);

  if (error) {
    throw new Error('解封用户失败');
  }

  await logAdminAction(adminId, 'unban_user', 'user', userId);

  return { success: true };
}

// ============ 订单管理 ============

/**
 * 获取订单列表
 */
export async function getOrderList(params: OrderListParams) {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  const { page, limit, status, startDate, endDate } = params;
  const offset = (page - 1) * limit;

  let query = supabase!
    .from('payment_orders')
    .select(`
      id,
      order_no,
      user_id,
      plan_id,
      amount,
      status,
      created_at,
      paid_at,
      users!left(nickname, phone)
    `, { count: 'exact' });

  // 状态筛选
  if (status) {
    query = query.eq('status', status);
  }

  // 日期筛选
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // 分页和排序
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminService] 获取订单列表失败:', error);
    throw new Error('获取订单列表失败');
  }

  const planNames: Record<string, string> = {
    standard: '标准版',
    advanced: '高级版',
    super: '超级版',
  };

  const orders: OrderListItem[] = (data || []).map((o: any) => ({
    id: o.id,
    orderNo: o.order_no,
    userId: o.user_id,
    userName: o.users?.nickname || '未知用户',
    userPhone: o.users?.phone || '',
    planId: o.plan_id,
    planName: planNames[o.plan_id] || o.plan_id,
    amount: o.amount / 100, // 分转元
    status: o.status,
    createdAt: o.created_at,
    paidAt: o.paid_at,
  }));

  return {
    orders,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * 处理退款
 */
export async function refundOrder(
  orderId: string,
  reason: string,
  refundCredits: boolean,
  adminId: string
) {
  if (!isSupabaseAvailable()) {
    throw new Error('数据库服务不可用');
  }

  // 查询订单
  const { data: order, error: orderError } = await supabase!
    .from('payment_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error('订单不存在');
  }

  if (order.status !== 'paid') {
    throw new Error('只能退款已支付的订单');
  }

  // 更新订单状态
  const { error: updateError } = await supabase!
    .from('payment_orders')
    .update({
      status: 'refunded',
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    throw new Error('更新订单状态失败');
  }

  // 如果需要扣除积分
  if (refundCredits) {
    // 这里需要根据套餐扣除相应积分
    // 简化处理：不扣除积分，只标记退款
  }

  await logAdminAction(adminId, 'refund_order', 'order', orderId, { reason, refundCredits });

  return { success: true };
}
