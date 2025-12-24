import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 圆形背景 */}
        <circle cx="16" cy="16" r="16" fill="#18181B" />

        {/* 三个抽象圆点 - 代表"三傻" */}
        <circle cx="8" cy="16" r="2.5" fill="white" />
        <circle cx="16" cy="16" r="2.5" fill="white" />
        <circle cx="24" cy="16" r="2.5" fill="white" />

        {/* 连接线 - 代表"AI连接" */}
        <line x1="10.5" y1="16" x2="13.5" y2="16" stroke="white" strokeWidth="1.5" />
        <line x1="18.5" y1="16" x2="21.5" y2="16" stroke="white" strokeWidth="1.5" />
      </svg>

      {showText && (
        <span className="font-semibold text-gray-900 whitespace-nowrap">
          三傻大闹AI圈
        </span>
      )}
    </div>
  );
}
