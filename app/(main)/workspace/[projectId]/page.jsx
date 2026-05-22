"use client"

import { useState, use, useEffect, useMemo, useCallback, useRef, useContext } from 'react'
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from '@/lib/utils'
import { 
    ChevronLeft, Plus, Settings2, Sparkles, Undo2, Redo2,
    Calendar, Users, Clock, Trash2, ArrowRight, Zap, Bell,
    CheckCircle2, AlertCircle, FileText, UserPlus, Info, Check, Play
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import Loader from '@/components/Loader'
import { toast } from 'sonner'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { UserContext } from "@/app/_context/UserContext"
import { useRouter } from 'next/navigation'

import ChatPanel from '../_components/ChatPanel'
import EventActionStudioModal from '../_components/EventActionStudioModal'
import { motion, AnimatePresence } from 'framer-motion'
import moment from 'moment'

const DEFAULT_DEPARTMENTS = ["Engineering", "Design", "Marketing", "Product", "Legal", "Operations", "Sales", "Security"];
const TRACK_COLORS = {
    violet: { bg: "bg-violet-50/90 hover:bg-violet-100", border: "border-violet-500", text: "text-violet-900", hex: "#9C00FF" },
    emerald: { bg: "bg-emerald-50/90 hover:bg-emerald-100", border: "border-emerald-500", text: "text-emerald-900", hex: "#10b981" },
    amber: { bg: "bg-amber-50/90 hover:bg-amber-100", border: "border-amber-500", text: "text-amber-900", hex: "#f59e0b" },
    blue: { bg: "bg-blue-50/90 hover:bg-blue-100", border: "border-blue-500", text: "text-blue-900", hex: "#3b82f6" },
    rose: { bg: "bg-rose-50/90 hover:bg-rose-100", border: "border-rose-500", text: "text-rose-900", hex: "#f43f5e" },
    pink: { bg: "bg-pink-50/90 hover:bg-pink-100", border: "border-pink-500", text: "text-pink-900", hex: "#ec4899" }
};

// 1. Advanced Critical Path Solver
const getCriticalPathTaskIds = (tasks) => {
    if (!tasks || tasks.length === 0) return new Set();
    
    // Build child relationships (who is blocked by whom)
    const blockedBy = {};
    tasks.forEach(t => {
        t.dependencies?.forEach(depId => {
            if (!blockedBy[depId]) blockedBy[depId] = [];
            blockedBy[depId].push(t._id);
        });
    });

    // Find ending tasks (tasks that block no other task)
    const endTasks = tasks.filter(t => !blockedBy[t._id] || blockedBy[t._id].length === 0);
    if (endTasks.length === 0) return new Set();

    // Find latest ending timestamp
    const maxEndDate = Math.max(...endTasks.map(t => t.endDate));
    
    // Critical ends (those ending at or within 1.5 days of project end)
    const criticalEnds = endTasks.filter(t => t.endDate >= maxEndDate - 36 * 60 * 60 * 1000);
    
    const criticalSet = new Set();
    const traverseBackward = (task) => {
        if (criticalSet.has(task._id)) return;
        criticalSet.add(task._id);
        
        task.dependencies?.forEach(parentId => {
            const parent = tasks.find(x => x._id === parentId);
            if (parent) {
                // Tight dependency check (gap <= 2 days)
                const gap = task.startDate - parent.endDate;
                if (gap <= 24 * 60 * 60 * 1000 * 2) {
                    traverseBackward(parent);
                }
            }
        });
    };

    criticalEnds.forEach(traverseBackward);
    return criticalSet;
};

// 2. Timeline Doctor Structural Diagnostic Auditor
const detectTimelineIssues = (tasks, chronicleMembers = []) => {
    const issues = {
        cycles: [],
        overloads: [],
        idleGaps: []
    };

    if (!tasks || tasks.length === 0) return issues;

    // 2.1 DFS cycle detection
    const visited = {};
    const path = [];
    const dfs = (taskId) => {
        visited[taskId] = 1;
        path.push(taskId);
        
        const task = tasks.find(x => x._id === taskId);
        if (task && task.dependencies) {
            for (const parentId of task.dependencies) {
                if (visited[parentId] === 1) {
                    const cycleIdx = path.indexOf(parentId);
                    const cycleNames = path.slice(cycleIdx).map(id => tasks.find(x => x._id === id)?.name || "Unknown");
                    issues.cycles.push(`${cycleNames.join(" ➔ ")} ➔ ${cycleNames[0]}`);
                } else if (!visited[parentId]) {
                    dfs(parentId);
                }
            }
        }
        
        path.pop();
        visited[taskId] = 2;
    };

    tasks.forEach(t => {
        if (!visited[t._id]) dfs(t._id);
    });

    // 2.2 Date overlap detection for same Assignees (supporting both legacy string assignee and assigneeIds array)
    const assignees = {};
    tasks.forEach(t => {
        if (t.assignee && t.assignee.trim()) {
            const name = t.assignee.trim();
            if (!assignees[name]) assignees[name] = [];
            assignees[name].push(t);
        }

        if (t.assigneeIds && t.assigneeIds.length > 0) {
            t.assigneeIds.forEach(uid => {
                const foundMember = chronicleMembers.find(m => m.userId === uid);
                const name = foundMember ? foundMember.name : `Collaborator (${uid.slice(-4)})`;
                if (!assignees[name]) assignees[name] = [];
                if (!assignees[name].some(x => x._id === t._id)) {
                    assignees[name].push(t);
                }
            });
        }
    });

    Object.keys(assignees).forEach(name => {
        const userTasks = assignees[name];
        for (let i = 0; i < userTasks.length; i++) {
            for (let j = i + 1; j < userTasks.length; j++) {
                const a = userTasks[i];
                const b = userTasks[j];
                const overlaps = !(a.startDate >= b.endDate || a.endDate <= b.startDate);
                if (overlaps) {
                    issues.overloads.push(`"${name}" is double-booked: "${a.name}" and "${b.name}" overlap in dates.`);
                }
            }
        }
    });

    // 2.3 Timeline idle gaps > 5 days
    if (tasks.length > 1) {
        const sorted = [...tasks].sort((a, b) => a.startDate - b.startDate);
        let currentMaxEnd = sorted[0].endDate;
        for (let i = 1; i < sorted.length; i++) {
            const t = sorted[i];
            if (t.startDate > currentMaxEnd) {
                const gapDays = Math.round((t.startDate - currentMaxEnd) / (24 * 60 * 60 * 1000));
                if (gapDays > 5) {
                    issues.idleGaps.push(`Idle gap of ${gapDays} days between "${sorted[i-1].name}" and "${t.name}".`);
                }
            }
            currentMaxEnd = Math.max(currentMaxEnd, t.endDate);
        }
    }

    return issues;
};

// 3. AI-Driven Monte Carlo Schedule Risk Forecaster (Phase 2 Component)
const runMonteCarloSimulation = (tasks, iterations = 300) => {
    if (!tasks || tasks.length === 0) return null;
    
    // Sort topologically by timeline dates to cascade delays chronologically
    const sortedTasks = [...tasks].sort((a, b) => a.startDate - b.startDate);
    const nominalEndDate = Math.max(...tasks.map(t => t.endDate));
    const simulatedEndDates = [];
    
    for (let i = 0; i < iterations; i++) {
        const simTaskEnds = {};
        sortedTasks.forEach(t => {
            const duration = t.endDate - t.startDate;
            
            // Resolve dependencies end dates cascade
            let maxParentEnd = t.startDate;
            if (t.dependencies && t.dependencies.length > 0) {
                t.dependencies.forEach(depId => {
                    if (simTaskEnds[depId]) {
                        maxParentEnd = Math.max(maxParentEnd, simTaskEnds[depId]);
                    }
                });
            }
            
            // Delays simulated at random range representing typical operational friction (95% to 135% duration variance)
            const randomVariance = 0.95 + Math.random() * 0.40;
            const simDuration = duration * randomVariance;
            simTaskEnds[t._id] = maxParentEnd + simDuration;
        });
        
        const projectEnd = Math.max(...Object.values(simTaskEnds));
        simulatedEndDates.push(projectEnd);
    }
    
    simulatedEndDates.sort((a, b) => a - b);
    
    const p10 = simulatedEndDates[Math.floor(iterations * 0.10)];
    const p50 = simulatedEndDates[Math.floor(iterations * 0.50)];
    const p90 = simulatedEndDates[Math.floor(iterations * 0.90)];
    
    const onTimeCount = simulatedEndDates.filter(d => d <= nominalEndDate).length;
    const probabilityOnTime = Math.round((onTimeCount / iterations) * 100);
    
    return {
        nominalEndDate,
        p10,
        p50,
        p90,
        probabilityOnTime,
        simulatedEndDates
    };
};

const getTrackTasksWithStackIndices = (trackTasks) => {
    const sorted = [...trackTasks].sort((a, b) => a.startDate - b.startDate);
    const lanes = [];
    const resultTasks = [];
    
    sorted.forEach(task => {
        let stackIndex = 0;
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
            const hasOverlap = lanes[i].some(t => {
                return !(task.startDate >= t.endDate || task.endDate <= t.startDate);
            });
            if (!hasOverlap) {
                lanes[i].push(task);
                stackIndex = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            lanes.push([task]);
            stackIndex = lanes.length - 1;
        }
        resultTasks.push({ ...task, stackIndex });
    });
    
    return { tasks: resultTasks, maxLanes: Math.max(1, lanes.length) };
};

export default function Workspace({ params }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const chronicleId = resolvedParams.projectId;

    const [isChatOpen, setIsChatOpen] = useState(true);
    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewType, setPreviewType] = useState(null); // "create_timeline" | "reschedule"
    const [previewCode, setPreviewCode] = useState(null);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [isLanesOpen, setIsLanesOpen] = useState(false);
    const [newLaneName, setNewLaneName] = useState("");
    const [hoveredTask, setHoveredTask] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, showBelow: false });
    const hoverTimeoutRef = useRef(null);
    const [pastStates, setPastStates] = useState([]);
    const [futureStates, setFutureStates] = useState([]);

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("editor");
    const [isDoctorOpen, setIsDoctorOpen] = useState(false);
    const [simulationResult, setSimulationResult] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);

    useEffect(() => {
        if (!isDoctorOpen) {
            setSimulationResult(null);
            setIsSimulating(false);
        }
    }, [isDoctorOpen]);

    const handleRunSimulation = () => {
        setIsSimulating(true);
        setSimulationResult(null);
        setTimeout(() => {
            const res = runMonteCarloSimulation(dbTasks, 300);
            setSimulationResult(res);
            setIsSimulating(false);
            toast.success("Timeline Risk Simulation compiled!");
        }, 1100);
    };

    const snapshotBeforeChange = () => {
        if (dbTasks.length === 0) return;
        setPastStates(prev => [...prev, JSON.parse(JSON.stringify(dbTasks))]);
        setFutureStates([]);
    };

    const handleUndo = async () => {
        if (pastStates.length === 0) return;
        const prev = pastStates[pastStates.length - 1];
        setPastStates(prev => prev.slice(0, -1));
        setFutureStates(prev => [JSON.parse(JSON.stringify(dbTasks)), ...prev]);
        await restoreTaskState(prev);
    };

    const handleRedo = async () => {
        if (futureStates.length === 0) return;
        const next = futureStates[0];
        setFutureStates(prev => prev.slice(1));
        setPastStates(prev => [...prev, JSON.parse(JSON.stringify(dbTasks))]);
        await restoreTaskState(next);
    };

    const restoreTaskState = async (targetTasks) => {
        const loadingToast = toast.loading("Restoring timeline state...");
        try {
            const currentIds = new Set(dbTasks.map(t => t._id));
            const targetIds = new Set(targetTasks.map(t => t._id));

            // Delete tasks removed in target state
            for (const t of dbTasks) {
                if (!targetIds.has(t._id)) {
                    await removeTask({ id: t._id });
                }
            }

            // Update or create tasks
            const idMap = {};
            for (const t of targetTasks) {
                const { _id, _creationTime, chronicleId: cId, stackIndex, ...fields } = t;
                if (currentIds.has(_id)) {
                    await updateTask({ id: _id, ...fields });
                } else {
                    const newId = await createTask({ chronicleId, ...fields });
                    idMap[_id] = newId;
                }
            }

            // Remap dependencies for re-created tasks
            if (Object.keys(idMap).length > 0) {
                for (const t of targetTasks) {
                    if (t.dependencies && t.dependencies.length > 0) {
                        const newId = idMap[t._id];
                        if (newId) {
                            const remapped = t.dependencies.map(d => idMap[d] || d);
                            await updateTask({ id: newId, dependencies: remapped });
                        }
                    }
                }
            }

            toast.success("Timeline state restored!", { id: loadingToast });
        } catch (e) {
            toast.error("State restoration failed: " + e.message, { id: loadingToast });
        }
    };

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedoRef.current();
                } else {
                    handleUndoRef.current();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedoRef.current();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleUndoRef = useRef(handleUndo);
    const handleRedoRef = useRef(handleRedo);
    handleUndoRef.current = handleUndo;
    handleRedoRef.current = handleRedo;

    // Snapshot before applied preview when user confirms

    // Convex queries and mutations
    const chronicle = useQuery(api.chronicles.getById, { id: chronicleId });
    const dbTasks = useQuery(api.tasks.listByChronicle, { chronicleId }) || [];
    const chronicleMembers = useQuery(api.chronicles.getMembers, { chronicleId }) || [];
    const { userData: activeUser } = useContext(UserContext);
    const activePresences = useQuery(api.presence.listByChronicle, { chronicleId }) || [];

    const currentUserRole = useMemo(() => {
        if (!activeUser || !chronicle) return "viewer";
        if (chronicle.userId === activeUser._id) return "owner";
        const member = chronicleMembers.find(m => m.userId === activeUser._id);
        return member ? member.role : "viewer";
    }, [activeUser, chronicle, chronicleMembers]);
    
    const createTask = useMutation(api.tasks.create);
    const updateTask = useMutation(api.tasks.update);
    const removeTask = useMutation(api.tasks.remove);
    const batchUpdateDates = useMutation(api.tasks.batchUpdateDates);
    const updateChronicleDepartments = useMutation(api.chronicles.updateDepartments);
    const inviteMemberMutation = useMutation(api.chronicles.inviteMember);
    const removeMemberMutation = useMutation(api.chronicles.removeMember);
    const updatePresenceMutation = useMutation(api.presence.updatePresence);

    // Critical Path
    const criticalPathIds = useMemo(() => {
        return getCriticalPathTaskIds(dbTasks);
    }, [dbTasks]);

    // Scrubber history mapping
    const historyStates = useMemo(() => {
        return [...pastStates, dbTasks, ...futureStates];
    }, [pastStates, dbTasks, futureStates]);

    const activeHistoryIndex = pastStates.length;

    const handleScrubHistory = async (index) => {
        const targetIndex = Number(index);
        if (targetIndex === activeHistoryIndex) return;
        
        const targetState = historyStates[targetIndex];
        if (!targetState) return;

        // Re-adjust history arrays based on the shift
        if (targetIndex < activeHistoryIndex) {
            // Moved backward: push current & intermediate states to futureStates
            const statesToMoveFuture = historyStates.slice(targetIndex + 1, activeHistoryIndex + 1);
            setFutureStates(prev => [...statesToMoveFuture, ...prev]);
            setPastStates(prev => prev.slice(0, targetIndex));
        } else {
            // Moved forward: push intermediate states to pastStates
            const statesToMovePast = historyStates.slice(activeHistoryIndex, targetIndex);
            setPastStates(prev => [...prev, ...statesToMovePast]);
            setFutureStates(prev => prev.slice(targetIndex - activeHistoryIndex + 1));
        }
        
        await restoreTaskState(targetState);
    };

    // Throttled mouse tracking and coordinate presence update
    const lastPresenceUpdateRef = useRef(0);
    const handleMouseMove = useCallback((e) => {
        if (!chronicleId || !activeUser) return;
        const now = Date.now();
        if (now - lastPresenceUpdateRef.current < 120) return; // Throttle presence updates to 120ms
        lastPresenceUpdateRef.current = now;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
        const y = e.clientY - rect.top + e.currentTarget.scrollTop;

        updatePresenceMutation({
            chronicleId,
            userId: activeUser._id,
            cursor: { x, y }
        }).catch(() => {});
    }, [chronicleId, activeUser, updatePresenceMutation]);

    const handleMouseLeaveCanvas = useCallback(() => {
        if (!chronicleId || !activeUser) return;
        updatePresenceMutation({
            chronicleId,
            userId: activeUser._id,
            cursor: undefined
        }).catch(() => {});
    }, [chronicleId, activeUser, updatePresenceMutation]);

    const departments = useMemo(() => {
        return chronicle?.departments || DEFAULT_DEPARTMENTS;
    }, [chronicle]);

    // Active tasks rendered (toggles between database tasks and AI preview shifts)
    const activeTasks = useMemo(() => {
        return previewData || dbTasks;
    }, [previewData, dbTasks]);

    // Calculate timescale dimensions based on tasks dates
    const timelineBounds = useMemo(() => {
        if (activeTasks.length === 0) {
            const todayStart = new Date().setHours(0, 0, 0, 0);
            return {
                min: todayStart,
                max: todayStart + 14 * 24 * 60 * 60 * 1000, // 2 weeks default
                days: 14
            };
        }

        const startDates = activeTasks.map(t => t.startDate);
        const endDates = activeTasks.map(t => t.endDate);
        const minDate = Math.min(...startDates) - 2 * 24 * 60 * 60 * 1000; // 2 days padding
        const maxDate = Math.max(...endDates) + 4 * 24 * 60 * 60 * 1000; // 4 days padding
        const totalDays = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000));

        return {
            min: minDate,
            max: maxDate,
            days: totalDays
        };
    }, [activeTasks]);

    // Converts date value into horizontal left and width percentages
    const getTaskCoordinates = useCallback((startDate, endDate) => {
        const { min, max } = timelineBounds;
        const totalRange = max - min;
        if (totalRange <= 0) return { left: 0, width: 100 };

        const left = ((startDate - min) / totalRange) * 100;
        const width = ((endDate - startDate) / totalRange) * 100;

        return {
            left: Math.max(0, Math.min(100, left)),
            width: Math.max(2, Math.min(100, width))
        };
    }, [timelineBounds]);

    // Task editing states
    const handleOpenEditor = (task) => {
        setEditingTask(task);
        setIsEditorOpen(true);
    };

    const handleCreateTaskOnTrack = async (department) => {
        snapshotBeforeChange();
        const today = new Date().setHours(9, 0, 0, 0);
        const tomorrow = today + 24 * 60 * 60 * 1000;
        const colors = Object.keys(TRACK_COLORS);
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        try {
            const taskId = await createTask({
                chronicleId,
                name: `New ${department} Task`,
                status: "todo",
                startDate: today,
                endDate: tomorrow,
                color: randomColor,
                department,
                dependencies: [],
                notes: "Visual quick add task. Double click to add dependency links, notes or change dates."
            });
            toast.success("Task added to track!");
            const newTask = {
                _id: taskId,
                name: `New ${department} Task`,
                status: "todo",
                startDate: today,
                endDate: tomorrow,
                color: randomColor,
                department,
                dependencies: []
            };
            handleOpenEditor(newTask);
        } catch (e) {
            toast.error("Failed to add task");
        }
    };

    const handleSaveTask = async (updatedFields) => {
        if (!editingTask) return;
        snapshotBeforeChange();
        try {
            // Clean up system fields Convex doesn't validate
            const { _id, _creationTime, chronicleId, stackIndex, ...cleanFields } = updatedFields;
            await updateTask({
                id: editingTask._id,
                ...cleanFields
            });
            toast.success("Saved task details!");
            setIsEditorOpen(false);
            setEditingTask(null);
        } catch (e) {
            toast.error("Failed to save task modifications");
        }
    };

    const handleDeleteTask = async (taskId) => {
        snapshotBeforeChange();
        try {
            await removeTask({ id: taskId });
            toast.success("Task removed from timeline");
            setIsEditorOpen(false);
            setEditingTask(null);
        } catch (e) {
            toast.error("Failed to delete task");
        }
    };

    const handleApplyPreview = async () => {
        if (!previewData) return;
        snapshotBeforeChange();
        const loadingToast = toast.loading("Applying changes...");
        try {
            if (previewType === "create_timeline" && previewCode) {
                // Delete existing database tasks first to swap them
                for (const t of dbTasks) {
                    await removeTask({ id: t._id });
                }

                // Batch insert proposed timeline tasks. Resolving dependencies sequentially.
                const tempIdMap = {};
                for (const t of previewData) {
                    const { _id, dependencies, stackIndex, ...cleanTask } = t;
                    const realDeps = (dependencies || []).map(index => tempIdMap[index]).filter(Boolean);
                    
                    // Map AI-generated emails to real database user IDs based on invited members
                    const realAssigneeIds = [];
                    if (cleanTask.assigneeEmails && cleanTask.assigneeEmails.length > 0) {
                        cleanTask.assigneeEmails.forEach(email => {
                            const foundMember = chronicleMembers.find(m => m.email.toLowerCase() === email.trim().toLowerCase());
                            if (foundMember) {
                                realAssigneeIds.push(foundMember.userId);
                            }
                        });
                    }
                    
                    const newId = await createTask({
                        chronicleId,
                        ...cleanTask,
                        assigneeIds: realAssigneeIds,
                        dependencies: realDeps
                    });
                    tempIdMap[_id.replace("preview_", "")] = newId;
                }
            } else if (previewType === "reschedule" && previewCode) {
                // Bulk shift date patches
                const updates = previewData.map(t => ({
                    id: t._id,
                    startDate: t.startDate,
                    endDate: t.endDate
                }));
                await batchUpdateDates({ updates });
            }

            setPreviewData(null);
            setPreviewType(null);
            setPreviewCode(null);
            toast.success("Timeline successfully synchronized!", { id: loadingToast });
        } catch (e) {
            console.error(e);
            toast.error("Sync failed: " + e.message, { id: loadingToast });
        }
    };

    // Calculate grid lines for days
    const timescaleHeaders = useMemo(() => {
        const { min, days } = timelineBounds;
        const headers = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(min + i * 24 * 60 * 60 * 1000);
            headers.push({
                label: moment(date).format("MMM D"),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
        }
        return headers;
    }, [timelineBounds]);

    const gridWidth = useMemo(() => {
        return Math.max(960, (timescaleHeaders?.length || 0) * 80);
    }, [timescaleHeaders]);

    // Calculate vertical offset for each department row dynamically
    const rowMetrics = useMemo(() => {
        let currentY = 16; // matching absolute padding p-4 (16px)
        const spacing = 16; // matching space-y-4 (16px)
        const metrics = {};
        
        departments.forEach((dept) => {
            const trackTasks = activeTasks.filter(t => t.department === dept);
            // Sort tasks to calculate stack levels
            const sorted = [...trackTasks].sort((a, b) => a.startDate - b.startDate);
            const lanes = [];
            sorted.forEach(task => {
                let placed = false;
                for (let i = 0; i < lanes.length; i++) {
                    const hasOverlap = lanes[i].some(t => {
                        return !(task.startDate >= t.endDate || task.endDate <= t.startDate);
                    });
                    if (!hasOverlap) {
                        lanes[i].push(task);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    lanes.push([task]);
                }
            });
            const maxLanes = Math.max(1, lanes.length);
            const rowHeight = maxLanes * 46 + 26; // dynamic height
            
            metrics[dept] = {
                yStart: currentY,
                yCenter: currentY + rowHeight / 2,
                height: rowHeight
            };
            
            currentY += rowHeight + spacing;
        });
        
        return metrics;
    }, [departments, activeTasks]);

    // Vector Calculation Engine
    const dependencyPaths = useMemo(() => {
        const paths = [];

        activeTasks.forEach((task) => {
            if (!task.dependencies || task.dependencies.length === 0) return;

            const metricB = rowMetrics[task.department];
            if (!metricB) return;
            const coordB = getTaskCoordinates(task.startDate, task.endDate);

            // Compute center-left point of dependent task (B)
            const yB = metricB.yCenter;
            const xB = coordB.left; // left percentage boundary

            task.dependencies.forEach((depId) => {
                const parent = activeTasks.find(x => x._id === depId);
                const parentDraftIndex = typeof depId === "number" ? depId : null;
                const draftParent = parentDraftIndex !== null ? activeTasks[parentDraftIndex] : null;
                
                const finalParent = parent || draftParent;
                if (!finalParent) return;

                const metricA = rowMetrics[finalParent.department];
                if (!metricA) return;
                const coordA = getTaskCoordinates(finalParent.startDate, finalParent.endDate);

                // Compute center-right point of parent blocking task (A)
                const yA = metricA.yCenter;
                const xA = coordA.left + coordA.width; // right percentage boundary

                const isCritical = criticalPathIds.has(finalParent._id) && criticalPathIds.has(task._id);

                paths.push({
                    id: `${finalParent._id}_to_${task._id}`,
                    xA, yA, xB, yB,
                    color: isCritical ? "#9C00FF" : (TRACK_COLORS[finalParent.color]?.hex || "#9C00FF"),
                    isCritical
                });
            });
        });

        return paths;
    }, [activeTasks, getTaskCoordinates, rowMetrics, criticalPathIds]);

    if (!chronicle) return <Loader />;

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden text-slate-950 font-sans">
            
            {/* Header / Toolbar switcher */}
            <header className="h-16 border-b-4 border-black flex items-center justify-between px-4 bg-white z-30">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => window.history.back()} 
                        className="rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-black text-slate-950 uppercase italic tracking-tight leading-tight">{chronicle.name}</h1>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 border border-violet-200 rounded">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-violet-750">Sync Live</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {previewData && (
                        <div className="flex items-center bg-amber-50 p-1 border-2 border-amber-500 gap-2 text-xs font-bold uppercase tracking-wider animate-pulse px-3 h-10">
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>Previewing Shift</span>
                            <div className="w-px h-5 bg-amber-200" />
                            <button 
                                onClick={() => {
                                    setPreviewData(null);
                                    setPreviewType(null);
                                }}
                                className="text-red-600 hover:text-red-500 hover:underline"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleApplyPreview}
                                className="text-emerald-700 hover:text-emerald-600 hover:underline ml-2"
                            >
                                Apply Changes
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-1 mr-1">
                        <button
                            onClick={handleUndo}
                            disabled={pastStates.length === 0}
                            className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={futureStates.length === 0}
                            className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>



                    <Button 
                        onClick={() => setIsInviteOpen(true)}
                        className="bg-violet-600 hover:bg-violet-750 text-white rounded-none border-2 border-black font-black text-[10px] uppercase tracking-widest h-9 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Invite
                    </Button>

                    <Button 
                        onClick={() => setIsDoctorOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none border-2 border-black font-black text-[10px] uppercase tracking-widest h-9 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all animate-pulse"
                        style={{ animationDuration: '4s' }}
                    >
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                        Timeline Doctor
                    </Button>

                    <Button 
                        onClick={() => setIsLanesOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-none border-2 border-black font-black text-[10px] uppercase tracking-widest h-9 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                        <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                        Manage Lanes
                    </Button>

                    <Button 
                        onClick={() => setIsStudioOpen(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-none border-2 border-black font-black text-[10px] uppercase tracking-widest h-9 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                        <Zap className="w-3.5 h-3.5 mr-1.5 fill-white" />
                        Event Studio
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Visual Calendar Grid parent wrapper supporting horizontal scroll */}
                <main 
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveCanvas}
                    className="flex-1 overflow-auto custom-scrollbar bg-slate-50 relative chronos-canvas-mesh"
                >
                    <div style={{ width: `${gridWidth}px` }} className="min-h-full flex flex-col relative p-3 pb-10 space-y-3">
                        {/* Figma-style Live Presence Cursors */}
                        {activePresences
                            .filter(p => activeUser && p.userId !== activeUser._id)
                            .map(p => {
                                const member = chronicleMembers.find(m => m.userId === p.userId);
                                if (!p.cursor || !member) return null;
                                return (
                                    <div 
                                        key={p._id}
                                        className="absolute pointer-events-none transition-all duration-75 z-40"
                                        style={{ left: `${p.cursor.x}px`, top: `${p.cursor.y}px` }}
                                    >
                                        <svg className="w-4 h-4 fill-violet-600 stroke-black stroke-2 drop-shadow" viewBox="0 0 24 24">
                                            <path d="M4.5 3V17L9 12.5L14.5 18L17 15.5L11.5 10L16 9.5L4.5 3Z" />
                                        </svg>
                                        <span className="ml-3 px-2 py-0.5 bg-violet-600 border-2 border-black text-white text-[8px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] select-none whitespace-nowrap">
                                            {member.name}
                                        </span>
                                    </div>
                                );
                            })
                        }
                        
                        {/* Visual Timescale Header Row */}
                        <div className="h-8 border-b-2 border-slate-200 bg-white/50 flex shrink-0 select-none relative z-20 w-full mb-1.5">
                            {/* Department Column Title Space */}
                            <div className="w-36 border-r-2 border-slate-200 flex items-center px-3 shrink-0 bg-white">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Track Lanes</span>
                            </div>
                            
                            {/* Dynamic timescale dates scrollable sync */}
                            <div className="flex-1 flex relative">
                                {timescaleHeaders.map((hdr, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "flex-1 flex items-center justify-center border-r border-slate-200 text-[8px] font-black uppercase tracking-wider",
                                            hdr.isWeekend ? "bg-slate-100/50 text-slate-500" : "text-slate-700 bg-white"
                                        )}
                                    >
                                        {hdr.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bezier Vector Overlay Layer */}
                        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 opacity-80">
                            {dependencyPaths.map((path) => (
                                <g key={path.id}>
                                    {/* Neon background shadow line */}
                                    <path 
                                        d={`M ${path.xA}% ${path.yA} C ${(path.xA + path.xB) / 2}% ${path.yA}, ${(path.xA + path.xB) / 2}% ${path.yB}, ${path.xB}% ${path.yB}`} 
                                        stroke={path.color} 
                                        strokeWidth={path.isCritical ? "8" : "4"} 
                                        fill="none" 
                                        opacity={path.isCritical ? "0.35" : "0.15"}
                                        className={path.isCritical ? "blur-[3px] animate-pulse" : "blur-[2px]"}
                                        style={path.isCritical ? { animationDuration: '2s' } : undefined}
                                    />
                                    {/* Fine foreground core vector line */}
                                    <path 
                                        d={`M ${path.xA}% ${path.yA} C ${(path.xA + path.xB) / 2}% ${path.yA}, ${(path.xA + path.xB) / 2}% ${path.yB}, ${path.xB}% ${path.yB}`} 
                                        stroke={path.color} 
                                        strokeWidth={path.isCritical ? "3.5" : "1.5"} 
                                        strokeDasharray={previewData ? "4 4" : (path.isCritical ? "8 2" : undefined)}
                                        fill="none" 
                                        opacity={path.isCritical ? "0.95" : "0.7"}
                                    />
                                    {/* Dependency connection arrowhead */}
                                    <circle cx={`${path.xB}%`} cy={path.yB} r={path.isCritical ? "5" : "3.5"} fill={path.color} />
                                </g>
                            ))}
                        </svg>

                        {departments.map((dept) => {
                            const trackTasks = activeTasks.filter(t => t.department === dept);
                            const { tasks: positionedTasks, maxLanes } = getTrackTasksWithStackIndices(trackTasks);

                            return (
                                <div 
                                    key={dept} 
                                    className="bg-white border-4 border-black relative flex items-center z-10 group/row shadow-[4px_4px_0px_0px_rgba(0,0,0,0.03)] transition-all"
                                    style={{ height: `${maxLanes * 40 + 22}px` }}
                                >
                                    {/* Left Title Label */}
                                    <div className="w-36 border-r-4 border-black h-full flex items-center justify-between px-3 bg-slate-50 shrink-0 select-none">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{dept}</span>
                                        <button 
                                            onClick={() => handleCreateTaskOnTrack(dept)}
                                            className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-slate-200 text-violet-600 border border-slate-300 transition-all rounded"
                                            title={`Add ${dept} task`}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Time Track Area (Blocks Positioned absolutely inside) */}
                                    <div className="flex-1 h-full relative overflow-hidden">
                                        {/* Background dotted vertical separators */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {timescaleHeaders.map((hdr, i) => (
                                                <div 
                                                    key={i} 
                                                    className={cn(
                                                        "flex-1 border-r border-slate-200/50",
                                                        hdr.isWeekend ? "bg-slate-100/30" : ""
                                                    )}
                                                />
                                            ))}
                                        </div>

                                        {/* Task Cards absolute reflow */}
                                        <AnimatePresence>
                                            {positionedTasks.map((task) => {
                                                const coord = getTaskCoordinates(task.startDate, task.endDate);
                                                const colors = TRACK_COLORS[task.color] || TRACK_COLORS.violet;
                                                const isCompleted = task.status === "done";
                                                const isBlocked = task.dependencies?.length > 0;
                                                
                                                // Preview modes add custom animated glows
                                                const isPreviewShifted = previewData && 
                                                    JSON.stringify(dbTasks.find(d => d._id === task._id)) !== JSON.stringify(task);

                                                const handleMouseEnter = (e) => {
                                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const tooltipHeight = 260;
                                                    const spaceAbove = rect.top - 10;
                                                    const rawX = rect.left + rect.width / 2;
                                                    const x = Math.min(Math.max(160, rawX), window.innerWidth - 160);
                                                    const showBelow = spaceAbove < tooltipHeight;
                                                    setTooltipPos({ 
                                                        x, 
                                                        y: showBelow ? rect.bottom + 10 : rect.top - 6,
                                                        showBelow 
                                                    });
                                                    setHoveredTask(task);
                                                };
                                                const handleMouseLeave = () => {
                                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                    hoverTimeoutRef.current = setTimeout(() => setHoveredTask(null), 150);
                                                };

                                                const isAssignedToMe = activeUser && task.assigneeIds?.includes(activeUser._id);

                                                return (
                                                    <motion.div
                                                        key={task._id}
                                                        layoutId={task._id}
                                                        onClick={() => handleOpenEditor(task)}
                                                        onMouseEnter={handleMouseEnter}
                                                        onMouseLeave={handleMouseLeave}
                                                        className={cn(
                                                            "absolute h-9 border-2 border-black flex items-center justify-between px-2 cursor-pointer group shadow-sm hover:scale-[1.02] active:scale-[0.98] select-none transition-shadow",
                                                            colors.bg,
                                                            colors.border,
                                                            isCompleted && "opacity-60",
                                                            isPreviewShifted && "pulse-delay-glow",
                                                            isAssignedToMe && "border-2 border-dashed border-violet-700 shadow-[0px_0px_8px_1px_rgba(156,0,255,0.45)] ring-2 ring-violet-500/20",
                                                            task.isMilestone && "rounded-full w-9 p-0 justify-center h-9 border-4 border-double"
                                                        )}
                                                        style={{ 
                                                            left: `${coord.left}%`, 
                                                            width: task.isMilestone ? "36px" : `${coord.width}%`,
                                                            top: `${task.stackIndex * 40 + 10}px`
                                                        }}
                                                        whileHover={{ scale: 1.02 }}
                                                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                                                    >
                                                        {task.isMilestone ? (
                                                            <div className="flex items-center justify-center shrink-0">
                                                                <Clock className={cn("w-3.5 h-3.5", colors.text, "animate-pulse")} />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                    <div className={cn(
                                                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                                                        isCompleted ? "bg-emerald-500" : isBlocked ? "bg-amber-500" : "bg-violet-500"
                                                                    )} />
                                                                    <span className="text-[9px] font-black uppercase tracking-tight truncate text-slate-950 max-w-[100px]" title={task.name}>
                                                                        {task.name}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Overlapping Assignee Avatar Stack */}
                                                                {task.assigneeIds && task.assigneeIds.length > 0 && (
                                                                    <div className="flex items-center -space-x-1.5 ml-1.5 shrink-0">
                                                                        {task.assigneeIds.slice(0, 2).map((uid, index) => {
                                                                            const member = chronicleMembers.find(m => m.userId === uid);
                                                                            const initials = member ? member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
                                                                            return (
                                                                                <div 
                                                                                    key={uid}
                                                                                    className="w-4.5 h-4.5 rounded-full border border-black bg-violet-100 flex items-center justify-center text-[6px] font-black text-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase select-none shrink-0"
                                                                                    title={member ? `${member.name} (${member.email})` : "Collaborator"}
                                                                                    style={{ zIndex: 10 - index }}
                                                                                >
                                                                                    {initials}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {task.assigneeIds.length > 2 && (
                                                                            <div 
                                                                                className="w-4.5 h-4.5 rounded-full border border-black bg-slate-200 flex items-center justify-center text-[6px] font-black text-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase select-none shrink-0"
                                                                                title={`${task.assigneeIds.length - 2} other assignees`}
                                                                                style={{ zIndex: 1 }}
                                                                            >
                                                                                +{task.assigneeIds.length - 2}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <span className={cn("text-[7px] font-bold uppercase tracking-wider opacity-60 shrink-0 ml-1.5 hidden sm:inline", colors.text)}>
                                                                    {Math.round((task.endDate - task.startDate) / (24 * 60 * 60 * 1000))}d
                                                                </span>
                                                            </>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>


                </main>

                {/* AI Chat coordinator panel side view */}
                <aside className={cn(
                    "transition-all duration-300 flex flex-col shrink-0 relative z-20",
                    isChatOpen ? "w-[440px]" : "w-0 overflow-hidden"
                )}>
                    <ChatPanel 
                        chronicleId={chronicleId}
                        onPreview={(data, type, code) => {
                            setPreviewData(data);
                            setPreviewType(type);
                            setPreviewCode(code);
                        }}
                        previewActive={!!previewData}
                        onClearPreview={() => {
                            setPreviewData(null);
                            setPreviewType(null);
                            setPreviewCode(null);
                        }}
                        onApplyPreview={handleApplyPreview}
                        currentUserRole={currentUserRole}
                    />
                </aside>
            </div>

            {/* Hover Tooltip */}
            {hoveredTask && (() => {
                const depNames = hoveredTask.dependencies
                    ?.map(id => dbTasks.find(t => t._id === id)?.name)
                    .filter(Boolean) || [];
                const startStr = moment(hoveredTask.startDate).format("MMM D");
                const endStr = moment(hoveredTask.endDate).format("MMM D");
                const duration = Math.round((hoveredTask.endDate - hoveredTask.startDate) / (24 * 60 * 60 * 1000));
                return (
                    <div
                        style={{ left: tooltipPos.x, top: tooltipPos.y }}
                        className={cn(
                            "fixed z-[9999] pointer-events-none -translate-x-1/2",
                            tooltipPos.showBelow ? "translate-y-2" : "-translate-y-full"
                        )}
                    >
                        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 min-w-[240px] max-w-[320px]">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0",
                                    hoveredTask.status === "done" ? "bg-emerald-500" : 
                                    hoveredTask.status === "in_progress" ? "bg-violet-500" : "bg-slate-300"
                                )} />
                                <h4 className="text-sm font-black uppercase tracking-tight text-slate-950 leading-tight">{hoveredTask.name}</h4>
                            </div>
                            <div className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider">
                                <div className="flex justify-between text-slate-600">
                                    <span>Department</span>
                                    <span className="text-slate-950">{hoveredTask.department}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Status</span>
                                    <span className={cn(
                                        hoveredTask.status === "done" ? "text-emerald-600" :
                                        hoveredTask.status === "in_progress" ? "text-violet-600" : "text-slate-500"
                                    )}>{hoveredTask.status === "in_progress" ? "In Progress" : hoveredTask.status === "done" ? "Done" : "To Do"}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Duration</span>
                                    <span className="text-slate-950">{duration}d ({startStr} — {endStr})</span>
                                </div>
                                {hoveredTask.isMilestone && (
                                    <div className="flex justify-between text-amber-600">
                                        <span>Type</span>
                                        <span className="font-black">Milestone</span>
                                    </div>
                                )}
                                {hoveredTask.assigneeIds && hoveredTask.assigneeIds.length > 0 && (() => {
                                    const assignees = hoveredTask.assigneeIds.map(uid => {
                                        return chronicleMembers.find(m => m.userId === uid);
                                    }).filter(Boolean);
                                    
                                    if (assignees.length === 0) return null;
                                    
                                    return (
                                        <div className="pt-2 border-t border-slate-200 mt-1">
                                            <span className="text-slate-500 text-[8px] uppercase tracking-wider block mb-1.5 font-bold">Assignees</span>
                                            <div className="space-y-1.5">
                                                {assignees.map((member) => {
                                                    const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                                                    return (
                                                        <div key={member.userId} className="flex items-center gap-2 bg-slate-50 border-2 border-black p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                            <div className="w-6 h-6 rounded-full border border-black bg-violet-100 flex items-center justify-center text-[8px] font-black text-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase select-none shrink-0">
                                                                {initials}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[9px] font-black text-slate-950 uppercase truncate tracking-tight">{member.name}</span>
                                                                <span className="text-[7px] font-bold text-slate-400 truncate tracking-wide lowercase -mt-0.5">{member.email}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                                {hoveredTask.assignee && !hoveredTask.assigneeIds?.length && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Assignee</span>
                                        <span className="text-slate-950 font-black uppercase text-[9px]">{hoveredTask.assignee}</span>
                                    </div>
                                )}
                                {depNames.length > 0 && (
                                    <div className="pt-1.5 border-t border-slate-200">
                                        <span className="text-slate-500 text-[8px]">Blocked by</span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {depNames.map((name, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-amber-50 border border-amber-300 text-[8px] font-black text-amber-700 uppercase tracking-wider">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {hoveredTask.notes && (
                                    <div className="pt-1.5 border-t border-slate-200">
                                        <span className="text-slate-500 text-[8px]">Notes</span>
                                        <p className="mt-0.5 text-[9px] font-normal text-slate-700 leading-snug normal-case">{hoveredTask.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Task Editor Dialog Modals */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                {editingTask && (
                    <DialogContent className="sm:max-w-[480px] border-4 border-black rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 bg-white text-slate-950 max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Locked Header */}
                        <DialogHeader className="p-6 pb-4 border-b border-slate-200">
                            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950">Task Blueprint Settings</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-1">
                                Configure spatial bounds, departmental tracks, and blocking relationships.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 py-4 space-y-3 text-xs no-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Task Name</label>
                                <Input 
                                    value={editingTask.name} 
                                    onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                    className="bg-white border-2 border-black h-9 font-bold focus-visible:ring-violet-500 text-slate-950 rounded-none placeholder:text-slate-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Track lane</label>
                                    <select 
                                        value={editingTask.department} 
                                        onChange={(e) => setEditingTask({ ...editingTask, department: e.target.value })}
                                        className="w-full bg-white border-2 border-black h-9 px-2 font-bold text-xs uppercase focus:outline-none focus:border-violet-500 text-slate-950"
                                    >
                                        {departments.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Color Theme</label>
                                    <select 
                                        value={editingTask.color} 
                                        onChange={(e) => setEditingTask({ ...editingTask, color: e.target.value })}
                                        className="w-full bg-white border-2 border-black h-9 px-2 font-bold text-xs uppercase focus:outline-none focus:border-violet-500 text-slate-950"
                                    >
                                        {Object.keys(TRACK_COLORS).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Start Date</label>
                                    <input 
                                        type="date"
                                        value={moment(editingTask.startDate).format("YYYY-MM-DD")}
                                        onChange={(e) => {
                                            const newStart = new Date(e.target.value).getTime();
                                            // Keep current delta duration
                                            const duration = editingTask.endDate - editingTask.startDate;
                                            setEditingTask({ 
                                                ...editingTask, 
                                                startDate: newStart, 
                                                endDate: newStart + duration 
                                            });
                                        }}
                                        className="w-full bg-white border-2 border-black h-9 px-3 font-bold text-slate-950 focus:outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">End Date</label>
                                    <input 
                                        type="date"
                                        value={moment(editingTask.endDate).format("YYYY-MM-DD")}
                                        onChange={(e) => {
                                            const newEnd = new Date(e.target.value).getTime();
                                            if (newEnd > editingTask.startDate) {
                                                setEditingTask({ ...editingTask, endDate: newEnd });
                                            }
                                        }}
                                        className="w-full bg-white border-2 border-black h-9 px-3 font-bold text-slate-950 focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Workflow Status</label>
                                    <select 
                                        value={editingTask.status} 
                                        onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                                        className="w-full bg-white border-2 border-black h-9 px-2 font-bold text-xs uppercase focus:outline-none focus:border-violet-500 text-slate-950"
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done (Completed)</option>
                                    </select>
                                </div>

                                <div className="space-y-1 flex flex-col justify-end">
                                    <label className="flex items-center gap-2 h-9 bg-white border-2 border-black px-3 cursor-pointer select-none">
                                        <input 
                                            type="checkbox"
                                            checked={!!editingTask.isMilestone}
                                            onChange={(e) => setEditingTask({ ...editingTask, isMilestone: e.target.checked })}
                                            className="accent-violet-500 scale-110"
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Target Milestone</span>
                                    </label>
                                </div>
                            </div>

                            {/* Dependencies checklist */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Blocking Dependencies (Blocked by)</label>
                                <div className="max-h-24 overflow-y-auto border-2 border-black bg-white p-2 space-y-1.5 no-scrollbar">
                                    {dbTasks
                                        .filter(t => t._id !== editingTask._id)
                                        .map(t => {
                                            const isChecked = editingTask.dependencies?.includes(t._id);
                                            return (
                                                <label key={t._id} className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold text-slate-800">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const newDeps = e.target.checked 
                                                                ? [...(editingTask.dependencies || []), t._id]
                                                                : (editingTask.dependencies || []).filter(id => id !== t._id);
                                                            setEditingTask({ ...editingTask, dependencies: newDeps });
                                                        }}
                                                        className="accent-violet-500"
                                                    />
                                                    <span className="truncate">[{t.department}] {t.name}</span>
                                                </label>
                                            );
                                        })
                                    }
                                    {dbTasks.filter(t => t._id !== editingTask._id).length === 0 && (
                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest text-center py-4">No other tasks to link.</p>
                                    )}
                                </div>
                            </div>

                            {/* Collaborator Assignment Checklist */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Assign Collaborators (Optional)</label>
                                <div className="max-h-24 overflow-y-auto border-2 border-black bg-white p-2 space-y-1.5 no-scrollbar">
                                    {chronicleMembers.map((m) => {
                                        const isChecked = editingTask.assigneeIds?.includes(m.userId);
                                        return (
                                            <label key={m._id} className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold text-slate-800">
                                                <input 
                                                    type="checkbox"
                                                    checked={!!isChecked}
                                                    onChange={(e) => {
                                                        const newAssignees = e.target.checked 
                                                            ? [...(editingTask.assigneeIds || []), m.userId]
                                                            : (editingTask.assigneeIds || []).filter(id => id !== m.userId);
                                                        setEditingTask({ ...editingTask, assigneeIds: newAssignees });
                                                    }}
                                                    className="accent-violet-500"
                                                />
                                                <span className="truncate">{m.name} ({m.email})</span>
                                            </label>
                                        );
                                    })}
                                    {chronicleMembers.length === 0 && (
                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest text-center py-4">No active chronicle members invited yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-700">Notes</label>
                                <textarea
                                    value={editingTask.notes || ""}
                                    onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                                    rows={3}
                                    className="w-full bg-white border-2 border-black p-3 font-bold text-xs text-slate-950 focus:outline-none focus:border-violet-500 resize-none placeholder:text-slate-400"
                                    placeholder="Add notes, context, or instructions for this task..."
                                />
                            </div>
                        </div>

                        {/* Locked Footer */}
                        <DialogFooter className="p-6 pt-4 border-t border-slate-200 flex flex-col gap-2 sm:flex-row bg-slate-50">
                            <Button 
                                onClick={() => handleDeleteTask(editingTask._id)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-none border-2 border-black font-black uppercase tracking-widest text-[9px] h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shrink-0"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Task
                            </Button>
                            
                            <div className="flex-1 flex gap-2">
                                <Button 
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditorOpen(false);
                                        setEditingTask(null);
                                    }}
                                    className="flex-1 rounded-none border-2 border-black font-black uppercase tracking-widest text-[9px] h-10 text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={() => handleSaveTask(editingTask)}
                                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white rounded-none border-2 border-black font-black uppercase tracking-widest text-[9px] h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                                >
                                    Save Blueprint
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* Invite Collaborators Modal */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-0 bg-white text-slate-950 max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border-2 border-black bg-violet-600 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-white">
                                <UserPlus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950">Invite Collaborators</DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-1">
                                    Share this chronicle with other workspace members to edit and plan.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 py-4 space-y-4 no-scrollbar">
                        {/* Invite Form */}
                        <div className="space-y-3 bg-slate-50 p-4 border-2 border-black">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Add Workspace Member</h4>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Enter collaborator email..."
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="bg-white border-2 border-black h-10 font-bold text-xs text-slate-950 rounded-none placeholder:text-slate-400"
                                />
                                <select 
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="bg-white border-2 border-black h-10 px-2 font-bold text-xs uppercase focus:outline-none focus:border-violet-500 text-slate-950"
                                >
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <Button 
                                disabled={!inviteEmail.trim()}
                                onClick={async () => {
                                    const email = inviteEmail.trim();
                                    const loadingToast = toast.loading("Inviting collaborator...");
                                    try {
                                        await inviteMemberMutation({
                                            chronicleId,
                                            email,
                                            role: inviteRole
                                        });
                                        toast.success(`Invited user "${email}"!`, { id: loadingToast });
                                        setInviteEmail("");
                                    } catch (err) {
                                        let cleanMessage = err.message || "Failed to invite member";
                                        if (cleanMessage.includes("is not registered in Chronos yet")) {
                                            cleanMessage = `"${email}" is not registered in Chronos yet.`;
                                        } else if (cleanMessage.includes("already a member")) {
                                            cleanMessage = `"${email}" is already a member of this chronicle.`;
                                        } else {
                                            cleanMessage = cleanMessage.replace("Uncaught Error: ", "").split("\n")[0];
                                        }
                                        toast.error(cleanMessage, { id: loadingToast });
                                    }
                                }}
                                className="w-full bg-violet-600 hover:bg-violet-750 text-white rounded-none border-2 border-black font-black text-xs uppercase tracking-widest h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                            >
                                Deploy Invite
                            </Button>
                        </div>

                        {/* Members list */}
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                                <span>Active Members</span>
                                <span className="text-violet-700">{chronicleMembers.length} Joined</span>
                            </h4>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar pt-1">
                                {chronicleMembers.map((m) => (
                                    <div key={m._id} className="flex items-center justify-between p-2 border border-slate-300 bg-white">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{m.name}</p>
                                            <p className="text-[8px] font-bold text-slate-500 leading-none mt-1 truncate">{m.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 text-[8px] font-black uppercase tracking-wider">
                                                {m.role}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={async () => {
                                                    try {
                                                        await removeMemberMutation({ id: m._id });
                                                        toast.success("Collaborator removed");
                                                    } catch (e) {
                                                        toast.error("Failed to remove collaborator");
                                                    }
                                                }}
                                                className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {chronicleMembers.length === 0 && (
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest text-center py-6">No collaborators invited yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t border-slate-200 bg-slate-50">
                        <Button 
                            onClick={() => setIsInviteOpen(false)}
                            className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-none border-2 border-black font-black uppercase tracking-widest h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                            Close Share Panel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Timeline Doctor Modal */}
            <Dialog open={isDoctorOpen} onOpenChange={setIsDoctorOpen}>
                <DialogContent className="sm:max-w-[550px] border-4 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-0 bg-white text-slate-950 max-h-[82vh] flex flex-col overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-200 bg-emerald-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border-2 border-black bg-emerald-600 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-white">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950">Timeline Doctor Diagnostics</DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-1">
                                    Auditing structural dependency networks and track overlaps.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {(() => {
                        const report = detectTimelineIssues(dbTasks, chronicleMembers);
                        const hasIssues = report.cycles.length > 0 || report.overloads.length > 0 || report.idleGaps.length > 0;
                        
                        return (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 py-4 space-y-4 no-scrollbar">
                                    {!hasIssues ? (
                                        <div className="p-6 border-4 border-emerald-500 bg-emerald-50 text-center flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-300">
                                                <Check className="w-6 h-6 stroke-[3]" />
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800">All Systems Normal</h4>
                                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide leading-snug">
                                                No circular blocking cycles, idle dead zones, or double-booked assignees detected. The Gantt orchestration pipeline is fully compiled and optimal.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Cycles Panel */}
                                            {report.cycles.length > 0 && (
                                                <div className="border-2 border-red-500 bg-red-50/50 p-4 space-y-2">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-700 flex items-center gap-1.5 leading-none">
                                                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                        Dependency Deadlocks (Circular Blocks)
                                                    </h4>
                                                    <p className="text-[8px] font-bold text-red-650 uppercase tracking-wide leading-normal">
                                                        These tasks block each other in infinite loops. Circular bounds block date cascades and must be resolved manually.
                                                    </p>
                                                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1 no-scrollbar pt-1.5 border-t border-red-200">
                                                        {report.cycles.map((c, i) => (
                                                            <div key={i} className="text-[9px] font-bold uppercase tracking-tight text-red-800 bg-white border border-red-300 p-2 leading-snug">
                                                                {c}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Overloads Panel */}
                                            {report.overloads.length > 0 && (
                                                <div className="border-2 border-amber-500 bg-amber-50/50 p-4 space-y-2">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-1.5 leading-none">
                                                        <Info className="w-3.5 h-3.5 text-amber-500" />
                                                        Resource Overloads (Double Booked)
                                                    </h4>
                                                    <p className="text-[8px] font-bold text-amber-655 uppercase tracking-wide leading-normal">
                                                        These assignees have overlapping milestones on the same tracks, causing schedule collisions.
                                                    </p>
                                                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1 no-scrollbar pt-1.5 border-t border-amber-200">
                                                        {report.overloads.map((o, i) => (
                                                            <div key={i} className="text-[9px] font-bold uppercase tracking-tight text-amber-850 bg-white border border-amber-300 p-2 leading-snug">
                                                                {o}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Idle Gaps Panel */}
                                            {report.idleGaps.length > 0 && (
                                                <div className="border-2 border-violet-500 bg-violet-50/50 p-4 space-y-2">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-700 flex items-center gap-1.5 leading-none">
                                                        <Clock className="w-3.5 h-3.5 text-violet-500" />
                                                        Wasted Idle Gaps (Empty Tracks)
                                                    </h4>
                                                    <p className="text-[8px] font-bold text-violet-650 uppercase tracking-wide leading-normal">
                                                        These idle periods have zero task activity, representing underutilized sprint cycles.
                                                    </p>
                                                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1 no-scrollbar pt-1.5 border-t border-violet-200">
                                                        {report.idleGaps.map((g, i) => (
                                                            <div key={i} className="text-[9px] font-bold uppercase tracking-tight text-violet-850 bg-white border border-violet-300 p-2 leading-snug">
                                                                {g}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* AI Monte Carlo Risk Simulation Engine */}
                                    <div className="border-4 border-black bg-white p-4 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-4">
                                        <div className="flex items-center justify-between border-b-2 border-black pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-amber-100 border border-amber-300 rounded shrink-0">
                                                    <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                                                </div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">AI Monte Carlo Risk Forecaster</h4>
                                            </div>
                                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-350 text-[7px] font-black uppercase tracking-widest text-slate-650">300 Runs</span>
                                        </div>

                                        {!simulationResult && !isSimulating && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wide leading-relaxed text-left">
                                                    Cascades 300 randomized schedule scenarios incorporating employee variance, team sick leaves, and integration delay frictions to calculate target project deadline probability.
                                                </p>
                                                <Button 
                                                    disabled={dbTasks.length === 0}
                                                    onClick={handleRunSimulation}
                                                    className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-none border-2 border-black font-black uppercase tracking-widest text-[9px] h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Play className="w-3 h-3 fill-white" />
                                                    Launch Risk Forecast
                                                </Button>
                                            </div>
                                        )}

                                        {isSimulating && (
                                            <div className="py-6 flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 rounded-full border-4 border-black border-t-violet-600 animate-spin" />
                                                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-700 animate-pulse text-center">Orchestrating 300 Simulated Deadlines...</h5>
                                            </div>
                                        )}

                                        {simulationResult && (
                                            <div className="space-y-3 text-left">
                                                {/* Probability Confidence Meter */}
                                                <div className="border-2 border-black p-3 bg-slate-50 flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 border-2 border-black flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white font-black shrink-0",
                                                        simulationResult.probabilityOnTime >= 75 ? "bg-emerald-600" : simulationResult.probabilityOnTime >= 40 ? "bg-amber-500" : "bg-red-600"
                                                    )}>
                                                        <span className="text-sm leading-none">{simulationResult.probabilityOnTime}%</span>
                                                        <span className="text-[6px] font-black uppercase tracking-tighter opacity-80 leading-none">Conf.</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="text-[9px] font-black uppercase text-slate-900 leading-none">Deadline Safety Confidence</h5>
                                                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 leading-normal">
                                                            {simulationResult.probabilityOnTime >= 75 
                                                                ? "EXCELLENT: Low risk of slippage. Buffers are robust." 
                                                                : simulationResult.probabilityOnTime >= 40 
                                                                ? "MODERATE RISK: Key dependency cascades could delay the milestone." 
                                                                : "HIGH RISK: Major bottlenecks. High probability of deadline breach!"
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Detailed Dates */}
                                                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-700 uppercase">
                                                    <div className="border border-slate-200 p-2 bg-white">
                                                        <span className="text-[7px] font-black text-slate-400 block tracking-wider">Median Case (P50)</span>
                                                        <span className="text-slate-900 font-black">{moment(simulationResult.p50).format("MMM DD, YYYY")}</span>
                                                    </div>
                                                    <div className="border border-slate-200 p-2 bg-white">
                                                        <span className="text-[7px] font-black text-slate-400 block tracking-wider">High Risk (P90)</span>
                                                        <span className="text-red-650 font-black">{moment(simulationResult.p90).format("MMM DD, YYYY")}</span>
                                                    </div>
                                                </div>

                                                <Button 
                                                    onClick={handleRunSimulation}
                                                    variant="ghost"
                                                    className="w-full rounded-none border border-slate-350 font-black uppercase tracking-widest text-[8px] h-8 hover:bg-slate-100"
                                                >
                                                    Re-Run Forecast Simulation
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 pt-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2 shrink-0">
                                    {hasIssues && (
                                        <Button 
                                            onClick={() => {
                                                setIsDoctorOpen(false);
                                                setIsChatOpen(true);
                                                toast.success("Ask Chronos AI to 'Heal schedule and fix dependency cycles/double-bookings!'");
                                            }}
                                            className="w-full bg-violet-600 hover:bg-violet-750 text-white rounded-none border-2 border-black font-black uppercase tracking-widest h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4 fill-white" />
                                            Request AI Auto-Healing
                                        </Button>
                                    )}
                                    <Button 
                                        onClick={() => setIsDoctorOpen(false)}
                                        className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-none border-2 border-black font-black uppercase tracking-widest h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                                    >
                                        Dismiss Diagnostics
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Event Action Studio Automations modal */}
            <EventActionStudioModal 
                isOpen={isStudioOpen}
                onClose={() => setIsStudioOpen(false)}
                chronicleId={chronicleId}
            />

            {/* Manage Dynamic Lanes Modal */}
            <Dialog open={isLanesOpen} onOpenChange={setIsLanesOpen}>
                <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-0 bg-white text-slate-950 max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Locked Header */}
                    <DialogHeader className="p-6 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border-2 border-black bg-violet-500 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-white">
                                <Settings2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950">Manage Timeline Lanes</DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-1">
                                    Add, rename, or remove dynamic track lanes from your project canvas.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 py-4 space-y-4 no-scrollbar">
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
                            {departments.map((dept, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 border-2 border-black">
                                    <Input 
                                        value={dept}
                                        onChange={async (e) => {
                                            const updatedDepts = [...departments];
                                            updatedDepts[idx] = e.target.value;
                                            await updateChronicleDepartments({ id: chronicleId, departments: updatedDepts });
                                        }}
                                        className="bg-white border border-black h-9 font-bold text-xs text-slate-950 rounded-none placeholder:text-slate-400"
                                    />
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        disabled={departments.length <= 2}
                                        onClick={async () => {
                                            const updatedDepts = departments.filter((_, i) => i !== idx);
                                            await updateChronicleDepartments({ id: chronicleId, departments: updatedDepts });
                                            
                                            // Shift any tasks on the deleted lane to the first active department
                                            const fallbackDept = updatedDepts[0];
                                            for (const t of dbTasks) {
                                                if (t.department === dept) {
                                                    await updateTask({ id: t._id, department: fallbackDept });
                                                }
                                            }
                                            toast.success(`Removed lane "${dept}" and migrated its tasks.`);
                                        }}
                                        className="h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-slate-200 rounded shrink-0 border border-slate-200"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 border-t-2 border-slate-200 pt-4 mt-2">
                            <Input 
                                placeholder="e.g. Sales, Quality, Security"
                                value={newLaneName}
                                onChange={(e) => setNewLaneName(e.target.value)}
                                className="bg-white border-2 border-black h-11 font-bold text-xs text-slate-950 rounded-none placeholder:text-slate-400"
                            />
                            <Button 
                                disabled={!newLaneName.trim()}
                                onClick={async () => {
                                    const trimName = newLaneName.trim();
                                    if (departments.includes(trimName)) {
                                        toast.error("Lane name already exists.");
                                        return;
                                    }
                                    const updatedDepts = [...departments, trimName];
                                    await updateChronicleDepartments({ id: chronicleId, departments: updatedDepts });
                                    setNewLaneName("");
                                    toast.success(`Created lane "${trimName}"!`);
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-none border-2 border-black font-black text-xs uppercase tracking-widest h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shrink-0"
                            >
                                Add Lane
                            </Button>
                        </div>
                    </div>

                    {/* Locked Footer */}
                    <DialogFooter className="p-6 pt-4 border-t border-slate-200 bg-slate-50 mt-0">
                        <Button 
                            onClick={() => setIsLanesOpen(false)}
                            className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-none border-2 border-black font-black uppercase tracking-widest h-11 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        >
                            Close Controls
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
