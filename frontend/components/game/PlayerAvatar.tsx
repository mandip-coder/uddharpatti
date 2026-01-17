import { clsx } from "clsx";
import { TimerComponent } from './TimerComponent';
import { getAvatarAsset } from '@/utils/assets';
import { AVATAR_SIZES, TIMER_RING_SIZES } from '@/utils/constants';

interface PlayerAvatarProps {
  username: string;
  balance?: number; // RULE 1: Optional - only for current user
  avatarId?: string;
  isMe?: boolean;
  isActive?: boolean;
  isWinner?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  turnStartTime?: number;
  turnDuration?: number;
}

export const PlayerAvatar = ({
  username,
  balance,
  avatarId,
  isMe,
  isActive,
  isWinner,
  turnStartTime,
  turnDuration
}: PlayerAvatarProps) => {
  // Use centralized constants for consistent sizing
  const avatarSize = isMe ? AVATAR_SIZES.CURRENT_USER : AVATAR_SIZES.PLAYER;
  const timerSize = isMe ? TIMER_RING_SIZES.CURRENT_USER : TIMER_RING_SIZES.PLAYER;

  return (
    <div className={clsx(
      "relative flex flex-col items-center gap-1 transition-all duration-300",
      isActive ? "scale-110" : "opacity-90"
    )}>
      {/* Turn Indicator Ring */}
      <TimerComponent
        isActive={!!isActive}
        startTime={turnStartTime}
        duration={turnDuration}
        size={timerSize}
      />

      {/* Avatar Circle - Fixed Size with Inline Styles */}
      <div
        className={clsx(
          "rounded-full border-2 flex items-center justify-center shadow-lg relative z-10 overflow-hidden bg-slate-800",
          isMe ? "border-violet-300" : "border-slate-600",
          isWinner && "ring-4 ring-yellow-400"
        )}
        style={{
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          flexShrink: 0 // Prevent flex container from shrinking avatar
        }}
      >
        {avatarId ? (
          <img
            src={getAvatarAsset(avatarId)}
            alt={username}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            className="select-none"
            draggable={false}
          />
        ) : (
          <span className="font-bold text-white text-lg select-none">
            {username.substring(0, 2).toUpperCase()}
          </span>
        )}

        {isWinner && (
          <div className="absolute -top-4 text-2xl animate-bounce z-20">👑</div>
        )}
      </div>

      {/* Name & Balance Badge - RULE 1: Only show balance for current user */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded px-2 py-0.5 text-center min-w-[80px] shadow-sm z-20">
        <div className="text-[10px] sm:text-xs text-slate-300 truncate max-w-[80px] font-medium">
          {isMe ? "You" : username}
        </div>
        {/* RULE 1: Only display balance if isMe is true */}
        {isMe && balance !== undefined && (
          <div className="text-xs sm:text-sm text-emerald-400 font-bold leading-none">
            ₹{balance}
          </div>
        )}
      </div>
    </div>
  );
};
