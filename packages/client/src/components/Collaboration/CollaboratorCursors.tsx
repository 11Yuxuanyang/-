/**
 * 协作者光标组件 - 显示其他用户的光标位置
 */

import React, { memo } from 'react';

interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

interface CollaboratorCursorsProps {
  cursors: RemoteCursor[];
  scale: number;
  pan: { x: number; y: number };
}

const CursorIcon = memo(({ color }: { color: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
  >
    <path
      d="M5.5 3.5L18 12L12 13.5L9 20.5L5.5 3.5Z"
      fill={color}
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
));

CursorIcon.displayName = 'CursorIcon';

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = memo(({
  cursors,
  scale,
  pan,
}) => {
  return (
    <>
      {cursors.map((cursor) => {
        // 将画布坐标转换为屏幕坐标
        const screenX = cursor.x * scale + pan.x + window.innerWidth / 2;
        const screenY = cursor.y * scale + pan.y + window.innerHeight / 2;

        return (
          <div
            key={cursor.id}
            className="fixed pointer-events-none z-[9999] transition-all duration-75"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* 光标图标 */}
            <CursorIcon color={cursor.color} />

            {/* 用户名标签 */}
            <div
              className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
              style={{
                backgroundColor: cursor.color,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {cursor.name}
            </div>
          </div>
        );
      })}
    </>
  );
});

CollaboratorCursors.displayName = 'CollaboratorCursors';
