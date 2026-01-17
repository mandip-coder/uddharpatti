"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SideShowModalProps {
  isOpen: boolean;
  requesterName: string;
  onAccept: () => void;
  onDecline: () => void;
  timeoutSeconds?: number;
}

const SideShowModal: React.FC<SideShowModalProps> = ({
  isOpen,
  requesterName,
  onAccept,
  onDecline,
  timeoutSeconds = 10
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-emerald-900/50"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500">
                <span className="text-2xl">🤝</span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Side Show Request</h3>
              <p className="text-slate-300 mb-6">
                <span className="font-bold text-emerald-400">{requesterName}</span> wants to compare cards with you.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onDecline}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-slate-700"
                >
                  Decline
                </button>
                <button
                  onClick={onAccept}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/50"
                >
                  Accept
                </button>
              </div>

              {/* Progress Bar (Timeout) */}
              <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: timeoutSeconds, ease: "linear" }}
                  className="h-full bg-emerald-500"
                  onAnimationComplete={onDecline} // Auto-decline on timeout
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SideShowModal;
