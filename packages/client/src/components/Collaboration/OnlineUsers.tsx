/**
 * 在线用户列表组件
 */

import React, { memo, useState } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { Collaborator } from '../../services/collaboration';

interface OnlineUsersProps {
  collaborators: Collaborator[];
  isConnected: boolean;
  myColor: string;
}

export const OnlineUsers: React.FC<OnlineUsersProps> = memo(({
  collaborators,
  isConnected,
  myColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      {/* 头像堆叠显示 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white shadow-sm border border-gray-200 transition-colors"
      >
        {/* 连接状态指示器 */}
        {isConnected ? (
          <Wifi size={14} className="text-green-500" />
        ) : (
          <WifiOff size={14} className="text-gray-400" />
        )}

        {/* 用户头像堆叠 */}
        <div className="flex -space-x-2">
          {collaborators.slice(0, 4).map((user, index) => (
            <div
              key={user.id}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium"
              style={{
                backgroundColor: user.color,
                zIndex: 10 - index,
              }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {collaborators.length > 4 && (
            <div
              className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs text-white font-medium"
              style={{ zIndex: 5 }}
            >
              +{collaborators.length - 4}
            </div>
          )}
        </div>

        {/* 人数 */}
        <span className="text-sm text-gray-600 font-medium">
          {collaborators.length}
        </span>
      </button>

      {/* 展开的用户列表 */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* 标题 */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Users size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              在线协作者 ({collaborators.length})
            </span>
          </div>

          {/* 用户列表 */}
          <div className="max-h-64 overflow-y-auto">
            {collaborators.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                暂无协作者
              </div>
            ) : (
              collaborators.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50"
                >
                  {/* 头像 */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-medium"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* 名称 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                      {user.color === myColor && (
                        <span className="ml-2 text-xs text-gray-400">(你)</span>
                      )}
                    </div>
                  </div>

                  {/* 在线状态点 */}
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              ))
            )}
          </div>

          {/* 邀请链接提示 */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              分享当前链接即可邀请协作
            </p>
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
});

OnlineUsers.displayName = 'OnlineUsers';
