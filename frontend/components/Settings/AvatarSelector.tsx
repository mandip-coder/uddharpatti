import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { AVAILABLE_AVATARS, getAvatarAsset } from '@/utils/assets';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { clsx } from 'clsx';

export const AvatarSelector = () => {
  const { user, updateAvatar } = useAuthStore();
  const [selectedId, setSelectedId] = useState(user?.avatarId || 'avatar_1');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (avatarId: string) => {
    if (!user) return;
    setIsSaving(true);
    setSelectedId(avatarId);

    try {
      await api.put('/settings/avatar', { avatarId });
      // Update local state without full re-login
      updateAvatar(avatarId);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
      <h3 className="text-white font-bold mb-4">Select Avatar</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {AVAILABLE_AVATARS.map((id) => (
          <button
            key={id}
            onClick={() => handleSave(id)}
            disabled={isSaving}
            className={clsx(
              "relative aspect-square rounded-full border-2 overflow-hidden hover:scale-105 transition-transform",
              selectedId === id ? "border-emerald-500 ring-2 ring-emerald-500/50" : "border-slate-700 hover:border-slate-500",
              isSaving && "opacity-50 cursor-not-allowed"
            )}
          >
            <Image
              src={getAvatarAsset(id)}
              alt={id}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
            {user?.avatarId === id && (
              <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                <span className="text-lg">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
