export default function LoadingSkeleton({ width = '100%', height = '20px', borderRadius = '8px', className="" }) {
  return (
    <div 
      className={`bg-gray-200 overflow-hidden relative ${className}`}
      style={{ width, height, borderRadius }}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-200 via-white/40 to-gray-200 animate-[shimmer_1.5s_infinite]"></div>
    </div>
  );
}
