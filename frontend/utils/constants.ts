/**
 * UI Constants for Uddhar Patti Game
 * Single source of truth for sizing and layout values
 */

// Avatar Sizes (in pixels)
export const AVATAR_SIZES = {
  PLAYER: 64,      // Other players
  CURRENT_USER: 72 // Current user (slightly larger for emphasis)
} as const;

// Timer Ring Sizes (avatar size + padding for ring)
export const TIMER_RING_SIZES = {
  PLAYER: 76,      // 64px + 12px padding
  CURRENT_USER: 84 // 72px + 12px padding
} as const;

// Card Sizes (in pixels)
export const CARD_SIZES = {
  MOBILE: {
    WIDTH: 64,   // 16 * 4 (w-16)
    HEIGHT: 96   // 24 * 4 (h-24)
  },
  DESKTOP: {
    WIDTH: 80,   // 20 * 4 (w-20)
    HEIGHT: 112  // 28 * 4 (h-28)
  }
} as const;

// Game Timing
export const GAME_TIMING = {
  TURN_DURATION: 15000,      // 15 seconds per turn
  ACTION_COOLDOWN: 500,      // 500ms between actions (anti-spam)
  RECONNECT_TIMEOUT: 30000   // 30 seconds to reconnect
} as const;

// Betting Limits
export const BET_LIMITS = {
  MIN_BET: 10,
  MAX_BET: 1000,
  MIN_RAISE_MULTIPLIER: 2  // Raises must be at least 2x current stake
} as const;
