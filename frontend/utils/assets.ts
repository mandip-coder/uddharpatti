export const getCardAsset = (cardCode: string) => {
  if (!cardCode) return '/assets/cards/back.png'; // Default/Hidden
  return `/assets/cards/${cardCode.toUpperCase()}.png`;
};

export const getAvatarAsset = (avatarId: string) => {
  if (!avatarId) return '/assets/avatars/avatar_1.png';
  // Security check to preventing directory traversal if passed raw (though strings are safe in path)
  // Ensure it matches "avatar_N"
  const cleanId = avatarId.match(/^avatar_\d+$/) ? avatarId : 'avatar_1';
  return `/assets/avatars/${cleanId}.png`;
};

// Helper to get total available avatars (could be dynamic or large list)
export const AVAILABLE_AVATARS = Array.from({ length: 116 }, (_, i) => `avatar_${i + 1}`);
