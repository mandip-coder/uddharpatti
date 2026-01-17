'use client';

import { useSettings } from '@/hooks/useSettings';
import type { NotificationPreferences } from '@/types';
import { useState, useEffect } from 'react';

interface NotificationToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({ label, description, checked, onChange, disabled }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
      <div className="flex-1">
        <label className="text-white font-medium">{label}</label>
        {description && (
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${checked ? 'bg-emerald-500' : 'bg-slate-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

export default function NotificationPreferences() {
  const { settings, loading, error, saving, updateSettings } = useSettings();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);

  // Initialize local state from settings
  useEffect(() => {
    if (settings?.notifications) {
      setLocalPrefs(settings.notifications);
    }
  }, [settings]);

  type NotificationCategory = 'game' | 'social' | 'debt';

  const handleToggle = async (category: NotificationCategory, key: string, value: boolean) => {
    if (!localPrefs) return;

    // Update local state immediately
    const newPrefs = {
      ...localPrefs,
      [category]: {
        ...localPrefs[category],
        [key as keyof typeof localPrefs[typeof category]]: value,
      },
    };
    setLocalPrefs(newPrefs);

    // Debounced save to backend
    await updateSettings({ notifications: newPrefs });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!localPrefs) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Game Notifications */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span>🎮</span> Game Notifications
        </h3>
        <div>
          <NotificationToggle
            label="Turn Timer Warning"
            description="Get notified when your turn time is running out"
            checked={localPrefs.game.turnTimerWarning}
            onChange={(val) => handleToggle('game', 'turnTimerWarning', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Your Turn"
            description="Get notified when it's your turn to play"
            checked={localPrefs.game.yourTurn}
            onChange={(val) => handleToggle('game', 'yourTurn', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Round Result"
            description="Get notified about round wins/losses"
            checked={localPrefs.game.roundResult}
            onChange={(val) => handleToggle('game', 'roundResult', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Opponent Left"
            description="Get notified when an opponent leaves the game"
            checked={localPrefs.game.opponentLeft}
            onChange={(val) => handleToggle('game', 'opponentLeft', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Side Show Request"
            description="Get notified when someone requests a side show"
            checked={localPrefs.game.sideShowRequest}
            onChange={(val) => handleToggle('game', 'sideShowRequest', val)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Social Notifications */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span>👥</span> Social Notifications
        </h3>
        <div>
          <NotificationToggle
            label="Friend Request"
            description="Get notified when someone sends you a friend request"
            checked={localPrefs.social.friendRequest}
            onChange={(val) => handleToggle('social', 'friendRequest', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Friend Accepted"
            description="Get notified when someone accepts your friend request"
            checked={localPrefs.social.friendAccepted}
            onChange={(val) => handleToggle('social', 'friendAccepted', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="User Blocked/Unblocked"
            description="Get notified about blocking actions"
            checked={localPrefs.social.userBlocked}
            onChange={(val) => handleToggle('social', 'userBlocked', val)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Debt Notifications */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span>💰</span> Udhaar (Debt) Notifications
        </h3>
        <div>
          <NotificationToggle
            label="Udhaar Request"
            description="Get notified when someone requests udhaar from you"
            checked={localPrefs.debt.udhaarRequest}
            onChange={(val) => handleToggle('debt', 'udhaarRequest', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Udhaar Response"
            description="Get notified when your udhaar request is accepted/rejected"
            checked={localPrefs.debt.udhaarResponse}
            onChange={(val) => handleToggle('debt', 'udhaarResponse', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Interest Applied"
            description="Get notified when interest is applied to your debt"
            checked={localPrefs.debt.interestApplied}
            onChange={(val) => handleToggle('debt', 'interestApplied', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Repayment Reminder"
            description="Get reminded about pending repayments"
            checked={localPrefs.debt.repaymentReminder}
            onChange={(val) => handleToggle('debt', 'repaymentReminder', val)}
            disabled={saving}
          />
          <NotificationToggle
            label="Overdue Warning"
            description="Get warned about overdue debts (10-day rule)"
            checked={localPrefs.debt.overdueWarning}
            onChange={(val) => handleToggle('debt', 'overdueWarning', val)}
            disabled={saving}
          />
        </div>
      </div>

      {saving && (
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
          <p className="text-blue-400 text-sm">Saving changes...</p>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300">
          <strong>Note:</strong> Notification preferences are enforced server-side.
          Disabled notifications will not be sent to you even if triggered by game events.
        </p>
      </div>
    </div>
  );
}
