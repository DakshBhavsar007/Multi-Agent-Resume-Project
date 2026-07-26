import React from "react";

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm animate-pulse space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/6"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-4 gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded-md w-full"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default { CardSkeleton, TableSkeleton };
