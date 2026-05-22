"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { motion } from "framer-motion";
import {
    Sparkles,
    Zap,
    Clock,
    Calendar,
    GitBranch,
    Shield,
    Bell,
    ChevronRight,
    ArrowRight,
    CheckCircle2,
    History,
    Paintbrush,
    Network,
    Terminal,
    MessageSquare,
    TrendingUp
} from 'lucide-react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const BackgroundElements = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Sleek glowing gradients for high-end light aesthetic */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
            
            {/* Neo-brutalist dark tech grid overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ 
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />
        </div>
    );
};

export default function LandingPage() {
    const router = useRouter();
    
    const handleGetStarted = () => router.push('/dashboard');

    const features = [
        { 
            icon: Clock, 
            title: "Conversational Roadmapping", 
            desc: "Type: 'We are launching in 6 weeks, map out coding, design, and legal phases starting next Monday.' Chronos parses the milestones, computes calendar offsets, and draws the timeline in seconds." 
        },
        { 
            icon: GitBranch, 
            title: "Recursive Rescheduling", 
            desc: "The temporal shift engine. When a dependency slips (e.g. 'Backend API is 4 days late'), Chronos automatically propagates the dates forward, shifting children recursively and highlighting conflicts in soft red." 
        },
        { 
            icon: Zap, 
            title: "The Event Action Studio", 
            desc: "Timeline-reactive automation rules bound to task events. Cascade-start dependent tasks on completion, auto-shift downstream dates when work slips, or flag deadlines — all internally, with zero external services." 
        },
        { 
            icon: Calendar, 
            title: "Multi-Track Department Views", 
            desc: "Sort your plans across elegant, color-coded rows mapped to departments like Engineering, Product, Marketing, Design, and Legal with clean glassmorphic dividers." 
        },
        { 
            icon: Network, 
            title: "SVG Dependency Pathing", 
            desc: "Visualise the critical path. Interlocking task blocks are linked via active, glowing bezier curve vectors. Hover a block to trace its exact blocking chains." 
        },
        { 
            icon: Sparkles, 
            title: "Dynamic Timeline Orchestration", 
            desc: "Orchestrate complex project roadmaps, multi-phase departmental milestones, and live dependencies conversationally with one-click dynamic updates." 
        },
        { 
            icon: History, 
            title: "Temporal Shift Version Control", 
            desc: "Protect your timeline against erroneous AI updates. Undo or Redo any recursive shift instantly, returning the schedule to its previous state with zero data loss." 
        },
        { 
            icon: Shield, 
            title: "Client-Side Self-Healing Sandbox", 
            desc: "AI rescheduling algorithms execute securely in a client-side sandbox. If a variable is misspelled by the LLM, the compiler catches it, recovers, and completes the reflow safely." 
        }
    ];
    
    const agentProtocols = [
        {
            id: "blueprint",
            title: "Conversational Blueprinting",
            icon: MessageSquare,
            desc: "Build comprehensive timeline roadmaps from single prompts. Describe your high-level product release plans, and let the coordinator AI translate goals into structured date-locked timelines.",
            mechanic: "Instant Timeline Drafting",
            query: "Plan our SaaS mobile app launch in 6 weeks. Plot Design, Engineering, legal review, and PR milestones, with legal review blocked by Code Freeze.",
            outcome: "Chronos compiles a complete multi-track schedule, chains dependencies with glowing vectors, and sets a Launch Day milestone flag on the calendar."
        },
        {
            id: "temporal-shift",
            title: "Recursive Date Reflow",
            icon: GitBranch,
            desc: "Recalculating dependencies is usually a multi-hour manual chore. Chronos shifts downstream children automatically based on mathematical date-math models, recalculating the entire project in milliseconds.",
            mechanic: "Self-Healing Rescheduling",
            query: "Database migration is delayed by 5 days. Adjust the timeline.",
            outcome: "The delayed block smooth-slides 5 days right. Chronos recursively propagates the delay across blocked tasks, flashing affected nodes with soft red halos."
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-950 selection:bg-violet-500/20 overflow-x-hidden font-sans">
            <Header />

            <main className="flex-1">
                {/* Hero */}
                <section className="relative pt-32 md:pt-48 pb-20 md:pb-40 px-6 border-b-8 border-black bg-white chronos-canvas-mesh">
                    <BackgroundElements />
                    <div className="max-w-7xl mx-auto text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 border-4 border-black bg-violet-500 text-white mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                 <Sparkles className="w-4 h-4 text-emerald-400 font-bold" />
                                 <span className="text-xs font-black uppercase tracking-[0.2em]">The AI-Native Timeline Orchestrator</span>
                            </div>

                            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black mb-8 leading-[0.9] tracking-tighter text-slate-950 uppercase">
                                Talk to your <br />
                                <span className="bg-white text-black border-4 border-black px-6 py-2 inline-block -rotate-1 shadow-[8px_8px_0px_0px_rgba(156,0,255,1)] mt-4">Timeline.</span>
                            </h1>

                            <p className="text-xl md:text-3xl text-slate-700 max-w-3xl mx-auto mb-12 font-black leading-tight uppercase tracking-tight px-4">
                                The era of manual Gantt charts and stale task boards is dead. Chronos uses recursive AI sandboxing to build and heal your plans dynamically.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center px-4">
                                <Button
                                    onClick={handleGetStarted}
                                    className="w-full sm:w-auto px-12 py-8 text-xl md:text-2xl rounded-none bg-violet-500 text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all font-black uppercase tracking-widest h-auto"
                                >
                                    Get Started Free
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Ticker Banner */}
                <section className="py-12 bg-black border-b-8 border-black overflow-hidden whitespace-nowrap">
                    <motion.div 
                        animate={{ x: [0, -1000] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="flex items-center gap-12"
                    >
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center gap-8 text-white font-black uppercase tracking-[0.3em] text-xl md:text-3xl">
                                <span>Recursive Date Reflow</span>
                                <div className="w-3 h-3 bg-violet-500 rotate-45" />
                                <span>Zero Admin Drag</span>
                                <div className="w-3 h-3 bg-violet-500 rotate-45" />
                                <span>Reactive Timeline Automations</span>
                                <div className="w-3 h-3 bg-violet-500 rotate-45" />
                            </div>
                        ))}
                    </motion.div>
                </section>

                {/* Trilogy Narrative Section */}
                <section className="py-24 md:py-40 px-6 bg-white border-b-8 border-black">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div className="space-y-8">
                                <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-violet-500">The Timeline Orchestrator</h2>
                                <h3 className="text-4xl md:text-7xl font-black text-slate-950 leading-[0.9] uppercase tracking-tighter italic">
                                    Orchestrating Time, dependencies, and <span className="text-violet-500 underline decoration-emerald-400">Execution.</span>
                                </h3>
                                <div className="space-y-6 pt-6">
                                    {[
                                         "Chronos orchestrates critical Time, dependencies, and execution",
                                         "Chronos Orchestrator plans, shifts, and heals timelines",
                                         "Event Action Studio auto-shifts downstream dates",
                                         "Sandboxed Math Engine guarantees 100% calculation safety"
                                     ].map((text, i) => (
                                         <div key={i} className="flex items-start gap-4">
                                             <div className="mt-1 w-6 h-6 border-2 border-black bg-violet-500 flex items-center justify-center shrink-0">
                                                 <CheckCircle2 className="w-4 h-4 text-white" />
                                             </div>
                                             <p className="text-xl font-bold text-slate-800 uppercase tracking-tight">{text}</p>
                                         </div>
                                     ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-full aspect-square border-8 border-black bg-slate-100 shadow-[20px_20px_0px_0px_rgba(156,0,255,1)] relative flex items-center justify-center overflow-hidden group">
                                    <div className="absolute inset-0 bg-violet-900/5 backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Calendar className="w-48 h-48 text-violet-500/20 group-hover:scale-110 transition-transform duration-500" />
                                    
                                    <div className="absolute inset-4 border-4 border-dashed border-violet-500/20 flex flex-col items-center justify-center">
                                        <div className="w-72 bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(156,0,255,1)] mb-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="w-20 h-2 bg-slate-200" />
                                                <div className="w-10 h-3 bg-violet-500 rounded" />
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 rounded mb-2" />
                                            <div className="w-3/4 h-2 bg-emerald-500 rounded" />
                                        </div>
                                         <p className="font-black text-violet-500 uppercase tracking-widest text-xs animate-pulse">Running Temporal Reflow...</p>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Core Features Grid */}
                <section className="py-24 md:py-40 px-6 bg-slate-50 border-b-8 border-black">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-baseline gap-4 mb-16 border-b-4 border-slate-300 pb-8">
                            <h2 className="text-4xl md:text-6xl font-black text-slate-950 uppercase tracking-tighter">The Chronos <span className="text-violet-500 italic">Infrastructure.</span></h2>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">03 / Core Features</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {features.map((f, i) => (
                                <div key={i} className="p-10 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(156,0,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all group">
                                    <div className="w-16 h-16 border-4 border-black bg-violet-500 flex items-center justify-center mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <f.icon className="w-8 h-8 text-white font-bold" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-4 text-slate-950 uppercase tracking-tighter">{f.title}</h3>
                                    <p className="text-slate-600 font-bold leading-relaxed text-sm">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                {/* Agent Protocol Section */}
                <section className="py-24 md:py-40 px-6 bg-white border-y-8 border-black overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                            <div className="max-w-2xl">
                                 <h2 className="text-sm font-black uppercase tracking-[0.4em] text-violet-500 mb-4">The Chronos Protocol</h2>
                                <h3 className="text-5xl md:text-8xl font-black text-slate-950 leading-[0.9] uppercase tracking-tighter">
                                    Agent <br /><span className="text-violet-500 italic underline decoration-black">Capabilities.</span>
                                </h3>
                            </div>
                            <p className="text-slate-600 font-bold max-w-sm uppercase text-xs leading-relaxed tracking-wider">
                                Leverage your temporal planning partner. Deploy natural language queries to draft complex schedules, recursive delay shifts, and action triggers.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-12">
                            {agentProtocols.map((protocol, i) => (
                                <div key={i} className="group relative">
                                    <div className="absolute inset-0 bg-violet-500 translate-x-2 translate-y-2 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-300" />
                                    <div className="relative bg-white border-4 border-black p-8 md:p-16 flex flex-col lg:flex-row gap-12 lg:items-center">
                                        <div className="lg:w-1/3 space-y-6">
                                            <div className="w-20 h-20 bg-black flex items-center justify-center border-4 border-violet-500 shadow-[4px_4px_0px_0px_rgba(156,0,255,1)]">
                                                <protocol.icon className="w-10 h-10 text-violet-500" />
                                            </div>
                                            <h4 className="text-4xl font-black text-slate-950 uppercase tracking-tighter leading-tight">{protocol.title}</h4>
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 border-2 border-violet-200 text-violet-750 text-[10px] font-black uppercase tracking-widest">
                                                <Zap className="w-3 h-3 text-emerald-600" />
                                                {protocol.mechanic}
                                            </div>
                                            <p className="text-slate-600 font-bold leading-relaxed">{protocol.desc}</p>
                                        </div>

                                        <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-slate-50 border-4 border-black p-6 space-y-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Example Command</span>
                                                <div className="bg-white border-2 border-slate-200 p-4 rounded-lg shadow-inner italic font-bold text-slate-700 text-sm">
                                                    "{protocol.query}"
                                                </div>
                                            </div>
                                            <div className="bg-violet-50/50 border-4 border-violet-200 p-6 space-y-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Expected Outcome</span>
                                                 <p className="text-sm font-bold text-violet-800 leading-snug">
                                                    {protocol.outcome}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-20 md:py-40 px-6 bg-slate-50 border-t-8 border-black">
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white p-12 md:p-24 text-center border-8 border-black shadow-[20px_20px_0px_0px_rgba(156,0,255,1)]">
                            <h2 className="text-4xl md:text-7xl font-black text-slate-950 mb-8 uppercase tracking-tighter leading-[0.9]">
                                Ready to <span className="text-violet-500 italic">orchestrate</span> your time?
                            </h2>
                             <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 font-bold uppercase tracking-tight leading-tight">
                                Join elite builders who plan launches via conversation, leaving manual Gantt drag in the past.
                            </p>
                            <Button
                                onClick={handleGetStarted}
                                className="w-full sm:w-auto px-16 py-8 text-2xl rounded-none bg-violet-500 text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all font-black uppercase tracking-widest h-auto"
                            >
                                Get Started Free
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
