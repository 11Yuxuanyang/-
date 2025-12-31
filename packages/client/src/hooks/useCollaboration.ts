/**
 * 协作 Hook - 管理实时协作状态
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationClient, Collaborator, CanvasOperation } from '../services/collaboration';
import { CanvasItem } from '../types';

interface UseCollaborationOptions {
  projectId: string;
  userId?: string;
  userName?: string;
  enabled?: boolean;
  onCanvasOperation?: (operation: CanvasOperation, fromUserId: string) => void;
}

interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
}

interface RemoteSelection {
  userId: string;
  selectedIds: string[];
  color: string;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { projectId, userId, userName, enabled = true, onCanvasOperation } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [remoteSelections, setRemoteSelections] = useState<Map<string, RemoteSelection>>(new Map());
  const [myColor, setMyColor] = useState('');

  // 用于节流光标更新
  const lastCursorUpdateRef = useRef(0);
  const cursorThrottleMs = 50; // 50ms 节流

  // 保存回调引用，避免 useEffect 依赖问题
  const onCanvasOperationRef = useRef(onCanvasOperation);
  useEffect(() => {
    onCanvasOperationRef.current = onCanvasOperation;
  }, [onCanvasOperation]);

  // 连接并加入房间
  useEffect(() => {
    if (!enabled || !projectId) return;

    // 生成或使用提供的用户信息
    const finalUserId = userId || `user_${Math.random().toString(36).slice(2, 9)}`;
    const finalUserName = userName || `用户${Math.floor(Math.random() * 1000)}`;

    // 设置回调
    collaborationClient.setCallbacks({
      onConnected: (yourColor) => {
        setIsConnected(true);
        setMyColor(yourColor);
      },
      onDisconnected: () => {
        setIsConnected(false);
      },
      onUsersChange: (users) => {
        setCollaborators(users);
      },
      onCursorUpdate: (userId, cursor, color, name) => {
        setRemoteCursors(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, {
            id: userId,
            name,
            color,
            x: cursor.x,
            y: cursor.y,
            timestamp: Date.now(),
          });
          return newMap;
        });
      },
      onSelectionUpdate: (userId, selectedIds, color) => {
        setRemoteSelections(prev => {
          const newMap = new Map(prev);
          if (selectedIds.length > 0) {
            newMap.set(userId, { userId, selectedIds, color });
          } else {
            newMap.delete(userId);
          }
          return newMap;
        });
      },
      onCanvasOperation: (operation, fromUserId) => {
        onCanvasOperationRef.current?.(operation, fromUserId);
      },
    });

    // 连接并加入房间
    collaborationClient.connect();

    // 延迟加入房间，确保连接建立
    const joinTimer = setTimeout(() => {
      collaborationClient.joinRoom(projectId, finalUserId, finalUserName);
    }, 500);

    // 清理：离开房间
    return () => {
      clearTimeout(joinTimer);
      collaborationClient.leaveRoom();
    };
  }, [enabled, projectId, userId, userName]);

  // 清理过期的光标（3秒未更新）
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => {
        const newMap = new Map(prev);
        for (const [id, cursor] of newMap.entries()) {
          if (now - cursor.timestamp > 3000) {
            newMap.delete(id);
          }
        }
        return newMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 发送光标位置（带节流）
  const sendCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorUpdateRef.current < cursorThrottleMs) {
      return;
    }
    lastCursorUpdateRef.current = now;
    collaborationClient.sendCursorMove(x, y);
  }, []);

  // 发送选择变化
  const sendSelectionChange = useCallback((selectedIds: string[]) => {
    collaborationClient.sendSelectionChange(selectedIds);
  }, []);

  // 发送画布操作
  const sendCanvasOperation = useCallback((
    type: CanvasOperation['type'],
    data?: {
      itemId?: string;
      itemIds?: string[];
      item?: CanvasItem;
      items?: CanvasItem[];
      updates?: Partial<CanvasItem>;
    }
  ) => {
    collaborationClient.sendCanvasOperation({
      type,
      itemId: data?.itemId,
      itemIds: data?.itemIds,
      data: data?.item || data?.items || data?.updates,
    });
  }, []);

  return {
    isConnected,
    collaborators,
    remoteCursors: Array.from(remoteCursors.values()),
    remoteSelections: Array.from(remoteSelections.values()),
    myColor,
    sendCursorMove,
    sendSelectionChange,
    sendCanvasOperation,
    collaboratorCount: collaborators.length,
  };
}
