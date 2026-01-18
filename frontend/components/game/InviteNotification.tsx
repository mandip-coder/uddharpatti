'use client';

import { useEffect, useState } from 'react';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import { useNotificationStore } from '@/hooks/useNotificationStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAvatarAsset } from '@/utils/assets';
import toast from 'react-hot-toast';

interface Invite {
  notificationId: string;
  inviterId: string;
  inviterName: string;
  inviterAvatar: string;
  tableId: string;
  betAmount: number;
  requiresConfirmation: boolean;
  currentState: 'available' | 'in_game' | 'offline';
  message: string;
  timestamp: string;
}

export default function InviteNotification() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const socket = useGlobalSocket();
  const router = useRouter();
  const addNotification = useNotificationStore(state => state.addNotification);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!socket) return;

    const handleInvite = (data: Invite) => {
      console.log('Received Game Invite:', data);

      // RULE 6: Deduplication Check
      setInvites(prev => {
        if (prev.some(inv => inv.notificationId === data.notificationId)) return prev;
        return [data, ...prev];
      });

      // Add to notification store
      addNotification({
        id: data.notificationId, // Pass server ID
        title: 'Game Invite',
        message: data.message,
        type: 'info',
        notificationId: data.notificationId
      } as any);

      return true;
    };

    const handleInviteAccepted = (data: { friendId: string; friendName: string; tableId: string }) => {
      toast.success(`${data.friendName} accepted your invite!`);
      // RULE 5: Inviter also joins the game
      router.push(`/game/${data.tableId}`);
      return true;
    };

    const handleInviteRejected = (data: { friendId: string; friendName: string; tableId: string }) => {
      toast.error(`${data.friendName} declined your invite`);
      return true;
    };

    const handleAcceptSuccess = (data: { tableId: string; message: string; notificationId?: string }) => {
      setAcceptingId(null);
      if (data.notificationId) {
        setInvites(prev => prev.filter(inv => inv.notificationId !== data.notificationId));
      }
      router.push(`/game/${data.tableId}`);
      toast.success('Joined game successfully!');
    };

    const handleAcceptFailed = (data: { message: string; notificationId?: string }) => {
      setAcceptingId(null);
      toast.error(data.message);
    };

    const handleExitForInvite = (data: { currentRoomId: string; newTableId: string; inviterId: string; notificationId: string }) => {
      console.log('Need to exit current game before accepting invite:', data);
      setAcceptingId(null);

      // Show confirmation
      const confirmed = window.confirm(
        'You are currently in a game. Accepting this invite will make you leave your current table. Continue?'
      );

      if (confirmed) {
        // Exit current game
        socket.emit('exit_game', {
          roomId: data.currentRoomId,
          userId: user?.id
        });

        // Resolve notification
        socket.emit('resolve_notification', { notificationId: data.notificationId, status: 'accepted' });

        // Navigate to new game after short delay
        setTimeout(() => {
          router.push(`/game/${data.newTableId}`);
        }, 800);
      }
    };

    socket.on('game_invite', handleInvite);
    socket.on('invite_accepted', handleInviteAccepted);
    socket.on('invite_rejected', handleInviteRejected);
    socket.on('invite_accepted_join', handleAcceptSuccess);
    socket.on('invite_accept_failed', handleAcceptFailed);
    socket.on('exit_current_game_for_invite', handleExitForInvite);

    return () => {
      socket.off('game_invite', handleInvite);
      socket.off('invite_accepted', handleInviteAccepted);
      socket.off('invite_rejected', handleInviteRejected);
      socket.off('invite_accepted_join', handleAcceptSuccess);
      socket.off('invite_accept_failed', handleAcceptFailed);
      socket.off('exit_current_game_for_invite', handleExitForInvite);
    };
  }, [socket, router, addNotification, user?.id]);

  const handleAction = (notificationId: string, action: 'accepted' | 'rejected' | 'dismissed') => {
    if (!socket) return;

    const invite = invites.find(inv => inv.notificationId === notificationId);
    if (!invite) return;

    if (action === 'accepted') {
      if (invite.requiresConfirmation) {
        const confirmed = window.confirm(
          'You are currently in a game. Accepting this invite will make you leave your current table. Continue?'
        );
        if (!confirmed) return;
      }
      setAcceptingId(notificationId);
      socket.emit('accept_game_invite', {
        inviterId: invite.inviterId,
        tableId: invite.tableId,
        notificationId
      });
    } else if (action === 'rejected') {
      socket.emit('reject_game_invite', {
        inviterId: invite.inviterId,
        tableId: invite.tableId,
        notificationId
      });
      toast.success('Invite declined');
    }

    // RULE 2: RESOLVE ON BACKEND
    socket.emit('resolve_notification', { notificationId, status: action });

    // Always remove from local UI IMMEDIATELY (except if accepting, which waits for success)
    if (action !== 'accepted') {
      setInvites(prev => prev.filter(inv => inv.notificationId !== notificationId));
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
      {invites.map((invite) => (
        <Card key={invite.notificationId} className="p-4 bg-slate-900 border-emerald-500 border shadow-2xl w-80 relative animate-in slide-in-from-right duration-300">
          {/* RULE 3: CLOSE BUTTON */}
          <button
            onClick={() => handleAction(invite.notificationId, 'dismissed')}
            className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>

          <div className="flex items-start gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
              <Image
                src={getAvatarAsset(invite.inviterAvatar || 'avatar_1')}
                alt={invite.inviterName}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-white font-bold text-sm">Game Invite</h4>
              <p className="text-slate-300 text-xs mt-1">
                <span className="text-emerald-400 font-medium">{invite.inviterName}</span> invited you to play!
              </p>
              <p className="text-slate-400 text-xs mt-1">Bet: ₹{invite.betAmount}</p>

              {invite.requiresConfirmation && (
                <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
                  <p className="text-amber-300 text-xs">
                    ⚠️ You'll leave your current game
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAction(invite.notificationId, 'accepted')}
                  disabled={acceptingId !== null}
                  className="text-xs py-1 h-auto flex-1"
                >
                  {acceptingId === invite.notificationId ? 'Joining...' : 'Accept'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(invite.notificationId, 'rejected')}
                  disabled={acceptingId !== null}
                  className="text-xs py-1 h-auto flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
