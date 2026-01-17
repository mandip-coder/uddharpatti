import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { getCardAsset } from '@/utils/assets';

interface PlayingCardProps {
  suit: 'H' | 'D' | 'C' | 'S';
  rank: string;
  hidden?: boolean;
  flipped?: boolean;
  className?: string;
}

export const PlayingCard = ({ suit, rank, hidden, flipped, className }: PlayingCardProps) => {
  const [imageError, setImageError] = useState(false);

  // Construct card code from rank + suit (e.g., "AH", "10S", "KC")
  const cardCode = (hidden || flipped) ? '' : `${rank}${suit}`;
  const imagePath = getCardAsset(cardCode);

  // Fallback to CSS card if image fails to load
  if (imageError && !hidden && !flipped) {
    return <CSSFallbackCard suit={suit} rank={rank} className={className} />;
  }

  return (
    <div className={twMerge(
      "relative rounded-lg shadow-xl overflow-hidden",
      "w-16 h-24 sm:w-20 sm:h-28",
      "transition-transform duration-200",
      className
    )}>
      <img
        src={imagePath}
        alt={hidden || flipped ? "Card back" : `${rank} of ${suit}`}
        className="w-full h-full object-cover select-none"
        onError={() => setImageError(true)}
        draggable={false}
        loading="lazy"
      />
    </div>
  );
};

// Fallback CSS-based card (in case PNG fails to load)
const CSSFallbackCard = ({ suit, rank, className }: { suit: string; rank: string; className?: string }) => {
  const isRed = suit === 'H' || suit === 'D';
  const suitIcon = {
    'H': '♥',
    'D': '♦',
    'C': '♣',
    'S': '♠'
  }[suit];

  return (
    <div className={twMerge(
      "bg-white rounded-lg flex flex-col justify-between p-1.5 sm:p-2 shadow-xl border border-slate-200 relative",
      "w-16 h-24 sm:w-20 sm:h-28",
      className
    )}>
      <div className={`flex flex-col items-center leading-none ${isRed ? "text-red-500" : "text-slate-900"}`}>
        <span className="font-bold text-base sm:text-lg">{rank}</span>
        <span className="text-xs sm:text-sm">{suitIcon}</span>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl opacity-20 pointer-events-none ${isRed ? "text-red-500" : "text-slate-900"}`}>
        {suitIcon}
      </div>
      <div className={`flex flex-col items-center leading-none transform rotate-180 ${isRed ? "text-red-500" : "text-slate-900"}`}>
        <span className="font-bold text-base sm:text-lg">{rank}</span>
        <span className="text-xs sm:text-sm">{suitIcon}</span>
      </div>
    </div>
  );
};
