'use client';

import React from 'react';
import { X, Zap, CheckCircle2, Sprout, Loader2 } from 'lucide-react';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PaywallModal({ open, onClose }: PaywallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header band */}
        <div className="bg-[#002D62] px-8 pt-8 pb-10 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition"
          >
            <X size={20} />
          </button>
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sprout size={28} className="text-cyan-300" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Daily Limit Reached</h2>
          <p className="text-blue-200 text-sm">
            You've used your 4 free designs for today.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">
          <p className="text-slate-600 text-center text-sm leading-relaxed">
            Unlock unlimited landscape designs with a Paddy-O Pro subscription — 
            professional-grade AI permaculture plans whenever you need them.
          </p>

          {/* Feature list */}
          <ul className="space-y-2 text-sm text-slate-700">
            {[
              'Unlimited design generations per day',
              'Priority queue — no waiting',
              'High-res downloads for printing',
              'Custom plant palette per project',
              'Early access to new features',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href="https://buy.stripe.com/7sYeVf0o0070eJe3XQ5Ne00"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#002D62] hover:bg-[#001d40] text-white text-center py-4 rounded-xl font-bold text-lg transition shadow-lg mt-2"
          >
            <span className="flex items-center justify-center gap-2">
              <Zap size={18} />
              Get Unlimited Access — $9/mo
            </span>
          </a>

          <p className="text-center text-xs text-slate-400">
            Or wait until tomorrow for 4 more free designs.
          </p>
        </div>
      </div>
    </div>
  );
}
