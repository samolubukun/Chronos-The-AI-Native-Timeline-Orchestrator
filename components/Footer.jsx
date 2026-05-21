import { Zap } from "lucide-react";

export default function Footer() {
    return (
        <footer className="pt-20 md:pt-32 pb-12 md:pb-16 px-6 border-t-8 border-black text-center bg-[#1a0f2b]">
            <div className="flex flex-col justify-center items-center gap-6 mb-12">
                <div className="w-24 h-24 bg-white border-4 border-black flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(139,92,246,1)] overflow-hidden">
                    <img src="/logo.png" alt="Chronos" className="w-16 h-16 object-contain" />
                </div>
                <span className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase italic">Chronos</span>
            </div>
            <div className="space-y-6">
                <p className="text-violet-200 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] px-4 leading-relaxed max-w-md mx-auto italic">
                    The AI-native temporal orchestrator.
                </p>
                <p className="text-xs md:text-sm text-violet-300/80 font-black uppercase tracking-widest">
                    © 2026 CHRONOS. ALL RIGHTS RESERVED.
                </p>
                <p className="text-xs text-violet-400 font-black uppercase tracking-widest pt-4">
                    <span className="text-white">Designed and developed by</span> <a href="https://samuelolubukun.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-350 transition-colors underline decoration-black">Samuel Olubukun</a>
                </p>
            </div>
        </footer>
    );
}
