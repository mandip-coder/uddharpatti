// Avatar validation constants and utilities

export const MIN_AVATAR_ID = 1;
export const MAX_AVATAR_ID = 116;

export const DEFAULT_AVATAR_ID = 'avatar_1';

/**
 * Validates if the provided avatar ID is valid
 * @param avatarId - The avatar ID to validate
 * @returns true if valid, false otherwise
 */
export const isValidAvatarId = (avatarId: string): boolean => {
  if (!avatarId) return false;

  // Check format "avatar_N"
  const match = avatarId.match(/^avatar_(\d+)$/);
  if (!match) return false;

  const num = parseInt(match[1], 10);
  return num >= MIN_AVATAR_ID && num <= MAX_AVATAR_ID;
};

/**
 * Gets the frontend path for an avatar
 * @param avatarId - The avatar ID
 * @returns The path to the avatar image
 */
export const getAvatarPath = (avatarId: string): string => {
  if (!isValidAvatarId(avatarId)) {
    return `/avatars/${DEFAULT_AVATAR_ID}.png`;
  }
  return `/avatars/${avatarId}.png`;
};

/**
 * Sanitizes avatar ID - returns valid ID or default
 * @param avatarId - The avatar ID to sanitize
 * @returns A valid avatar ID
 */
export const sanitizeAvatarId = (avatarId: string | undefined): string => {
  if (!avatarId || !isValidAvatarId(avatarId)) {
    return DEFAULT_AVATAR_ID;
  }
  return avatarId;
};
