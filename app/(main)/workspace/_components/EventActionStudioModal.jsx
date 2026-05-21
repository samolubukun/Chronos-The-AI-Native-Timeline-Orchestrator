"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
    Bell, Plus, Trash2, ShieldAlert, MessageSquare, Zap, Loader2, Check,
    GitFork, ArrowUpDown, AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

const ACTION_OPTIONS = [
    {
        value: "cascade_start",
        label: "Cascade Start",
        icon: GitFork,
        description: "Auto-start all tasks that depend on this one",
        triggerType: "completed",
    },
    {
        value: "downstream_shift",
        label: "Downstream Shift",
        icon: ArrowUpDown,
        description: "Push dependent task dates forward when this slips",
        triggerType: "delayed",
    },
    {
        value: "deadline_flag",
        label: "Deadline Flag",
        icon: AlertTriangle,
        description: "Escalate with a note when this task blows past its deadline",
        triggerType: "delayed",
    },
]

export default function EventActionStudioModal({ isOpen, onClose, chronicleId }) {
    const tasks = useQuery(api.tasks.listByChronicle, { chronicleId }) || [];
    const automations = useQuery(api.automations.listByChronicle, { chronicleId }) || [];
    
    const createAutomation = useMutation(api.automations.create);
    const deleteAutomation = useMutation(api.automations.remove);

    const [triggerTaskId, setTriggerTaskId] = useState("");
    const [triggerType, setTriggerType] = useState("completed");
    const [actionType, setActionType] = useState("cascade_start");
    const [escalationLabel, setEscalationLabel] = useState("");
    const [messageTemplate, setMessageTemplate] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const selectedAction = ACTION_OPTIONS.find(a => a.value === actionType);

    const handleActionSelect = (value) => {
        setActionType(value);
        const action = ACTION_OPTIONS.find(a => a.value === value);
        if (action) {
            setTriggerType(action.triggerType);
        }
    };

    const handleCreateRule = async (e) => {
        e.preventDefault();
        if (!triggerTaskId) {
            toast.error("Please select a trigger task");
            return;
        }

        setIsSaving(true);
        try {
            const actionConfig = {
                escalationLabel: escalationLabel || ACTION_OPTIONS.find(a => a.value === actionType)?.label,
                messageTemplate: messageTemplate || undefined,
            };

            await createAutomation({
                chronicleId,
                triggerTaskId,
                triggerType,
                actionType,
                actionConfig,
            });
            
            toast.success("Automation rule deployed!");
            setTriggerTaskId("");
            setEscalationLabel("");
            setMessageTemplate("");
        } catch (e) {
            toast.error("Failed to save automation rule");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRule = async (id) => {
        try {
            await deleteAutomation({ id });
            toast.success("Automation rule removed");
        } catch (e) {
            toast.error("Failed to delete rule");
        }
    };

    const getActionIcon = (type) => {
        const action = ACTION_OPTIONS.find(a => a.value === type);
        if (!action) return Zap;
        return action.icon;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[780px] border-4 border-black rounded-none shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] p-0 bg-white text-slate-950 max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b-2 border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 border-black bg-amber-500 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white">
                            <Zap className="w-6 h-6 fill-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-950">Event Action Studio</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-1">
                                Automate timeline reactions — no external services needed.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-8 no-scrollbar">
                    <form onSubmit={handleCreateRule} className="flex flex-col h-full">
                        <h3 className="text-xs font-black uppercase tracking-widest text-violet-600 border-b border-slate-200 pb-2">New Automation Rule</h3>
                        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1 mt-4">
                        
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">1. Select Task Trigger</label>
                            <select 
                                value={triggerTaskId}
                                onChange={(e) => setTriggerTaskId(e.target.value)}
                                className="w-full bg-white border-2 border-black h-10 px-3 font-bold text-xs text-slate-950 focus:outline-none focus:border-violet-500 uppercase tracking-tight"
                            >
                                <option value="" className="text-slate-400">-- Choose Task --</option>
                                {tasks.map(t => (
                                    <option key={t._id} value={t._id}>
                                        [{t.department}] {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">2. Automation Action</label>
                            <div className="space-y-2">
                                {ACTION_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const isSelected = actionType === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleActionSelect(opt.value)}
                                            className={`w-full text-left p-3 text-[10px] font-bold uppercase tracking-wider border-2 transition-all flex items-start gap-3 ${
                                                isSelected 
                                                    ? "bg-violet-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                                                    : "bg-white text-slate-700 border-black hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className={`w-7 h-7 flex items-center justify-center shrink-0 border ${
                                                isSelected ? "border-white/30" : "border-slate-200"
                                            }`}>
                                                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-600"}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block leading-tight">{opt.label}</span>
                                                <span className={`block text-[8px] font-normal tracking-normal mt-0.5 opacity-70 ${
                                                    isSelected ? "text-white/80" : "text-slate-500"
                                                }`}>
                                                    {opt.description}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {actionType === "deadline_flag" && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Escalation Label</label>
                                    <Input
                                        placeholder="e.g. Blocker Escalation"
                                        value={escalationLabel}
                                        onChange={(e) => setEscalationLabel(e.target.value)}
                                        className="h-10 bg-white border-2 border-black text-xs font-bold text-slate-950 focus-visible:ring-violet-500 rounded-none placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Escalation Note</label>
                                    <Input
                                        placeholder="e.g. This task has exceeded its deadline."
                                        value={messageTemplate}
                                        onChange={(e) => setMessageTemplate(e.target.value)}
                                        className="h-10 bg-white border-2 border-black text-xs font-bold text-slate-950 focus-visible:ring-violet-500 rounded-none placeholder:text-slate-400"
                                    />
                                </div>
                            </>
                        )}

                        {actionType !== "deadline_flag" && (
                            <div className="py-4 px-3 bg-amber-50 border-2 border-amber-300 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                                <span className="text-amber-600 text-[10px]">ⓘ</span> No additional config needed — the timeline handles this automatically.
                            </div>
                        )}

                        </div>
                        <Button 
                            type="submit" 
                            disabled={isSaving || !triggerTaskId}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-none border-2 border-black font-black uppercase tracking-widest h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shrink-0 mt-2"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Automation Rule"}
                        </Button>
                    </form>

                    <div className="space-y-4 flex flex-col h-full">
                        <h3 className="text-xs font-black uppercase tracking-widest text-violet-600 border-b border-slate-200 pb-2 flex justify-between items-center">
                            <span>Deployed Studio Rules</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-600 border border-slate-200">{automations.length} Active</span>
                        </h3>

                        <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[380px] no-scrollbar">
                            {automations.map((rule) => {
                                const ActionIcon = getActionIcon(rule.actionType);
                                const actionDef = ACTION_OPTIONS.find(a => a.value === rule.actionType);
                                
                                return (
                                    <div key={rule._id} className="p-4 border-2 border-black bg-slate-50 flex items-start justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-none border border-slate-200 bg-white flex items-center justify-center shrink-0 mt-0.5">
                                                <ActionIcon className="w-4 h-4 text-violet-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-950 text-[11px] truncate uppercase tracking-tight">{rule.triggerTaskName}</h4>
                                                <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 mt-1">
                                                    Action: <span className="text-violet-600">{actionDef?.label || rule.actionType}</span> • Trigger: <span className="text-emerald-600">{rule.triggerType}</span>
                                                </p>
                                                {rule.actionConfig?.escalationLabel && (
                                                    <p className="text-[7px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                                        {rule.actionConfig.escalationLabel}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleDeleteRule(rule._id)}
                                            className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-slate-200 rounded shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            })}

                            {automations.length === 0 && (
                                <div className="text-center py-20 border-2 border-dashed border-slate-200 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                                    No active automation rules deployed yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t-2 border-slate-200 bg-slate-50">
                    <Button 
                        onClick={onClose}
                        className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-none border-2 border-black font-black uppercase tracking-widest h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        Close Event Studio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
