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
        viewBox="0 0 24 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 顶部幽灵 - 紫色 斜眼坏笑 */}
        <g>
          <path d="M12 0C9 0 7 2 7 4.5V8C7 8 7.4 7.4 8 8C8.6 8.6 9 8 9.5 8C10 8 10.3 8.6 12 8C13.7 8.6 14 8 14.5 8C15 8 15.4 8.6 16 8C16.6 7.4 17 8 17 8V4.5C17 2 15 0 12 0Z" fill="#8B5CF6"/>
          <circle cx="10" cy="3.5" r="1" fill="white"/>
          <circle cx="14" cy="4" r="1" fill="white"/>
          <circle cx="10.3" cy="3.8" r="0.5" fill="#1a1a1a"/>
          <circle cx="14.3" cy="4.3" r="0.5" fill="#1a1a1a"/>
          <path d="M9.5 6Q12 7.5 14.5 6" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round"/>
          <path d="M14 6.3L14.8 6" stroke="#1a1a1a" strokeWidth="0.5" strokeLinecap="round"/>
        </g>

        {/* 左下幽灵 - 橙色 大笑吐舌 */}
        <g>
          <path d="M6.5 7C3.5 7 1.5 9 1.5 11.5V15C1.5 15 1.9 14.4 2.5 15C3.1 15.6 3.5 15 4 15C4.5 15 4.8 15.6 6.5 15C8.2 15.6 8.5 15 9 15C9.5 15 9.9 15.6 10.5 15C11.1 14.4 11.5 15 11.5 15V11.5C11.5 9 9.5 7 6.5 7Z" fill="#F97316"/>
          <path d="M4.2 10Q5 9.3 5.8 10" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round"/>
          <path d="M7.2 10Q8 9.3 8.8 10" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round"/>
          <path d="M4.5 12Q6.5 14 8.5 12" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
          <ellipse cx="7.2" cy="13.5" rx="1" ry="0.6" fill="#F472B6" transform="rotate(20 7.2 13.5)"/>
        </g>

        {/* 右下幽灵 - 青色 吓傻了 */}
        <g>
          <path d="M17.5 7C14.5 7 12.5 9 12.5 11.5V15C12.5 15 12.9 14.4 13.5 15C14.1 15.6 14.5 15 15 15C15.5 15 15.8 15.6 17.5 15C19.2 15.6 19.5 15 20 15C20.5 15 20.9 15.6 21.5 15C22.1 14.4 22.5 15 22.5 15V11.5C22.5 9 20.5 7 17.5 7Z" fill="#06B6D4"/>
          <circle cx="16" cy="10.3" r="1.3" fill="white"/>
          <circle cx="19" cy="10.3" r="1.3" fill="white"/>
          <circle cx="16" cy="10.5" r="0.7" fill="#1a1a1a"/>
          <circle cx="19" cy="10.5" r="0.7" fill="#1a1a1a"/>
          <circle cx="16.3" cy="10.2" r="0.25" fill="white"/>
          <circle cx="19.3" cy="10.2" r="0.25" fill="white"/>
          <ellipse cx="17.5" cy="13.3" rx="1" ry="1.3" fill="#1a1a1a"/>
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
