import React from 'react';

interface PosLogoProps {
  collapsed?: boolean;
}

export const PosLogo: React.FC<PosLogoProps> = ({ collapsed = false }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized Pos Indonesia Winged Letter Envelope */}
          <rect width="18" height="13" x="3" y="6" rx="2" fill="currentColor" fillOpacity="0.15" />
          <path d="m3 8 9 6 9-6" />
          <path d="M19 19v-4l3-3" strokeWidth="1.5" />
          <path d="M5 19v-4L2 12" strokeWidth="1.5" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-base tracking-tight text-white font-sans">
            PT Pos Indonesia
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            (Persero) · DALISTA
          </span>
        </div>
      )}
    </div>
  );
};
