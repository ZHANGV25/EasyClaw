"use client";

import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── TYPES ──────────────────────────────────────────────────────────

type Act = "REQUEST" | "SWARM" | "SYNTHESIS" | "RESULT";

// ─── COMPONENTS ─────────────────────────────────────────────────────

const ScrollTracker = ({ currentAct }: { currentAct: Act }) => {
    const steps = [
        { id: "REQUEST", label: "REQUEST", number: "01" },
        { id: "SWARM", label: "PROCESSING", number: "02" },
        { id: "SYNTHESIS", label: "SYNTHESIS", number: "03" },
        { id: "RESULT", label: "OUTPUT", number: "04" },
    ];

    return (
        <div className="relative">
            <div className="flex flex-col gap-12 relative">
                {/* Vertical Line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-[1px] bg-white/20" />

                {steps.map((step) => {
                    const isActive = currentAct === step.id;
                    return (
                        <div key={step.id} className="relative pl-8 group">
                            {/* Dot indicator */}
                            <motion.div
                                animate={{
                                    backgroundColor: isActive ? "#fff" : "#000",
                                    borderColor: isActive ? "#fff" : "rgba(255,255,255,0.3)",
                                    scale: isActive ? 1 : 0.8,
                                }}
                                className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border border-white/30 transition-colors duration-500"
                            />

                            {/* Text Content */}
                            <div className={cn(
                                "transition-opacity duration-500",
                                isActive ? "opacity-100" : "opacity-30"
                            )}>
                                <span className="block text-[10px] font-mono mb-1 text-white/70">{step.number}</span>
                                <span className="block text-xs font-bold tracking-[0.2em] text-white">{step.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function HeroScrollDemo() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const [currentAct, setCurrentAct] = useState<Act>("REQUEST");

    // Update current act based on scroll
    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (v: number) => {
            if (v < 0.25) setCurrentAct("REQUEST");
            else if (v < 0.5) setCurrentAct("SWARM");
            else if (v < 0.75) setCurrentAct("SYNTHESIS");
            else setCurrentAct("RESULT");
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    // Smooth scroll progress for animations
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // ─── ACT I: REQUEST (Typing & Bubble) ─────────────────────────────

    // Active Dispatch Narrative: The Bubble IS the agent.

    // Bubble Movement: Center -> Up (Tree Root) -> Center (Synthesis) -> Result
    const bubbleX = useTransform(smoothProgress,
        [0.2, 0.3, 0.45, 0.55, 0.6, 0.75, 0.8],
        [0, 0, 0, 0, 0, 250, 250] // Move right only at the end
    );

    const bubbleY = useTransform(smoothProgress,
        [0.2, 0.25, 0.3, 0.5, 0.6, 0.75, 0.8],
        [0, -150, -300, -300, 0, -100, -100] // Move to -100 for final state to make room for response
    );

    const bubbleScale = useTransform(smoothProgress, [0, 1], [1, 1]); // Keep scale 1.0 to match result
    // val: 1 -> 1. Keep visible throughout.
    const bubbleOpacity = useTransform(smoothProgress, [0, 1], [1, 1]); 

    // Status Text Opacity
    const statusOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);

    // Typing effect state
    const [typedText, setTypedText] = useState("");
    const fullText = "Find me a dentist in Shadyside that takes Blue Cross and is open next Tuesday after 5pm.";

    useEffect(() => {
        // Start typing immediately and continue regardless of scroll
        if (typedText.length < fullText.length) {
            const timeout = setTimeout(() => {
                setTypedText(fullText.slice(0, typedText.length + 1));
            }, 30);
            return () => clearTimeout(timeout);
        }
    }, [typedText]);

    // ─── ACT II: SWARM (Active Dispatch - Tree) ─────────────────────────────

    // Tree Line Growth
    const treeLineHeight = useTransform(smoothProgress, [0.25, 0.35], [0, 200]);
    const treeBranchWidth = useTransform(smoothProgress, [0.35, 0.4], [0, 300]); // Horizontal spread
    const treeBranchHeight = useTransform(smoothProgress, [0.4, 0.45], [0, 100]); // Vertical drop to nodes

    // Agent Nodes Opacity/Scale - Staggered Appearance
    const nodesOpacity = useTransform(smoothProgress, [0.4, 0.45, 0.55, 0.6], [0, 1, 1, 0]); // Fade out as synthesis starts
    const nodesScale = useTransform(smoothProgress, [0.4, 0.45], [0.8, 1]);
    const centerNodeScale = useTransform(smoothProgress, [0.4, 0.45], [0.8, 1.1]); // Slightly larger for hierarchy

    // ─── ACT III: SYNTHESIS (Convergence) ─────────────────────────────

    // Synthesis appears as tree fades
    const synthesisOpacity = useTransform(smoothProgress, [0.55, 0.6, 0.75], [0, 1, 0]);
    const synthesisScale = useTransform(smoothProgress, [0.55, 0.6], [0.8, 1]);

    // Nodes Travel to Center (Convergence) - Reverse the expansion
    const nodesX = useTransform(smoothProgress, [0.5, 0.6], [0, 0]); // Handled via layout, but we can animate left/right nodes in
    // Actually, let's just reverse the x/y of the nodes to center
    const nodeLeftX = useTransform(smoothProgress, [0.5, 0.6], ["0%", "100%"]); // Move right to center
    const nodeRightX = useTransform(smoothProgress, [0.5, 0.6], ["0%", "-100%"]); // Move left to center
    const nodesY = useTransform(smoothProgress, [0.5, 0.6], [0, -100]); // Move up towards synthesis point

    // Lines connecting back to center (Result generation)

    // Lines connecting back to center (Result generation)
    // We reuse the tree structure implicitly collapsing or guiding the eye down
    const synthesisLines = useTransform(smoothProgress, [0.6, 0.65, 0.7], [0, 1, 0]);

    // ─── ACT IV: RESULT (Dark Mode Reveal) ───────────────────────────

    const act4Opacity = useTransform(smoothProgress, [0.75, 0.8], [0, 1]);
    const act4Scale = useTransform(smoothProgress, [0.75, 0.8], [0.95, 1]);
    const act4Y = useTransform(smoothProgress, [0.75, 0.8], [20, 0]);

    return (
        <div ref={containerRef} className="h-[500vh] relative bg-black text-white selection:bg-white/20">

            {/* ─── STICKY VIEWPORT ────────────────────────────────────────── */}
            <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center font-sans">

                {/* Background Layer: Deep Black with Grain */}
                <div className="absolute inset-0 bg-[#000000] z-0">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                    />
                </div>

                {/* Side Scroll Tracker - Fixed to Viewport Left */}
                <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden md:block mix-blend-difference pointer-events-none">
                     <ScrollTracker currentAct={currentAct} />
                </div>

                {/* ─── ACT I: ACTIVE DISPATCHER BUBBLE ──────────────────────── */}
                <motion.div
                    style={{ opacity: bubbleOpacity, scale: bubbleScale, x: bubbleX, y: bubbleY }}
                    className="absolute z-50 inset-x-0 mx-auto max-w-4xl px-4 flex flex-col items-center pointer-events-none"
                >
                    {/* ACCURATE iMESSAGE BUBBLE */}
                    <div className="relative group w-[300px] md:w-[400px]"> 
                        <div
                            className="relative text-white px-5 py-3.5 rounded-[22px] rounded-br-[4px] leading-snug text-[17px] font-normal antialiased shadow-2xl backdrop-blur-md"
                            style={{
                                background: 'linear-gradient(180deg, #38acff 0%, #007AFF 100%)', // Brighter top for realism
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                letterSpacing: '-0.012em',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0px rgba(255, 255, 255, 0.15)'
                            }}
                        >
                            {typedText}
                        </div>
                        {/* Tail - SVG */}
                        <svg className="absolute bottom-[0px] -right-[5px] w-[20px] h-[20px]" viewBox="0 0 20 20" style={{ transform: 'rotateY(0deg)' }}>
                             <path d="M0 20 L20 20 C 12 20 5 15 0 0 Z" fill="#007AFF" />
                        </svg>
                    </div>
                </motion.div>


                {/* ─── ACT II: TREE STRUCTURE & AGENTS ────────────────────── */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <svg className="w-full h-full absolute inset-0 overflow-visible">
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </linearGradient>
                        </defs>
                        
                        {/* Left Branch */}
                        <motion.path 
                            d="M 50% 150 Q 50% 250 30% 350" // End higher at 350 (approx 45%)
                            fill="none"
                            stroke="rgba(255,255,255,0.2)" 
                            strokeWidth="2"
                            style={{ pathLength: treeLineHeight }}
                        />
                        
                         {/* Right Branch */}
                         <motion.path 
                            d="M 50% 150 Q 50% 250 70% 350" // End higher at 350
                            fill="none"
                            stroke="rgba(255,255,255,0.2)" 
                            strokeWidth="2"
                            style={{ pathLength: treeLineHeight }}
                        />

                        {/* Middle Branch */}
                        <motion.path 
                            d="M 50% 150 L 50% 350" // End higher at 350
                            fill="none"
                            stroke="rgba(255,255,255,0.2)" 
                            strokeWidth="2"
                            style={{ pathLength: treeLineHeight }}
                        />
                    </svg>

                    {/* Agent Nodes Container */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* Node 1: Scanning Web (Left) */}
                        <motion.div 
                            className="absolute left-[30%] top-[45%] -translate-x-1/2 flex flex-col items-center gap-2"
                            style={{ opacity: nodesOpacity, scale: nodesScale, x: nodeLeftX, y: nodesY }}
                        >
                             {/* Agent Header */}
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Agent 01</span>
                            </div>

                            <div className="w-40 h-24 bg-black/80 border border-white/10 rounded-lg overflow-hidden relative backdrop-blur-sm shadow-2xl">
                                <div className="absolute inset-x-0 top-0 h-6 bg-white/5 border-b border-white/5 flex items-center px-2 z-10 gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                </div>
                                {/* Added padding-top to prevent clipping into the header bar */}
                                <div className="p-3 pt-10 space-y-2 opacity-80">
                                    {/* Animated Scrolling Lines */}
                                    <motion.div 
                                        animate={{ y: [-10, -50] }} 
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="space-y-2"
                                    >
                                        <div className="h-2 w-[80%] bg-blue-500/20 rounded-sm" />
                                        <div className="h-2 w-[60%] bg-white/10 rounded-sm" />
                                        <div className="h-2 w-[90%] bg-white/10 rounded-sm" />
                                        <div className="h-2 w-[40%] bg-blue-500/20 rounded-sm" />
                                        <div className="h-2 w-[70%] bg-white/10 rounded-sm" />
                                        <div className="h-2 w-[50%] bg-white/10 rounded-sm" />
                                    </motion.div>
                                    {/* Vignette Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />
                                </div>
                            </div>
                            <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded">Scanning Web</span>
                        </motion.div>

                        {/* Node 2: Reviews (Center) */}
                        <motion.div 
                            className="absolute left-[50%] top-[45%] -translate-x-1/2 flex flex-col items-center gap-2"
                            style={{ opacity: nodesOpacity, scale: centerNodeScale, y: nodesY }}
                        >
                             {/* Agent Header */}
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Agent 02</span>
                            </div>

                            <div className="w-32 h-24 bg-black/80 border border-white/10 rounded-lg flex flex-col items-center justify-center relative backdrop-blur-sm shadow-2xl">
                                <div className="text-3xl font-bold text-white mb-1">4.9</div>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <motion.svg 
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            className="w-3 h-3 text-yellow-500 fill-current" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </motion.svg>
                                    ))}
                                </div>
                                <div className="text-[9px] text-white/40 mt-2 font-mono">128 REVIEWS</div>
                            </div>
                            <span className="text-[10px] font-mono tracking-widest text-yellow-500 uppercase bg-yellow-500/10 px-2 py-1 rounded">Analysis</span>
                        </motion.div>

                        {/* Node 3: Schedule (Right) */}
                        <motion.div 
                            className="absolute left-[70%] top-[45%] -translate-x-1/2 flex flex-col items-center gap-2"
                            style={{ opacity: nodesOpacity, scale: nodesScale, x: nodeRightX, y: nodesY }}
                        >
                             {/* Agent Header */}
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Agent 03</span>
                            </div>

                             <div className="w-32 h-24 bg-black/80 border border-white/10 rounded-lg p-3 relative backdrop-blur-sm shadow-2xl">
                                <div className="grid grid-cols-4 gap-1 h-full">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                                            animate={{ 
                                                backgroundColor: [
                                                    "rgba(255,255,255,0.1)", 
                                                    i === 5 || i === 9 ? "#22c55e" : "rgba(255,255,255,0.1)"
                                                ] 
                                            }}
                                            transition={{ delay: 1 + (i * 0.05), duration: 0.5 }}
                                            className="rounded-[1px]"
                                        />
                                    ))}
                                </div>
                            </div>
                            <span className="text-[10px] font-mono tracking-widest text-green-400 uppercase bg-green-500/10 px-2 py-1 rounded">Schedule</span>
                        </motion.div>
                    </div>

                </div>


                {/* ─── ACT III: DATA SYNTHESIS ──────────────────────────────── */}
                <motion.div
                    style={{ opacity: synthesisOpacity, scale: synthesisScale }}
                    className="absolute z-10 flex flex-col items-center justify-center"
                >
                    {/* Connecting Lines */}
                    <svg className="absolute w-[600px] h-[600px] pointer-events-none overflow-visible">
                        <motion.line
                            x1="50%" y1="50%" x2="25%" y2="40%"
                            stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                            style={{ opacity: synthesisLines }}
                        />
                        <motion.line
                            x1="50%" y1="50%" x2="75%" y2="50%"
                            stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                            style={{ opacity: synthesisLines }}
                        />
                    </svg>

                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-32">
                        <div className="h-full bg-white w-full animate-[loading_2s_ease-in-out_infinite]" />
                    </div>
                    <div className="mt-2 text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase animate-pulse">
                        Synthesizing
                    </div>
                </motion.div>

                {/* ─── ACT IV: RESULT (Done Bubble) ─────────────────────────── */}
                <motion.div
                    style={{ opacity: act4Opacity, scale: act4Scale, y: act4Y }}
                    className="absolute inset-0 mx-auto max-w-4xl px-4 flex flex-col items-start justify-center pointer-events-none z-40"
                >
                     {/* Gray Response Bubble - MATCHING BLUE BUBBLE EXACTLY */}
                     <div className="relative group w-[300px] md:w-[400px] mt-[20px]">
                        <div
                            className="relative text-white px-5 py-3.5 rounded-[22px] rounded-bl-[4px] leading-snug text-[17px] font-normal antialiased shadow-2xl backdrop-blur-md"
                            style={{
                                background: '#3a3a3c', // iOS Gray
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                letterSpacing: '-0.012em',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0px rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            Done. I scheduled you for <span className="font-semibold text-white">Dr. Elena Rosas</span> in Shadyside for <span className="text-green-300">Tuesday at 5:30 PM</span>.
                        </div>
                        {/* Tail - SVG */}
                        <svg className="absolute bottom-[0px] -left-[5px] w-[20px] h-[20px]" viewBox="0 0 20 20" style={{ transform: 'rotateY(180deg)' }}>
                            <path d="M0 20 L20 20 C 12 20 5 15 0 0 Z" fill="#3a3a3c" />
                        </svg>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
