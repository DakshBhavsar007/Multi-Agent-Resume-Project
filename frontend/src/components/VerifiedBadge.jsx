import React from 'react';
import { BadgeCheck } from 'lucide-react';

/**
 * Reusable Instagram / LinkedIn / Twitter style Verified Blue Badge
 */
export default function VerifiedBadge({ size = 18, className = "", title = "Verified Account" }) {
  return (
    <span className={`inline-flex items-center align-middle ml-1.5 ${className}`} title={title}>
      <BadgeCheck 
        size={size} 
        className="text-[#1D9BF0] fill-[#1D9BF0] text-white shrink-0 drop-shadow-sm" 
      />
    </span>
  );
}
