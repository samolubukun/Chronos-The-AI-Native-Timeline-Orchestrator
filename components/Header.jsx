"use client"

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export default function Header() {
    const router = useRouter();
    const handleGetStarted = () => router.push('/dashboard');

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 md:px-10 md:py-3.5 flex justify-between items-center border-b-4 border-black bg-white">
            <div className="flex items-center gap-2 md:gap-2.5">
                <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <img src="/logo.png" alt="Chronos" className="w-7 h-7 object-contain" />
                </div>
                <span className="text-lg md:text-xl font-black tracking-tighter text-slate-950 uppercase italic">
                    Chronos
                </span>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                <Button 
                    onClick={handleGetStarted}
                    size="sm"
                    className="neo-button rounded-none px-4 md:px-8 bg-violet-600 text-white hover:bg-violet-750 shadow-none text-xs md:text-sm h-10 md:h-12 border-2 border-black font-black uppercase tracking-widest"
                >
                    Get Started
                </Button>
            </div>
        </nav>
    );
}
