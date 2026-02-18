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
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 hidden md:block mix-blend-difference">
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

    // Bubble Movement: Center -> Left (Maps) -> Right (Web) -> Center (Synthesis) -> Result
    const bubbleX = useTransform(smoothProgress,
        [0.2, 0.3, 0.45, 0.55, 0.6],
        [0, -150, 150, 0, 0] // Mobile might need smaller values, handling via responsive classes/layout
    );

    const bubbleY = useTransform(smoothProgress,
        [0.2, 0.25, 0.3, 0.45, 0.55, 0.75, 0.8],
        [0, -100, -100, -50, 0, -200, -300]
    );

    const bubbleScale = useTransform(smoothProgress, [0.2, 0.25], [1, 0.6]); // Shrink more to be a "cursor"
    const bubbleOpacity = useTransform(smoothProgress, [0, 0.75, 0.8], [1, 1, 0]);

    // Status Text Opacity
    const statusOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);

    // Typing effect state
    const [typedText, setTypedText] = useState("");
    const fullText = "Find me a dentist in Shadyside that takes Blue Cross and is open next Tuesday after 5pm.";

    useEffect(() => {
        if (currentAct === "REQUEST") {
            if (typedText.length < fullText.length) {
                const timeout = setTimeout(() => {
                    setTypedText(fullText.slice(0, typedText.length + 1));
                }, 30);
                return () => clearTimeout(timeout);
            }
        }
    }, [typedText, currentAct]);

    // ─── ACT II: SWARM (Active Dispatch) ─────────────────────────────

    // Agents appear when the bubble "visits" them
    // Agent 1 (Maps/Scanning) - Left
    const agent1Opacity = useTransform(smoothProgress, [0.28, 0.32, 0.4], [0, 1, 0]);
    const agent1Scale = useTransform(smoothProgress, [0.28, 0.32, 0.4], [0.5, 1.2, 0]);

    // Agent 2 (Web/Loading) - Right
    const agent2Opacity = useTransform(smoothProgress, [0.43, 0.47, 0.55], [0, 1, 0]);
    const agent2Scale = useTransform(smoothProgress, [0.43, 0.47, 0.55], [0.5, 1.2, 0]);

    // Agent 3 (Data/Synthesis) - Center Re-convergence
    const agent3Opacity = useTransform(smoothProgress, [0.55, 0.6, 0.75], [0, 1, 0]);
    const agent3Scale = useTransform(smoothProgress, [0.55, 0.6], [0.8, 1]);

    // ─── ACT III: SYNTHESIS (Convergence) ─────────────────────────────

    // Lines connecting back to center
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

                {/* Side Scroll Tracker */}
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="h-full w-full max-w-[1400px] mx-auto relative">
                        <ScrollTracker currentAct={currentAct} />
                    </div>
                </div>

                {/* ─── ACT I: ACTIVE DISPATCHER BUBBLE ──────────────────────── */}
                <motion.div
                    style={{ opacity: bubbleOpacity, scale: bubbleScale, x: bubbleX, y: bubbleY }}
                    className="absolute z-50 w-full max-w-xl px-4 flex flex-col items-center origin-center"
                >
                    {/* ACCURATE iMESSAGE BUBBLE */}
                    <div className="relative group w-full max-w-lg">
                        <div
                            className="relative text-white px-5 py-3 rounded-[20px] rounded-br-[4px] leading-snug text-[17px] font-normal antialiased shadow-2xl backdrop-blur-md"
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
                        <svg className="absolute -bottom-[0px] -right-[5px] w-[18px] h-[18px]" viewBox="0 0 20 20">
                            <path d="M0 20 L20 20 C 12 20 5 15 0 0 Z" fill="#007AFF" />
                        </svg>
                    </div>
                </motion.div>


                {/* ─── ACT II: AGENT 1 - MAPS (SCANNING) ────────────────────── */}
                <motion.div
                    style={{ opacity: agent1Opacity, scale: agent1Scale, x: -150, y: -50 }}
                    className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
                >
                    <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center relative">
                        {/* Radar Scan */}
                        <div className="absolute inset-0 rounded-full border border-white/40 border-t-transparent animate-[spin_1.5s_linear_infinite]" />
                        <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse" />

                        {/* Map Icon / Node */}
                        <div className="w-2 h-2 bg-[#22c55e] rounded-full shadow-[0_0_15px_#22c55e]" />
                    </div>
                    <div className="mt-4 text-[10px] font-mono tracking-[0.2em] text-[#22c55e] uppercase">
                        Scanning Area
                    </div>
                    <div className="text-[9px] font-mono text-white/40 mt-1">Shadyside, North...</div>
                </motion.div>


                {/* ─── ACT II: AGENT 2 - WEB (LOADING) ──────────────────────── */}
                <motion.div
                    style={{ opacity: agent2Opacity, scale: agent2Scale, x: 150, y: 0 }}
                    className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
                >
                    <div className="w-32 h-auto bg-[#0a0a0a] border border-white/20 rounded-md p-3 relative shadow-xl">
                        {/* Skeleton UI */}
                        <div className="w-full h-1 bg-white/20 mb-2 rounded-full overflow-hidden">
                            <div className="w-1/2 h-full bg-[#3b82f6] animate-[shimmer_1s_infinite_linear]" />
                        </div>
                        <div className="space-y-1">
                            <div className="w-3/4 h-1 bg-white/10 rounded-full" />
                            <div className="w-1/2 h-1 bg-white/10 rounded-full" />
                        </div>
                    </div>
                    <div className="mt-4 text-[10px] font-mono tracking-[0.2em] text-[#3b82f6] uppercase">
                        Reading Insurance
                    </div>
                    <div className="text-[9px] font-mono text-white/40 mt-1">Blue Cross Policy...</div>
                </motion.div>


                {/* ─── ACT III: DATA SYNTHESIS ──────────────────────────────── */}
                <motion.div
                    style={{ opacity: agent3Opacity, scale: agent3Scale }}
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

                {/* ─── ACT IV: RESULT ───────────────────────────────────────── */}
                <motion.div
                    style={{ opacity: act4Opacity, scale: act4Scale, y: act4Y }}
                    className="absolute z-30 w-full max-w-lg px-6"
                >
                    {/* Result Card - Dark Premium Swiss Style */}
                    <div className="bg-[#050505] rounded-sm border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)] p-10 md:p-12 relative overflow-hidden group">

                        {/* Corner Pluses */}
                        <div className="absolute top-3 left-3 w-2 h-2 border-l border-t border-white/30" />
                        <div className="absolute top-3 right-3 w-2 h-2 border-r border-t border-white/30" />
                        <div className="absolute bottom-3 left-3 w-2 h-2 border-l border-b border-white/30" />
                        <div className="absolute bottom-3 right-3 w-2 h-2 border-r border-b border-white/30" />

                        {/* Top Label */}
                        <div className="flex justify-between items-start mb-10 relative z-10 border-b border-white/5 pb-6">
                            <div className="uppercase tracking-[0.2em] text-[9px] font-mono text-white/40">
                                CONFIRMED APPOINTMENT
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]" />
                                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Live</span>
                            </div>
                        </div>

                        {/* Main Content */}
                        <h1 className="text-4xl md:text-5xl font-serif text-white mb-3 relative z-10 leading-[0.9]">
                            Dr. Elena Rosas
                        </h1>
                        <p className="text-lg text-white/40 mb-10 font-sans font-light relative z-10">
                            Shadyside Dental Center
                        </p>

                        <div className="grid grid-cols-2 gap-y-8 gap-x-8 mb-12 relative z-10">
                            <div className="border-l border-white/10 pl-6">
                                <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2 font-mono">Date & Time</div>
                                <div className="text-white text-xl font-serif">Tue, 5:30 PM</div>
                            </div>
                            <div className="border-l border-white/10 pl-6">
                                <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2 font-mono">Insurance</div>
                                <div className="text-white text-xl font-serif">Blue Cross</div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="flex flex-col gap-4 relative z-10">
                            <Link
                                href="/sign-up"
                                className="w-full bg-white hover:bg-neutral-200 text-black text-center py-4 text-[10px] font-bold tracking-[0.25em] transition-all uppercase rounded-sm flex items-center justify-center gap-2 group-hover:tracking-[0.3em]"
                            >
                                View Details <span className="text-lg leading-none">→</span>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
