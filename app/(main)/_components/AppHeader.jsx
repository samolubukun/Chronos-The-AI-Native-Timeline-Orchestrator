"use client"

import { UserButton } from '@stackframe/stack'
import Link from 'next/link'
import React, { useContext, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { UserContext } from '@/app/_context/UserContext'
import { Plus, Layers, Clock } from 'lucide-react'
import { CreateChronicleModal } from '@/app/(main)/dashboard/_components/CreateChronicleModal'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function AppHeader() {
    const { userData } = useContext(UserContext);
    const pathname = usePathname();
    const router = useRouter();
    
    // Only show controls if we are deep inside a workspace route
    const isWorkspace = pathname?.startsWith('/workspace/');
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Fetch chronicles to populate the switcher dropdown
    const chronicles = useQuery(api.chronicles.list, userData?._id ? { userId: userData._id } : "skip") || [];
    const createChronicle = useMutation(api.chronicles.create);
    
    // Extract current chronicle ID from the URL path
    let currentChronicleId = null;
    if (isWorkspace) {
        const parts = pathname.split('/');
        currentChronicleId = parts[parts.length - 1];
    }

    const handleCreateChronicle = async (name) => {
        if (!userData?._id) return;
        try {
            const id = await createChronicle({ name, userId: userData._id });
            toast.success("Chronicle created!");
            router.push(`/workspace/${id}`);
        } catch (err) {
            toast.error("Failed to create chronicle");
        }
    };

    return (
        <div className='p-2.5 md:py-2.5 md:px-6 shadow-sm flex justify-between items-center px-3 bg-white border-b-4 border-black text-slate-950 relative z-50'>
            
            {/* Hidden Modal rendered here so it triggers over everything */}
            <CreateChronicleModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreate={handleCreateChronicle} 
            />

            {/* Left side: Logo */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2.5 animate-in fade-in duration-300">
                    <div className="w-9 h-9 bg-white border-2 border-black rounded-lg flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <img src="/logo.png" alt="Chronos Logo" className="w-6 h-6 object-contain" />
                    </div>
                    <span className={`text-base sm:text-lg md:text-xl font-black tracking-tighter text-slate-950 uppercase italic ${
                        isWorkspace ? 'hidden sm:inline' : ''
                    }`}>
                        Chronos
                    </span>
                </Link>
            </div>

            {/* Right side: Controls & Profile */}
            <div className='flex items-center gap-2 sm:gap-3 md:gap-5 min-w-0'>
                
                {isWorkspace && (
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
                        {/* Switcher Dropdown */}
                        <Select 
                            value={currentChronicleId || ""}
                            onValueChange={(value) => router.push(`/workspace/${value}`)}
                        >
                            <SelectTrigger className="w-[125px] sm:w-[190px] lg:w-[240px] bg-slate-50 border-black hover:bg-slate-100 hover:border-violet-500 transition-colors shadow-sm focus:ring-violet-500 text-[11px] sm:text-xs font-bold text-slate-950 h-9 min-w-0 rounded-none border-2">
                                <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                    <Clock className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                                    <span className="truncate min-w-0">
                                        <SelectValue placeholder="Chronicles" />
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent position="popper" className="w-[200px] bg-white border-2 border-black shadow-lg z-50 text-slate-950 rounded-none">
                                {chronicles.map(c => (
                                    <SelectItem key={c._id} value={c._id} className="cursor-pointer hover:bg-slate-100 font-bold uppercase text-[10px] tracking-wider py-2">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Create Chronicle Button */}
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold p-2 sm:py-2 sm:px-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none transition-colors shrink-0"
                        >
                            <Plus className="w-4 h-4 text-white" />
                            <span className="hidden sm:inline text-xs uppercase tracking-wider">New</span>
                        </button>
                    </div>
                )}
                
                {userData && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border-2 border-black px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest text-violet-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 select-none">
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                        <span>{userData.credits ?? 0} Credits</span>
                    </div>
                )}
                
                <div className="border-2 border-black rounded-full overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                    <UserButton />
                </div>
            </div>
        </div>
    )
}

export default AppHeader