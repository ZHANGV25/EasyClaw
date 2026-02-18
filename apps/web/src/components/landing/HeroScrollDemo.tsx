"use client";

import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useSpring, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── TYPES ──────────────────────────────────────────────────────────

type Act = "INTRO" | "REQUEST" | "SWARM" | "RESULT";

// ─── COMPONENTS ─────────────────────────────────────────────────────

const ScrollTracker = ({ currentAct }: { currentAct: Act }) => {
    // Match the "Lightweight" style: numeric prefix, small caps, left aligned
    const steps = [
        { id: "INTRO", label: "PHILOSOPHY", number: "01" },
        { id: "REQUEST", label: "INTENT", number: "02" },
        { id: "SWARM", label: "EXECUTION", number: "03" },
        { id: "RESULT", label: "OUTCOME", number: "04" },
    ];

    return (
        <div className="relative font-sans pl-6">
             <div className="flex flex-col gap-8 relative">
                {steps.map((step) => {
                    const isActive = currentAct === step.id;
                    return (
                        <div key={step.id} className="relative group flex items-start -ml-[5px]"> 
                             {/* Active Indicator Line (Small +) */}
                            <motion.div
                                animate={{ opacity: isActive ? 1 : 0 }}
                                className="absolute -left-4 top-1.5 w-2 h-2 text-white/50 text-[10px] leading-none"
                            >
                                +
                            </motion.div>

                            <div className={cn(
                                "transition-all duration-700 ease-out flex flex-col",
                                isActive ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-2"
                            )}>
                                <span className="text-[9px] font-mono mb-1 text-white/50 tracking-widest">{step.number}</span>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase">{step.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ExplanationBox = ({ title, description, visible }: { title: string, description: string, visible: boolean }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="fixed top-1/2 -translate-y-1/2 right-4 md:right-16 w-[280px] md:w-[320px] bg-[#0A0A0A]/90 border-l border-white/20 pl-6 py-4 z-[60] backdrop-blur-xl"
        >
            <h3 className="text-white font-serif text-2xl mb-2 tracking-wide">{title}</h3>
            <p className="text-white/50 text-sm leading-relaxed font-light">{description}</p>
        </motion.div>
    );
}

// Validates that a number is within a range for counters
function useCounter(value: number, duration: number = 2000, trigger: boolean) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!trigger) return;
        
        let start = 0;
        const end = value;
        const totalDuration = duration;
        
        const run = () => {
            if (start < end) {
                // Ease out
                const remaining = end - start;
                const nextStep = Math.ceil(remaining / 15) || 1;
                start += nextStep;
                if (start > end) start = end;
                setCount(start);
                setTimeout(run, 20);
            } else {
                setCount(end);
            }
        };
        
        run();
    }, [value, duration, trigger]);

    return count;
}


export default function HeroScrollDemo() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const [currentAct, setCurrentAct] = useState<Act>("INTRO");

    // Update current act based on scroll - Updated Ranges for EXTENDED SWARM PAUSE
    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (v: number) => {
            if (v < 0.15) setCurrentAct("INTRO");
            else if (v < 0.35) setCurrentAct("REQUEST"); // Shortened slightly to start Swarm earlier
            else if (v < 0.80) setCurrentAct("SWARM"); // Extended Swarm range up to 0.80
            else setCurrentAct("RESULT");
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    // Smooth scroll progress
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // ─── ACT 0: INTRO (Hero Title) ───────────────────────────────────
    
    // Fades out as we scroll down
    const introOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
    const introScale = useTransform(smoothProgress, [0, 0.15], [1, 0.95]);
    const introY = useTransform(smoothProgress, [0, 0.15], [0, -50]);


    // ─── ACT I: REQUEST (Typing & Bubble) ─────────────────────────────

    // Request Pause (Typing/Intent): ~0.20 - 0.35
    
    const bubbleOpacity = useTransform(smoothProgress, [0.15, 0.20], [0, 1]); 
    const bubbleScale = useTransform(smoothProgress, [0.15, 0.20], [0.8, 1]);

    // Movement: Enter -> PAUSE -> Exit to Tree
    // Bubble moves UP to join agents at 0.45.
    const bubbleX = useTransform(smoothProgress,
        [0.2, 0.35, 0.45, 0.80, 0.90], 
        [0, 0, 0, 0, 250] 
    );

    const bubbleY = useTransform(smoothProgress,
        [0.2, 0.35, 0.45, 0.80, 0.90],
        [0, 0, -300, -300, -120] // Fixed: Hold at -300 from 0.45 to 0.80. Then drop to -120 to look like history.
    );


    // Typing effect
    const [typedText, setTypedText] = useState("");
    const fullText = "Find me a dentist in Shadyside that takes Blue Cross and is open next Tuesday after 5pm.";

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (v) => {
             if (v > 0.15 && typedText.length < fullText.length) {
                if (typedText === "") setTypedText(fullText); 
             }
        });
        if (typedText === "") setTypedText(fullText);
        return () => unsubscribe();
    }, [scrollYProgress, typedText]);


    // ─── ACT II: SWARM (Active Dispatch - Tree) ─────────────────────────────
    
    const isSwarmActive = currentAct === "SWARM"; 

    // Tree Line Growth
    const treeLineHeight = useTransform(smoothProgress, [0.35, 0.45], [0, 200]);
    
    // Agent Nodes - EXTENDED PAUSE: Hold between 0.45 and 0.80
    
    // Fade in
    const nodesOpacity = useTransform(smoothProgress, [0.40, 0.45, 0.80, 0.85], [0, 1, 1, 0]);
    const nodesScale = useTransform(smoothProgress, [0.40, 0.45], [0.8, 1]);
    const centerNodeScale = useTransform(smoothProgress, [0.40, 0.45], [0.8, 1.1]);

    // Counter Hooks
    const sourcesCount = useCounter(142, 1500, isSwarmActive);
    const reviewCount = useCounter(128, 1500, isSwarmActive);
    
    // Convergence (collapse to center before result) - Happens 0.80-0.85
    const nodeLeftX = useTransform(smoothProgress, [0.80, 0.85], ["0%", "100%"]);
    const nodeRightX = useTransform(smoothProgress, [0.80, 0.85], ["0%", "-100%"]);
    const nodesY = useTransform(smoothProgress, [0.80, 0.85], [0, -100]); 

    // ─── ACT III: RESULT ─────────────────────────────────────────────

    // Result Pause: 0.90+ 
    const act4Opacity = useTransform(smoothProgress, [0.85, 0.90], [0, 1]);
    const act4Scale = useTransform(smoothProgress, [0.85, 0.90], [0.95, 1]);
    const act4Y = useTransform(smoothProgress, [0.85, 0.90], [20, 0]);

    // ─── EXPLANATION STATE ──────────────────────────────────────────

    const [explanation, setExplanation] = useState<{title: string, desc: string, show: boolean}>({ title: "", desc: "", show: false });

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (v) => {
            // Updated timings
            if (v > 0.20 && v < 0.35) {
                setExplanation({
                    title: "Just ask.",
                    desc: "Describe what you need in plain English. No complex forms or rigid filters required.",
                    show: true
                });
            } else if (v > 0.45 && v < 0.80) { // EXTENDED RANGE (35% of scroll)
                setExplanation({
                    title: "We do the work.",
                    desc: "Our agents instantly search, analyze, and cross-reference data from multiple sources.",
                    show: true
                });
            } else if (v > 0.90) {
                setExplanation({
                    title: "Consider it done.",
                    desc: "We handle the booking and execution, giving you back the one thing you can't buy: time.",
                    show: true
                });
            } else {
                setExplanation(prev => ({ ...prev, show: false }));
            }
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    return (
        <div ref={containerRef} className="h-[550vh] relative bg-[#050505] text-white selection:bg-white/20 font-sans">

            {/* ─── STICKY VIEWPORT ────────────────────────────────────────── */}
            <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">

                {/* Explanation Box - Centered Right */}
                <ExplanationBox 
                    title={explanation.title} 
                    description={explanation.desc} 
                    visible={explanation.show} 
                />

                {/* Background Layer: Deep Black with Grain */}
                <div className="absolute inset-0 bg-[#050505] z-0">
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                    />
                </div>
                
                {/* ─── ACT 0: INTRO HERO ────────────────────────────────────── */}
                 <motion.div 
                    style={{ opacity: introOpacity, scale: introScale, y: introY }}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
                >
                    <div className="text-[10px] font-mono tracking-[0.3em] text-white/40 mb-6 uppercase">
                        Welcome
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-center tracking-tighter leading-[0.9] text-white mix-blend-difference">
                        THE EVOLUTION<br/>
                        <span className="text-white/50">OF ASSISTANCE</span>
                    </h1>
                     <div className="mt-8 px-6 py-2 border border-white/10 rounded-full text-[10px] tracking-widest uppercase text-white/60">
                        Scroll to Begin
                    </div>
                </motion.div>


                {/* Side Scroll Tracker - Left Aligned "Lightweight" Style */}
                <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 hidden md:block mix-blend-difference pointer-events-none">
                     <ScrollTracker currentAct={currentAct} />
                </div>

                {/* ─── ACT I: REQUEST BUBBLE ──────────────────────── */}
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


                {/* ─── ACT II: AGENTS & TREE ────────────────────── */}
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
                            d="M 50% 150 Q 50% 250 30% 350" 
                            fill="none"
                            stroke="rgba(255,255,255,0.15)" 
                            strokeWidth="1.5"
                            style={{ pathLength: treeLineHeight }}
                        />
                         {/* Right Branch */}
                         <motion.path 
                            d="M 50% 150 Q 50% 250 70% 350" 
                            fill="none"
                            stroke="rgba(255,255,255,0.15)" 
                            strokeWidth="1.5"
                            style={{ pathLength: treeLineHeight }}
                        />
                        {/* Middle Branch */}
                        <motion.path 
                            d="M 50% 150 L 50% 350" 
                            fill="none"
                            stroke="rgba(255,255,255,0.15)" 
                            strokeWidth="1.5"
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
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1 z-20">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Deep Search</span>
                            </div>

                            <div className="w-40 h-24 bg-[#0A0A0A] border border-white/10 rounded-sm overflow-hidden relative shadow-2xl">
                                <div className="absolute inset-x-0 top-0 h-6 bg-white/5 border-b border-white/5 flex items-center px-2 z-10 gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                </div>
                                <div className="p-3 pt-8 space-y-2 opacity-60">
                                    {/* Abstract Data Chips Scrolling */}
                                    <motion.div 
                                        animate={{ y: [-10, -100] }} 
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="flex flex-col gap-2"
                                    >
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <div className="h-1 w-1 rounded-full bg-blue-500/50" />
                                                <div className="h-1 bg-white/10 rounded-sm" style={{ width: Math.random() * 80 + 20 + '%' }} />
                                            </div>
                                        ))}
                                    </motion.div>
                                    
                                    {/* Stats Overlay */}
                                    <div className="absolute bottom-1 right-2 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded-sm text-[9px] font-mono text-blue-300 border border-blue-500/10">
                                        Found: {sourcesCount}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Node 2: Reviews (Center) */}
                        <motion.div 
                            className="absolute left-[50%] top-[45%] -translate-x-1/2 flex flex-col items-center gap-2"
                            style={{ opacity: nodesOpacity, scale: centerNodeScale, y: nodesY }}
                        >
                             {/* Agent Header */}
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1 z-20">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Analysis</span>
                            </div>

                            <div className="w-32 h-24 bg-[#0A0A0A] border border-white/10 rounded-sm flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                                
                                <div className="text-3xl font-serif text-white mb-1 z-10 flex items-end">
                                    4.9
                                </div>
                                <div className="flex gap-1 z-10">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <motion.svg 
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            className="w-2 h-2 text-yellow-500 fill-current" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </motion.svg>
                                    ))}
                                </div>
                                <div className="text-[8px] text-white/30 mt-2 font-mono tracking-wider">{reviewCount} REVIEWS</div>
                            </div>
                        </motion.div>

                        {/* Node 3: Schedule (Right) */}
                        <motion.div 
                            className="absolute left-[70%] top-[45%] -translate-x-1/2 flex flex-col items-center gap-2"
                            style={{ opacity: nodesOpacity, scale: nodesScale, x: nodeRightX, y: nodesY }}
                        >
                             {/* Agent Header */}
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1 z-20">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Negotiation</span>
                            </div>

                             <div className="w-32 h-24 bg-[#0A0A0A] border border-white/10 rounded-sm p-3 relative shadow-2xl">
                                <div className="grid grid-cols-4 gap-1 h-full">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                                            animate={{ 
                                                backgroundColor: [
                                                    "rgba(255,255,255,0.05)",
                                                    "rgba(255,255,255,0.1)",
                                                    i === 5 || i === 9 ? "#22c55e" : "rgba(255,255,255,0.05)"
                                                ] 
                                            }}
                                            transition={{ 
                                                duration: 2,
                                                repeat: Infinity,
                                                delay: i * 0.1,
                                                times: [0, 0.5, 1] 
                                            }}
                                            className="rounded-[1px]"
                                        />
                                    ))}
                                </div>
                                <motion.div 
                                    animate={{ top: ["0%", "100%"] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-0 right-0 h-[1px] bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ─── ACT III: RESULT ────────────────────────────────────── */}
                 <motion.div
                    style={{ opacity: act4Opacity, scale: act4Scale, y: act4Y }}
                    className="absolute inset-0 mx-auto max-w-4xl px-4 flex flex-col items-start justify-center pointer-events-none z-40"
                >
                     {/* Gray Response Bubble */}
                     <div className="relative group w-[300px] md:w-[400px] mt-[20px]">
                        <div
                            className="relative text-white px-5 py-3.5 rounded-[22px] rounded-bl-[4px] leading-snug text-[17px] font-normal antialiased shadow-2xl backdrop-blur-md"
                            style={{
                                background: 'linear-gradient(180deg, #5c5c5e 0%, #3a3a3c 100%)', // iOS Gray Gradient
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
