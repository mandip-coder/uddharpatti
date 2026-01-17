'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useGlobalSocket } from '@/hooks/useGlobalSocket';
import { useNotificationStore } from '@/hooks/useNotificationStore';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { getAvatarAsset } from '@/utils/assets';

interface UdhaarRequest {
  _id: string;
  borrower: {
    _id: string;
    username: string;
    avatarId?: string;
  };
  amount: number;
  interestRate: number;
  message?: string;
  status: 'pending' | 'active' | 'repaid' | 'rejected';
  createdAt: string;
}

export default function UdhaarNotificationCard() {
  const [pendingRequests, setPendingRequests] = useState<UdhaarRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const socket = useGlobalSocket();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    // Fetch pending requests on mount
    fetchPendingRequests();

    if (!socket) return;

    // Listen for new Udhaar requests
    const handleUdhaarRequest = (data: any) => {
      console.log('Received Udhaar Request:', data);

      // Add to notification store
      addNotification({
        title: 'Udhaar Request',
        message: `${data.borrower.username} wants to borrow ₹${data.amount}`,
        type: 'info'
      });

      // Refresh pending requests
      fetchPendingRequests();

      // Acknowledge receipt
      return true;
    };

    socket.on('udhaar_request_received', handleUdhaarRequest);

    return () => {
      socket.off('udhaar_request_received', handleUdhaarRequest);
    };
  }, [socket]);

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/debt/my-debts');
      const debts = response.data;

      // Filter for pending requests where current user is the lender
      const pending = debts.filter((debt: any) =>
        debt.status === 'pending' &&
        typeof debt.lender === 'object' &&
        debt.lender._id
      );

      setPendingRequests(pending);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);

    try {
      await api.post(`/debt/approve/${requestId}`);
      toast.success('Udhaar approved! Coins transferred.');

      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req._id !== requestId));

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to approve request';
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);

    try {
      // We need to add a reject endpoint
      await api.post(`/debt/reject/${requestId}`);
      toast.success('Request rejected');

      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req._id !== requestId));

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to reject request';
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {pendingRequests.map((request) => {
        const totalRepayment = request.amount + (request.amount * request.interestRate / 100);

        return (
          <Card
            key={request._id}
            className="p-4 bg-slate-900 border-amber-500/50 shadow-2xl animate-in slide-in-from-right duration-300"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 flex-shrink-0">
                <Image
                  src={getAvatarAsset(request.borrower.avatarId || 'avatar_1')}
                  alt={request.borrower.username}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-sm">Udhaar Request</h4>
                <p className="text-slate-300 text-xs mt-1">
                  <span className="text-amber-400 font-medium">{request.borrower.username}</span> wants to borrow
                </p>

                {/* Amount Details */}
                <div className="mt-2 bg-slate-800/50 rounded-lg p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Amount:</span>
                    <span className="text-white font-bold">₹{request.amount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Interest:</span>
                    <span className="text-amber-400 font-medium">{request.interestRate}%</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-700 pt-1">
                    <span className="text-slate-400">They'll repay:</span>
                    <span className="text-emerald-400 font-bold">₹{totalRepayment.toFixed(2)}</span>
                  </div>
                </div>

                {/* Message */}
                {request.message && (
                  <p className="text-xs text-slate-400 mt-2 italic">
                    "{request.message}"
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApprove(request._id)}
                    disabled={processing === request._id}
                    className="flex-1 text-xs py-1.5 h-auto bg-emerald-600 hover:bg-emerald-700"
                  >
                    {processing === request._id ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReject(request._id)}
                    disabled={processing === request._id}
                    className="flex-1 text-xs py-1.5 h-auto"
                  >
                    Reject
                  </Button>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(request.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
