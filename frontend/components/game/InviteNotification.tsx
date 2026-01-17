'use client';

import { useEffect, useState } from 'react';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import { useNotificationStore } from '@/hooks/useNotificationStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAvatarAsset } from '@/utils/assets';
import toast from 'react-hot-toast';

interface Invite {
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
  const [invite, setInvite] = useState<Invite | null>(null);
  const [accepting, setAccepting] = useState(false);
  const socket = useGlobalSocket();
  const router = useRouter();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (!socket) return;

    const handleInvite = (data: Invite) => {
      console.log('Received Game Invite:', data);
      setInvite(data);

      // Add to notification store
      addNotification({
        title: 'Game Invite',
        message: data.message,
        type: 'info'
      });

      // Play notification sound (optional)
      // new Audio('/sounds/invite.mp3').play().catch(() => {});

      // Acknowledge receipt
      return true;
    };

    const handleInviteAccepted = (data: { friendId: string; friendName: string; tableId: string }) => {
      console.log('Invite accepted:', data);
      toast.success(`${data.friendName} accepted your invite!`);
      // Acknowledge
      return true;
    };

    const handleInviteRejected = (data: { friendId: string; friendName: string; tableId: string }) => {
      console.log('Invite rejected:', data);
      toast.error(`${data.friendName} declined your invite`);
      // Acknowledge
      return true;
    };

    const handleAcceptSuccess = (data: { tableId: string; message: string }) => {
      console.log('Invite accepted successfully, joining game:', data);
      setAccepting(false);
      setInvite(null);

      // Navigate to new game
      router.push(`/game/${data.tableId}`);
      toast.success('Joined game successfully!');
    };

    const handleAcceptFailed = (data: { message: string }) => {
      console.log('Failed to accept invite:', data);
      setAccepting(false);
      toast.error(data.message);
    };

    const handleExitForInvite = (data: { currentRoomId: string; newTableId: string; inviterId: string }) => {
      console.log('Need to exit current game before accepting invite:', data);
      setAccepting(false);

      // Show confirmation
      const confirmed = window.confirm(
        'You are currently in a game. Accepting this invite will make you leave your current table. Continue?'
      );

      if (confirmed) {
        // Exit current game, then join new one
        socket.emit('exit_game', {
          roomId: data.currentRoomId,
          userId: socket.id
        });

        // Wait a bit for exit to complete, then join new game
        setTimeout(() => {
          router.push(`/game/${data.newTableId}`);
        }, 1000);
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
  }, [socket, router]);

  const handleAccept = () => {
    if (!invite || !socket || accepting) return;

    // Show confirmation if required (user is in game)
    if (invite.requiresConfirmation) {
      const confirmed = window.confirm(
        'You are currently in a game. Accepting this invite will make you leave your current table. Continue?'
      );

      if (!confirmed) return;
    }

    setAccepting(true);

    socket.emit('accept_game_invite', {
      inviterId: invite.inviterId,
      tableId: invite.tableId
    });
  };

  const handleReject = () => {
    if (!invite || !socket) return;

    socket.emit('reject_game_invite', {
      inviterId: invite.inviterId,
      tableId: invite.tableId
    });

    setInvite(null);
    toast.success('Invite declined');
  };

  if (!invite) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right duration-300">
      <Card className="p-4 bg-slate-900 border-emerald-500 border shadow-2xl w-80">
        <div className="flex items-start gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
            <Image
              src={getAvatarAsset(invite.inviterAvatar || 'avatar_1')}
              alt={invite.inviterName}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
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
                onClick={handleAccept}
                disabled={accepting}
                className="text-xs py-1 h-auto flex-1"
              >
                {accepting ? 'Joining...' : 'Accept'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReject}
                disabled={accepting}
                className="text-xs py-1 h-auto flex-1"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
