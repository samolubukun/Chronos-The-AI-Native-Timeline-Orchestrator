"use client";
import React from 'react';
import { Zap } from 'lucide-react';

const Loader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
                {/* Outer Ring - Neo-Brutalist Style */}
                <div className="h-24 w-24 rounded-3xl border-4 border-white animate-[spin_3s_linear_infinite]"></div>

                {/* Inner Ring (Reverse) */}
                <div className="absolute h-16 w-16 rounded-2xl border-4 border-violet-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>

                {/* Core Logo */}
                <div className="absolute flex flex-col items-center justify-center">
                    <div className="relative h-20 w-20 flex items-center justify-center bg-white rounded-3xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(156,0,255,1)] overflow-hidden">
                        <img 
                            src="/logo.svg" 
                            alt="Chronos" 
                            className="h-full w-full p-1.5 object-contain animate-pulse"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-white"></div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                        CHRONOS
                    </h2>
                    <div className="h-1 w-12 bg-violet-500"></div>
                </div>
                <div className="flex flex-col items-center max-w-xs px-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.3em] text-slate-400 animate-pulse text-center">
                        Initializing Chronos Orchestrator
                    </p>
                    <div className="mt-4 flex gap-1">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>

            {/* Subtle Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        </div>
    );
};

export default Loader;
