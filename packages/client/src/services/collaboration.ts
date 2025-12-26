/**
 * 协作服务 - 前端 Socket.io 客户端
 */

import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';

// 协作用户信息
export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedIds?: string[];
}

// 画布元素操作类型
export interface CanvasOperation {
  type: 'add' | 'update' | 'delete' | 'move' | 'resize';
  itemId?: string;
  itemIds?: string[];
  data?: unknown;
  timestamp: number;
}

// 协作事件回调
export interface CollaborationCallbacks {
  onUsersChange?: (users: Collaborator[]) => void;
  onCursorUpdate?: (userId: string, cursor: { x: number; y: number }, color: string, name: string) => void;
  onSelectionUpdate?: (userId: string, selectedIds: string[], color: string) => void;
  onYjsUpdate?: (update: Uint8Array) => void;
  onCanvasOperation?: (operation: CanvasOperation, fromUserId: string) => void;
  onConnected?: (yourColor: string, yourId: string) => void;
  onDisconnected?: () => void;
}

class CollaborationClient {
  private socket: Socket | null = null;
  private doc: Y.Doc | null = null;
  private callbacks: CollaborationCallbacks = {};
  private currentProjectId: string | null = null;
  private isConnected = false;

  // 当前用户信息
  public myColor: string = '';
  public myId: string = '';
  public users: Collaborator[] = [];

  /**
   * 连接到协作服务
   */
  connect(serverUrl: string = '') {
    if (this.socket?.connected) {
      return;
    }

    // 使用相对路径，让 Vite 代理处理
    const url = serverUrl || window.location.origin.replace(':3000', ':3001');

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Collab] 已连接到协作服务');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('[Collab] 已断开连接');
      this.isConnected = false;
      this.callbacks.onDisconnected?.();
    });

    // 房间状态
    this.socket.on('room-state', (data: {
      projectId: string;
      users: Collaborator[];
      yourColor: string;
      yourId: string;
    }) => {
      this.myColor = data.yourColor;
      this.myId = data.yourId;
      this.users = data.users;
      this.callbacks.onUsersChange?.(data.users);
      this.callbacks.onConnected?.(data.yourColor, data.yourId);
      console.log(`[Collab] 加入房间, 颜色: ${data.yourColor}, 在线: ${data.users.length} 人`);
    });

    // Yjs 初始状态
    this.socket.on('yjs-state', (data: { update: number[] }) => {
      if (this.doc) {
        const update = new Uint8Array(data.update);
        Y.applyUpdate(this.doc, update);
      }
    });

    // 用户加入
    this.socket.on('user-joined', (data: { user: Collaborator; users: Collaborator[] }) => {
      this.users = data.users;
      this.callbacks.onUsersChange?.(data.users);
      console.log(`[Collab] 用户 ${data.user.name} 加入`);
    });

    // 用户离开
    this.socket.on('user-left', (data: { userId: string; users: Collaborator[] }) => {
      this.users = data.users;
      this.callbacks.onUsersChange?.(data.users);
      console.log(`[Collab] 用户离开`);
    });

    // 光标更新
    this.socket.on('cursor-update', (data: {
      oderId: string;  // 注意：后端有个 typo，这里保持一致
      cursor: { x: number; y: number };
      color: string;
      name: string;
    }) => {
      this.callbacks.onCursorUpdate?.(data.oderId, data.cursor, data.color, data.name);
    });

    // 选择更新
    this.socket.on('selection-update', (data: {
      userId: string;
      selectedIds: string[];
      color: string;
    }) => {
      this.callbacks.onSelectionUpdate?.(data.userId, data.selectedIds, data.color);
    });

    // Yjs 更新
    this.socket.on('yjs-update', (data: { update: number[] }) => {
      const update = new Uint8Array(data.update);
      if (this.doc) {
        Y.applyUpdate(this.doc, update);
      }
      this.callbacks.onYjsUpdate?.(update);
    });

    // 画布操作同步
    this.socket.on('canvas-operation', (data: {
      operation: CanvasOperation;
      fromUserId: string;
    }) => {
      // 忽略自己发出的操作
      if (data.fromUserId !== this.myId) {
        this.callbacks.onCanvasOperation?.(data.operation, data.fromUserId);
      }
    });
  }

  /**
   * 加入房间
   */
  joinRoom(projectId: string, userId: string, userName: string) {
    if (!this.socket?.connected) {
      console.warn('[Collab] 未连接，无法加入房间');
      return;
    }

    this.currentProjectId = projectId;
    this.doc = new Y.Doc();

    this.socket.emit('join-room', { projectId, userId, userName });
  }

  /**
   * 离开房间
   */
  leaveRoom() {
    if (!this.socket || !this.currentProjectId) return;

    this.socket.emit('leave-room', { projectId: this.currentProjectId });
    this.currentProjectId = null;
    this.doc = null;
    this.users = [];
  }

  /**
   * 发送光标位置
   */
  sendCursorMove(x: number, y: number) {
    if (!this.socket?.connected || !this.currentProjectId) return;

    this.socket.emit('cursor-move', {
      projectId: this.currentProjectId,
      x,
      y,
    });
  }

  /**
   * 发送选择变化
   */
  sendSelectionChange(selectedIds: string[]) {
    if (!this.socket?.connected || !this.currentProjectId) return;

    this.socket.emit('selection-change', {
      projectId: this.currentProjectId,
      selectedIds,
    });
  }

  /**
   * 发送 Yjs 更新
   */
  sendYjsUpdate(update: Uint8Array) {
    if (!this.socket?.connected || !this.currentProjectId) return;

    this.socket.emit('yjs-update', {
      projectId: this.currentProjectId,
      update: Array.from(update),
    });
  }

  /**
   * 发送画布操作
   */
  sendCanvasOperation(operation: Omit<CanvasOperation, 'timestamp'>) {
    if (!this.socket?.connected || !this.currentProjectId) return;

    this.socket.emit('canvas-operation', {
      projectId: this.currentProjectId,
      operation: {
        ...operation,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: CollaborationCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 获取 Yjs 文档
   */
  getDoc(): Y.Doc | null {
    return this.doc;
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.leaveRoom();
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  /**
   * 检查是否已连接
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

// 单例导出
export const collaborationClient = new CollaborationClient();
