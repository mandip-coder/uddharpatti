import { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';

interface TimerComponentProps {
  startTime?: number; // Timestamp when turn started (server time synced approx)
  duration?: number; // Duration in ms (e.g. 15000)
  isActive: boolean;
  onTimeout?: () => void;
  size?: number; // Diameter in px
}

export const TimerComponent = ({
  startTime,
  duration = 15000,
  isActive,
  size = 72
}: TimerComponentProps) => {
  const [progress, setProgress] = useState(100);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    // Calculate Progress
    const updateProgress = () => {
      if (!isActive || !startTime) {
        setProgress(100);
        return;
      }

      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const percentage = (remaining / duration) * 100;

      setProgress(percentage);

      if (percentage > 0) {
        requestRef.current = requestAnimationFrame(updateProgress);
      }
    };

    if (isActive && startTime) {
      requestRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, startTime, duration]);

  if (!isActive) return null;

  // SVG parameters
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Color logic
  const colorClass = progress > 50 ? 'text-emerald-400'
    : progress > 20 ? 'text-yellow-400'
      : 'text-red-500 animate-pulse';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 pointer-events-none"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700/50"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={clsx("transition-colors duration-200", colorClass)}
        />
      </svg>
    </div>
  );
};
