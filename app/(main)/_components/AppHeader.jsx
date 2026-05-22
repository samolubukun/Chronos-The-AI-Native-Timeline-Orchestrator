"use client"

import { UserButton } from '@stackframe/stack'
import Link from 'next/link'
import React, { useContext, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { UserContext } from '@/app/_context/UserContext'
import { Plus, Layers, Clock, Bell } from 'lucide-react'
import { CreateChronicleModal } from '@/app/(main)/dashboard/_components/CreateChronicleModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import moment from 'moment'
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
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    
    // Fetch chronicles to populate the switcher dropdown
    const chronicles = useQuery(api.chronicles.list, userData?._id ? { userId: userData._id } : "skip") || [];
    const notifications = useQuery(api.notifications.listByUser, userData?._id ? { userId: userData._id } : "skip") || [];
    
    const createChronicle = useMutation(api.chronicles.create);
    const markNotificationAsRead = useMutation(api.notifications.markAsRead);
    const markAllNotificationsAsRead = useMutation(api.notifications.markAllAsRead);
    
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

                {/* Global Notification Bell Center */}
                {userData && (
                    <div className="relative shrink-0">
                        <button 
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="bg-white hover:bg-slate-100 text-slate-950 rounded-none border-2 border-black flex items-center justify-center w-9 h-9 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all relative cursor-pointer"
                        >
                            <Bell className="w-4 h-4 text-slate-950" />
                            {notifications.filter(n => !n.read).length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-600 border border-black text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce px-1">
                                    {notifications.filter(n => !n.read).length}
                                </span>
                            )}
                        </button>
                        
                        {isNotificationsOpen && (
                            <div className="absolute right-0 top-11 z-[9999] bg-white border-4 border-black w-80 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col max-h-[380px] overflow-hidden text-slate-950">
                                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-950">Alert Board</h4>
                                    {notifications.some(n => !n.read) && (
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    await markAllNotificationsAsRead({ userId: userData?._id });
                                                    toast.success("All marked as read");
                                                } catch (e) {}
                                            }}
                                            className="text-[8px] font-black uppercase tracking-wider text-violet-755 hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar pt-1">
                                    {notifications.map((n) => (
                                        <div 
                                            key={n._id} 
                                            onClick={async () => {
                                                if (!n.read) {
                                                    await markNotificationAsRead({ id: n._id });
                                                }
                                                setIsNotificationsOpen(false);
                                                if (n.link) {
                                                    router.push(n.link);
                                                }
                                            }}
                                            className={cn(
                                                "p-3 border-2 border-black transition-all cursor-pointer text-left",
                                                n.read ? "bg-slate-50 text-slate-650 opacity-70" : "bg-violet-50 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                                            )}
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-tighter flex items-center justify-between">
                                                <span>{n.title}</span>
                                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                                            </p>
                                            <p className="text-[9px] font-bold mt-1 uppercase tracking-wide leading-snug">{n.message}</p>
                                            <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{moment(n.creationTime).fromNow()}</p>
                                        </div>
                                    ))}
                                    {notifications.length === 0 && (
                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest text-center py-8">No notifications received.</p>
                                    )}
                                </div>
                            </div>
                        )}
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