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
        width={size * 1.1}
        height={size}
        viewBox="0 0 34 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 顶部幽灵 - 紫色 眨眼 */}
        <g>
          <path d="M17 1C13.5 1 11 3.5 11 7V12C11 12 11.8 11 12.8 12C13.8 13 14.5 12 15 12C15.5 12 16 13 17 12C18 13 18.5 12 19 12C19.5 12 20.2 13 21.2 12C22.2 11 23 12 23 12V7C23 3.5 20.5 1 17 1Z" fill="#8B5CF6"/>
          <circle cx="14.5" cy="6" r="1.2" fill="white"/>
          <circle cx="14.5" cy="6" r="0.6" fill="#1a1a1a"/>
          <path d="M18.5 5.5Q19.5 5 20.5 6" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M14 9Q17 11 20 9" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round"/>
        </g>

        {/* 左下幽灵 - 橙色 吐舌 */}
        <g>
          <path d="M9 13C5.5 13 3 15.5 3 19V24C3 24 3.8 23 4.8 24C5.8 25 6.5 24 7 24C7.5 24 8 25 9 24C10 25 10.5 24 11 24C11.5 24 12.2 25 13.2 24C14.2 23 15 24 15 24V19C15 15.5 12.5 13 9 13Z" fill="#F97316"/>
          <circle cx="7" cy="18" r="1.2" fill="white"/>
          <circle cx="11" cy="18" r="1.2" fill="white"/>
          <circle cx="7" cy="18.2" r="0.6" fill="#1a1a1a"/>
          <circle cx="11" cy="18.2" r="0.6" fill="#1a1a1a"/>
          <ellipse cx="9" cy="22" rx="2" ry="1.2" fill="#F472B6"/>
        </g>

        {/* 右下幽灵 - 青色 惊讶 */}
        <g>
          <path d="M25 13C21.5 13 19 15.5 19 19V24C19 24 19.8 23 20.8 24C21.8 25 22.5 24 23 24C23.5 24 24 25 25 24C26 25 26.5 24 27 24C27.5 24 28.2 25 29.2 24C30.2 23 31 24 31 24V19C31 15.5 28.5 13 25 13Z" fill="#06B6D4"/>
          <circle cx="23" cy="18" r="1.5" fill="white"/>
          <circle cx="27" cy="18" r="1.5" fill="white"/>
          <circle cx="23" cy="18.3" r="0.8" fill="#1a1a1a"/>
          <circle cx="27" cy="18.3" r="0.8" fill="#1a1a1a"/>
          <ellipse cx="25" cy="22" rx="1.2" ry="1.5" fill="#1a1a1a"/>
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
