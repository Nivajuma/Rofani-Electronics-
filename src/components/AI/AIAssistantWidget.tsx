import React from 'react';
import { Sparkles, Bot, HelpCircle } from 'lucide-react';

interface AIAssistantWidgetProps {
  onOpen: () => void;
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      title="Open ROFANI AI Staff Assistant / Onboarding Co-Pilot"
      className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition flex items-center gap-2.5 border border-white/20 group"
    >
      <div className="relative">
        <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-ping" />
      </div>
      <span className="hidden sm:inline font-bold text-xs tracking-wide">
        Worker AI Co-Pilot
      </span>
      <span className="bg-white/20 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full hidden md:inline">
        Help
      </span>
    </button>
  );
};
