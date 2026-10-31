'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';

export function PwaBanner() {
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);
  }, []);

  if (isStandalone || dismissed) return null;

  return (
    <div className="mx-4 mt-3 p-3.5 glass-panel-elevated rounded-2xl border border-emerald-500/30 text-xs shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
      <button 
        onClick={() => setDismissed(true)} 
        className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        aria-label="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
            <span>Install FocusGuard PWA</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">iPhone Ready</span>
          </div>
          <p className="text-slate-300 mt-1 leading-relaxed">
            {isIos ? (
              <>
                For standalone zero-chrome app: tap <Share className="w-3 h-3 inline mx-0.5 text-emerald-400" /> in Safari, then select <PlusSquare className="w-3 h-3 inline mx-0.5 text-emerald-400" /> <span className="font-medium text-white">Add to Home Screen</span>.
              </>
            ) : (
              <>Install to your device home screen for fullscreen offline guardrails and instant launch.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
