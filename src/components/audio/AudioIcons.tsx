import React from 'react';

/**
 * Dedicated 15-second rewind icon with crisp, centered non-overlapping typography
 */
export const Rewind15Icon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Arrowhead */}
    <path d="M4 4v5h5" />
    {/* Circular Arrow Path */}
    <path d="M4.6 9A8 8 0 1 1 5.8 15.2" />
    {/* Bold, perfectly centered number */}
    <text
      x="12"
      y="14.5"
      fill="currentColor"
      stroke="none"
      fontSize="7.5"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      textAnchor="middle"
    >
      15
    </text>
  </svg>
);

/**
 * Dedicated 15-second forward icon with crisp, centered non-overlapping typography
 */
export const Forward15Icon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Arrowhead */}
    <path d="M20 4v5h-5" />
    {/* Circular Arrow Path */}
    <path d="M19.4 9A8 8 0 1 0 18.2 15.2" />
    {/* Bold, perfectly centered number */}
    <text
      x="12"
      y="14.5"
      fill="currentColor"
      stroke="none"
      fontSize="7.5"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      textAnchor="middle"
    >
      15
    </text>
  </svg>
);
