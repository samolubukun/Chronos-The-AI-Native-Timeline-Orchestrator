"use client"

import { useContext, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { UserContext } from "@/app/_context/UserContext"
import { 
    Plus, Clock, Loader2, Layers, Trash2, Search, 
    Zap, ArrowRight, TrendingUp, BarChart3, Filter,
    CheckCircle2, Bell, Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CreateChronicleModal } from './_components/CreateChronicleModal'
import { DeleteChronicleModal } from './_components/DeleteChronicleModal'
import moment from 'moment'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"

export default function Dashboard() {
    const router = useRouter();
    const { userData } = useContext(UserContext);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [activeChronicleToDelete, setActiveChronicleToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Fetch chronicles
    const chronicles = useQuery(api.chronicles.list, userData?._id ? { userId: userData._id } : "skip");
    
    const createChronicle = useMutation(api.chronicles.create);
    const deleteChronicle = useMutation(api.chronicles.remove);

    const filteredChronicles = useMemo(() => {
        if (!chronicles) return [];
        return chronicles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [chronicles, searchQuery]);

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

    const handleOpenDelete = (e, chronicle) => {
        e.stopPropagation();
        setActiveChronicleToDelete(chronicle);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteChronicle = async (chronicleId) => {
        try {
            await deleteChronicle({ id: chronicleId });
            toast.success("Chronicle deleted");
            setIsDeleteModalOpen(false);
        } catch (err) {
            toast.error("Failed to delete chronicle");
        }
    };

    return (
        <div className="h-full w-full bg-slate-50 overflow-y-auto chronos-canvas-mesh text-slate-950 pb-20">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 lg:p-12 space-y-8 sm:space-y-12">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-black pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-violet-500 font-black">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]">Chronos Orchestrator</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-slate-950 uppercase italic leading-none">Your Chronicles</h1>
                        <p className="text-xs sm:text-sm md:text-base text-slate-600 font-bold max-w-xl leading-relaxed">Orchestrate timelines, chain dependency pathways, and configure active event automations via conversation.</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 relative w-full sm:w-auto">
                        <Button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-violet-500 hover:bg-violet-600 text-white rounded-none border-2 border-black px-4 sm:px-6 py-4 sm:py-6 h-auto text-[11px] sm:text-[13px] font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0 w-full sm:w-auto justify-center"
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            New Chronicle
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {(() => {
                        const totalTasks = chronicles?.reduce((acc, c) => acc + (c.taskCount || 0), 0) || 0;
                        const doneTasks = chronicles?.reduce((acc, c) => acc + (c.completedCount || 0), 0) || 0;
                        const activeAutomations = chronicles?.reduce((acc, c) => acc + (c.automationCount || 0), 0) || 0;
                        
                        return [
                            { label: 'Total Chronicles', value: chronicles?.length || 0, icon: Layers, color: 'bg-violet-500 shadow-violet-500/20' },
                            { label: 'Planned Tasks', value: totalTasks, icon: Calendar, color: 'bg-blue-500 shadow-blue-500/20' },
                            { label: 'Completed Tasks', value: doneTasks, icon: CheckCircle2, color: 'bg-emerald-500 shadow-emerald-500/20' },
                            { label: 'Event Studio Rules', value: activeAutomations, icon: Bell, color: 'bg-amber-500 shadow-amber-500/20' },
                        ].map((s, i) => (
                            <div key={i} className="p-3 sm:p-5 bg-white rounded-none border-2 sm:border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 sm:gap-4 min-w-0">
                                <div className={`w-8 h-8 sm:w-12 sm:h-12 ${s.color} border-2 border-black flex items-center justify-center shadow-md shrink-0`}>
                                    <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 leading-tight mb-1 truncate">{s.label}</p>
                                    <p className="text-lg sm:text-2xl font-black text-slate-950 leading-none">{s.value}</p>
                                </div>
                            </div>
                        ));
                    })()}
                </div>

                {/* Search & Filtering */}
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-2 rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                            placeholder="Search your Chronicles..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none pl-14 pr-6 py-4 h-auto text-[15px] outline-none placeholder:text-slate-400 font-bold text-slate-900 uppercase tracking-tight"
                        />
                    </div>
                    <div className="flex items-center gap-2 pr-2 shrink-0">
                        <Button variant="ghost" className="rounded-none px-4 text-slate-500 hover:text-slate-800 font-black uppercase tracking-widest text-xs h-10 border-l-2 border-slate-200">
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                    </div>
                </div>

                {/* Chronicles Grid */}
                {chronicles === undefined ? (
                    <div className="flex flex-col justify-center items-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Initializing Chronos Engine</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Create Chronicle Card */}
                        <motion.button 
                            whileHover={{ y: -8 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="group flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px] bg-white rounded-none border-4 border-black hover:border-violet-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 cursor-pointer p-6 sm:p-8"
                        >
                            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-none bg-slate-100 border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] group-hover:border-violet-500 flex items-center justify-center mb-4 sm:mb-6 transition-all duration-300">
                                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-slate-500 group-hover:text-violet-500 transition-colors duration-300" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-black text-lg sm:text-xl text-slate-900 group-hover:text-violet-500 transition-colors uppercase tracking-tight">New Chronicle</h3>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-500 max-w-[200px] mx-auto uppercase tracking-wide">Plan a new roadmap in natural language.</p>
                            </div>
                        </motion.button>

                        {/* Existing Chronicles */}
                        <AnimatePresence mode="popLayout">
                            {filteredChronicles.map((chronicle) => {
                                const percentComplete = chronicle.taskCount > 0 
                                    ? Math.round((chronicle.completedCount / chronicle.taskCount) * 100) 
                                    : 0;

                                return (
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        key={chronicle._id}
                                        onClick={() => router.push(`/workspace/${chronicle._id}`)}
                                        className="group relative flex flex-col min-h-[260px] sm:min-h-[300px] rounded-none border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(156,0,255,1)] sm:hover:shadow-[10px_10px_0px_0px_rgba(156,0,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden p-5 sm:p-8"
                                    >
                                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 sm:h-14 sm:w-14 border-4 border-black bg-violet-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                                </div>
                                                {chronicle.isShared && (
                                                    <div className="px-2 py-0.5 bg-emerald-100 text-emerald-850 border-2 border-black font-black uppercase text-[7px] tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 shrink-0">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        👥 Collaboration
                                                    </div>
                                                )}
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={(e) => handleOpenDelete(e, chronicle)}
                                                className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-none border-2 border-black opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            </Button>
                                        </div>
 
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="space-y-1.5">
                                                <h3 className="font-black text-lg sm:text-2xl text-slate-900 line-clamp-1 group-hover:text-violet-500 transition-colors uppercase tracking-tight">{chronicle.name}</h3>
                                                <div className="flex items-center text-[8.5px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                                    <span>
                                                        {chronicle.isShared 
                                                            ? `Shared by ${chronicle.ownerName}` 
                                                            : `Planned ${moment(chronicle._creationTime).fromNow()}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="space-y-1.5 pt-4 sm:pt-6">
                                                <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                    <span>Progress</span>
                                                    <span>{percentComplete}%</span>
                                                </div>
                                                <div className="w-full h-2.5 sm:h-3 bg-slate-100 border-2 border-black">
                                                    <div 
                                                        className="h-full bg-violet-500 transition-all duration-500" 
                                                        style={{ width: `${percentComplete}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t-2 border-slate-200">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm sm:text-[16px] font-black text-slate-950 leading-none truncate">{chronicle.taskCount || 0}</span>
                                                    <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Tasks</span>
                                                </div>
                                                <div className="w-px h-5 sm:h-6 bg-slate-200 shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm sm:text-[16px] font-black text-slate-950 leading-none truncate">{chronicle.automationCount || 0}</span>
                                                    <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Rules</span>
                                                </div>
                                                <div className="ml-auto shrink-0">
                                                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-slate-50 flex items-center justify-center border-2 border-black hover:bg-violet-500 hover:text-white group-hover:border-violet-500 group-hover:bg-violet-500 transition-all duration-300 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] sm:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        <ArrowRight className="w-3.5 h-3.5 text-slate-800 group-hover:text-white transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            
            <CreateChronicleModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreate={handleCreateChronicle} 
            />
            <DeleteChronicleModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={() => handleDeleteChronicle(activeChronicleToDelete?._id)} 
                chronicleName={activeChronicleToDelete?.name} 
            />
        </div>
    )
}