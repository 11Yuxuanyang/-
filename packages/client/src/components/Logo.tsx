import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  const width = size * 1.25;
  const height = size;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 50 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === 傻一：左边橙色 - 惊讶脸 === */}
        <g>
          <circle cx="11" cy="25" r="11" fill="#FB923C" />
          {/* 大眼睛 - 惊讶 */}
          <circle cx="7" cy="24" r="3.5" fill="white" />
          <circle cx="14" cy="24" r="3.5" fill="white" />
          <circle cx="7.5" cy="24.5" r="2" fill="#1a1a1a" />
          <circle cx="14.5" cy="24.5" r="2" fill="#1a1a1a" />
          {/* O型嘴 */}
          <ellipse cx="11" cy="31" rx="2.5" ry="2" fill="#1a1a1a" />
        </g>

        {/* === 傻二：中间紫色 - 坏笑脸（C位，最大） === */}
        <g>
          <circle cx="25" cy="15" r="13" fill="#8B5CF6" />
          {/* 眯眯眼 - 坏笑 */}
          <path d="M19 13 Q21 11 23 13" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M27 13 Q29 11 31 13" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* 坏笑嘴 */}
          <path d="M19 20 Q25 26 31 20" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* 小舌头 */}
          <ellipse cx="25" cy="23" rx="2" ry="1.5" fill="#F472B6" />
        </g>

        {/* === 傻三：右边青色 - 无辜脸 === */}
        <g>
          <circle cx="39" cy="25" r="11" fill="#06B6D4" />
          {/* 大眼睛 - 无辜 */}
          <circle cx="35" cy="23" r="3.5" fill="white" />
          <circle cx="42" cy="23" r="3.5" fill="white" />
          <circle cx="36" cy="24" r="2" fill="#1a1a1a" />
          <circle cx="43" cy="24" r="2" fill="#1a1a1a" />
          {/* 眼睛高光 */}
          <circle cx="35" cy="22" r="1" fill="white" />
          <circle cx="42" cy="22" r="1" fill="white" />
          {/* 微笑 */}
          <path d="M36 29 Q39 32 42 29" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      </svg>

      {showText && (
        <span className="font-semibold text-gray-900 whitespace-nowrap">
          三傻大闹AI圈
        </span>
      )}
    </div>
  );
}
