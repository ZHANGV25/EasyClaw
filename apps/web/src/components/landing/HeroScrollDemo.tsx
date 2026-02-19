"use client";

import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useSpring, useInView, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

// ─── TYPES ──────────────────────────────────────────────────────────

type Act = "INTRO" | "REQUEST" | "SWARM" | "RESULT";

// ─── COMPONENTS ─────────────────────────────────────────────────────

// Updated ScrollTracker to use isLightMode for smooth color transition
const ScrollTracker = ({ currentAct, isLightMode }: { currentAct: Act, isLightMode: boolean }) => {
    // Match the "Lightweight" style: numeric prefix, small caps, left aligned
    const steps = [
        { id: "INTRO", label: "ASK", number: "01" },
        { id: "REQUEST", label: "DEPLOY", number: "02" },
        { id: "SWARM", label: "DELIVER", number: "03" },
        { id: "RESULT", label: "DONE", number: "04" },
    ];

    const textColor = isLightMode ? "#000000" : "#ffffff";

    return (
        <div className="relative font-sans pl-6">
             <div className="flex flex-col gap-8 relative">
                {steps.map((step) => {
                    const isActive = currentAct === step.id;
                    return (
                        <div key={step.id} className="relative group flex items-start -ml-[5px]"> 
                             {/* Active Indicator Line (Small +) */}
                            <motion.div
                                animate={{ opacity: isActive ? 1 : 0, color: textColor }}
                                transition={{ duration: 0.5 }}
                                className="absolute -left-4 top-1.5 w-2 h-2 text-[10px] leading-none opacity-50"
                            >
                                +
                            </motion.div>

                            <div className={cn(
                                "transition-all duration-700 ease-out flex flex-col",
                                isActive ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-2"
                            )}>
                                <motion.span 
                                    animate={{ color: textColor }} 
                                    transition={{ duration: 0.5 }}
                                    className="text-[9px] font-mono mb-1 opacity-50 tracking-widest"
                                >
                                    {step.number}
                                </motion.span>
                                <motion.span 
                                    animate={{ color: textColor }} 
                                    transition={{ duration: 0.5 }}
                                    className="text-[10px] font-bold tracking-[0.2em] uppercase"
                                >
                                    {step.label}
                                </motion.span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ExplanationBox = ({ title, description, visible, isLightMode }: { title: string, description: string, visible: boolean, isLightMode: boolean }) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} // Slide in from Left
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute left-8 top-1/2 -translate-y-1/2 max-w-xs z-40 pointer-events-none flex flex-col items-start text-left`}
                >
                    <div className={`h-[1px] w-12 mb-4 ${isLightMode ? 'bg-black/20' : 'bg-white/20'}`} />
                    <h3 className={`text-sm font-mono uppercase tracking-widest mb-2 ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                        {title}
                    </h3>
                    <p className={`text-xl md:text-2xl font-sans font-medium leading-relaxed ${isLightMode ? 'text-black' : 'text-white'}`}>
                        {description}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
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

const useTypewriter = (text: string, speed: number = 30, startDelay: number = 0, trigger: boolean) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!trigger) {
            setDisplayedText("");
            setIsComplete(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            let index = 0;
            const intervalId = setInterval(() => {
                setDisplayedText(text.slice(0, index + 1));
                index++;
                if (index === text.length) {
                    clearInterval(intervalId);
                    setIsComplete(true);
                }
            }, speed);
            return () => clearInterval(intervalId);
        }, startDelay);

        return () => clearTimeout(timeoutId);
    }, [text, speed, startDelay, trigger]);

    return { text: displayedText, isComplete };
};


export default function HeroScrollDemo() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const [currentAct, setCurrentAct] = useState<Act>("INTRO");
    const [isLightMode, setIsLightMode] = useState(false);

    // Update current act based on scroll - Updated Ranges for EXTENDED SWARM PAUSE
    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (v: number) => {
            if (v < 0.15) setCurrentAct("INTRO");
            else if (v < 0.35) setCurrentAct("REQUEST"); // Shortened slightly to start Swarm earlier
            else if (v < 0.80) setCurrentAct("SWARM"); // Extended Swarm range up to 0.80
            else setCurrentAct("RESULT");

            // Light Mode Trigger - Triggered at 0.93 for smoother, earlier transition
            if (v > 0.93) {
                setIsLightMode(true);
            } else {
                setIsLightMode(false);
            }
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    // Smooth scroll progress
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // ─── THEME CONFIGURATION ──────────────────────────────────────────
    
    // Instead of useTransform, use derived values for animate props
    const textColor = isLightMode ? "#000000" : "#ffffff";
    // const backgroundColor = isLightMode ? "#ffffff" : "#050505"; // Handled by gradient layers now
    const headerBg = isLightMode ? "rgba(255, 255, 255, 0.8)" : "rgba(5, 5, 5, 0.8)";
    const headerBorder = isLightMode ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";

    // Noise Opacity: Fade out noise when becoming light
    const noiseOpacity = isLightMode ? 0 : 0.03;


    // ─── BUBBLE THEME TRANSITIONS ─────────────────────────────────────
    
    // Colors for bubbles
    const grayBubbleBg = isLightMode 
        ? "linear-gradient(180deg, #E9E9EB 0%, #E9E9EB 100%)" // Exact iMessage Light Gray
        : "linear-gradient(180deg, #5c5c5e 0%, #3a3a3c 100%)";

    const grayBubbleTailColor = isLightMode ? "#E9E9EB" : "#3a3a3c";
    const grayBubbleTextColor = isLightMode ? "#000000" : "#ffffff";
    const greenTextColor = isLightMode ? "#15803d" : "#86efac"; // green-700 : green-300
    
    // Shadow Opacity
    const shadowOpacity = isLightMode ? 0.08 : 0.15;

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

    // Movement: Enter -> PAUSE -> Exit to Tree
    // Bubble stays centered, but moves up slightly to act as the "Hub"
    const bubbleX = useTransform(smoothProgress,
        [0.2, 0.35, 0.45, 0.80, 0.90], 
        [50, 50, 50, 50, 50] // Offset Right (User)
    );

    const bubbleY = useTransform(smoothProgress,
        [0.2, 0.35, 0.45, 0.80, 0.90],
        [0, 0, 0, 0, -120] // Keep at start, then move up at the end
    );


    // Typing effect
    const fullText = "Find me a dentist in Shadyside that takes Blue Cross and is open next Tuesday after 5pm.";
    const typedText = useTypewriter(fullText, 15, 0, currentAct === "REQUEST" || currentAct === "SWARM" || currentAct === "RESULT"); // Keep visible after request
    
    const responseFullText = "Done. I scheduled you for Dr. Elena Rosas in Shadyside for Tuesday at 5:30 PM.";
    const responseTypedText = useTypewriter(responseFullText, 10, 500, currentAct === "RESULT");


    // ─── ACT II: SWARM (Active Dispatch - Tree) ─────────────────────────────
    
    const isSwarmActive = currentAct === "SWARM"; 

    // Tree Line Growth
    const treeLineHeight = useTransform(smoothProgress, [0.35, 0.45], [0, 1]);
    
    // Agent Nodes - EXTENDED PAUSE: Hold between 0.45 and 0.80
    
    // Agent Nodes - EXTENDED PAUSE: Hold between 0.45 and 0.80
    
    // Fade in
    const nodesOpacity = useTransform(smoothProgress, [0.40, 0.45, 0.80, 0.85], [0, 1, 1, 0]);
    // Scale from 0 (emerging) to 1
    const nodesScale = useTransform(smoothProgress, [0.40, 0.45], [0.5, 1]);
    const centerNodeScale = useTransform(smoothProgress, [0.40, 0.45], [0.5, 1.1]);

    // Counter Hooks
    const sourcesCount = useCounter(142, 1500, isSwarmActive);
    const reviewCount = useCounter(128, 1500, isSwarmActive);
    
    // Convergence (collapse to center before result) - Happens 0.80-0.85
    
    // Combine into single value for smoother transitions
    // Start at 20vw (center offset), move to 0 (expanded), stay, then collapse back
    // Circular/Radial Expansion:
    // Bubble (Center) -> Orbit Radius matches scroll
    
    // Radius: 0 (Behind Bubble) -> 35vmin (Orbit)
    // We use a responsive value approx: 35vmin.

    // Orbit Size (Numeric for calculations) - unit is px
    const orbitSizeNum = useTransform(smoothProgress, [0.40, 0.45, 0.80, 0.85], [0, 350, 350, 0]);
    const orbitSize = useTransform(orbitSizeNum, v => `${v}px`);



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
                    title: "Say it like you'd text a friend.",
                    desc: "No forms. No filters. Just say what you need.",
                    show: true
                });
            } else if (v > 0.45 && v < 0.80) { // EXTENDED RANGE (35% of scroll)
                setExplanation({
                    title: "Agents deploy.",
                    desc: "Searching, cross-referencing, and verifying across 142 sources in real time.",
                    show: true
                });
            } else if (v > 0.93) { // Show explanation WITH the theme transition
                 setExplanation({
                    title: "Done.",
                    desc: "Booked, confirmed, and on your calendar. You didn't lift a finger.",
                    show: true
                });
            } else {
                setExplanation(prev => ({ ...prev, show: false }));
            }
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    return (
        <>
        <motion.div 
            ref={containerRef} 
            animate={{ color: textColor }} 
            className="h-[550vh] relative selection:bg-blue-500/20 font-sans bg-black"
        >
            {/* ─── BACKGROUND LAYERS ────────────────────────────────────── */}
            <motion.div
                className="fixed inset-0 z-0 pointer-events-none"
                animate={{ opacity: isLightMode ? 0 : 1 }}
                transition={{ duration: 0.5 }}
                style={{ background: 'var(--bg-gradient-dark)' }}
            />
            <motion.div
                className="fixed inset-0 z-0 pointer-events-none"
                animate={{ opacity: isLightMode ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                style={{ background: 'var(--bg-gradient-light)' }}
            />

            {/* ─── STICKY HEADER ────────────────────────────────────────── */}
            <motion.header 
                className="fixed top-0 w-full z-[100] border-b backdrop-blur-xl transition-all duration-500" // Use Tailwind duration as helper, but motion props override
                animate={{ 
                    backgroundColor: headerBg, 
                    borderColor: headerBorder 
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <motion.span 
                            animate={{ color: textColor }}
                            transition={{ duration: 0.5 }}
                            className="text-xl font-serif tracking-tight"
                        >
                            EasyClaw
                        </motion.span>
                    </div>
                    <nav className="flex items-center gap-6">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <motion.button 
                                    animate={{ color: textColor }}
                                    transition={{ duration: 0.5 }}
                                    className="text-xs font-sans font-medium tracking-widest uppercase transition-opacity hover:opacity-80"
                                >
                                    Log in
                                </motion.button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/chat">
                                <motion.span 
                                    animate={{ color: textColor }}
                                    transition={{ duration: 0.5 }}
                                    className="text-xs font-sans font-medium tracking-widest uppercase transition-opacity hover:opacity-80"
                                >
                                    Enter
                                </motion.span>
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </nav>
                </div>
            </motion.header>


            {/* ─── STICKY VIEWPORT ────────────────────────────────────────── */}
            <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">

                {/* Explanation Box - Centered Right */}
                <ExplanationBox 
                    title={explanation.title} 
                    description={explanation.desc} 
                    visible={explanation.show} 
                    isLightMode={isLightMode}
                />


                
                {/* ─── ACT 0: INTRO HERO ────────────────────────────────────── */}
                 <motion.div 
                    style={{ opacity: introOpacity, scale: introScale, y: introY }}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
                >
                    <motion.div 
                        animate={{ color: textColor }} 
                        transition={{ duration: 0.5 }}
                        className="text-[10px] font-mono tracking-[0.3em] opacity-40 mb-6 uppercase"
                    >
                        The AI that doesn&apos;t just answer — it acts.
                    </motion.div>
                    <motion.h1 
                        animate={{ color: textColor }} 
                        transition={{ duration: 0.5 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-sans font-medium text-center tracking-tight leading-[0.9] mix-blend-difference"
                    >
                        ASK. WE HANDLE<br/>
                        <span className="opacity-50">THE REST.</span>
                    </motion.h1>
                     <motion.div 
                        animate={{ 
                            borderColor: isLightMode ? "rgba(0,0,0,0.1)": "rgba(255,255,255,0.1)", 
                            color: textColor 
                        }} 
                        transition={{ duration: 0.5 }}
                        className="mt-8 px-6 py-2 border rounded-full text-[10px] tracking-widest uppercase opacity-60"
                    >
                        Scroll
                    </motion.div>
                </motion.div>


                {/* Side Scroll Tracker - Right Aligned "Lightweight" Style */}
                <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden md:block pointer-events-none">
                     <ScrollTracker currentAct={currentAct} isLightMode={isLightMode} />
                </div>

                {/* ─── ACT I: REQUEST BUBBLE ──────────────────────── */}
                <motion.div
                    style={{ opacity: bubbleOpacity, scale: bubbleScale, x: bubbleX, y: bubbleY }}
                    className="absolute z-50 inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
                >
                    {/* ACCURATE iMESSAGE BUBBLE */}
                    <motion.div 
                        className="relative group w-[300px] md:w-[400px]"
                        animate={{ 
                            boxShadow: `0 2px 8px rgba(0, 0, 0, ${shadowOpacity}), inset 0 1px 0px rgba(255, 255, 255, 0.15)`
                        }}
                        transition={{ duration: 0.5 }}
                    > 
                        <div
                            className="relative text-white px-5 py-3.5 rounded-[22px] rounded-br-[4px] leading-snug text-[17px] font-normal antialiased backdrop-blur-md"
                            style={{
                                background: 'linear-gradient(180deg, #38acff 0%, #007AFF 100%)', // Brighter top for realism
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                letterSpacing: '-0.012em',
                                // BoxShadow managed by motion.div container key
                            }}
                        >
                            {typedText.text}
                            {!typedText.isComplete && <span className="animate-pulse">|</span>}
                        </div>
                        {/* Tail - SVG */}
                        <svg className="absolute bottom-[0px] -right-[5px] w-[20px] h-[20px]" viewBox="0 0 20 20" style={{ transform: 'rotateY(0deg)' }}>
                             <path d="M0 20 L20 20 C 12 20 5 15 0 0 Z" fill="#007AFF" />
                        </svg>
                    </motion.div>
                </motion.div>


                {/* ─── ACT II: AGENTS & ORBIT SYSTEM ────────────────────── */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ transform: "translateX(50px)" }}>
                    {/* 
                        Orbit Container
                        - Centered on screen (parent is centered flex)
                        - We apply the Y offset (-100px) from the transform above to match bubble center.
                     */}
                    
                    <motion.div 
                        className="relative flex items-center justify-center"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        style={{ width: 0, height: 0 }} // Zero size container, children positioned absolutely
                    >
                         {/* ORBIT RINGS & SPOKES */}
                         <svg className="absolute overflow-visible" style={{ width: "100%", height: "100%", left: 0, top: 0 }}>
                            {/* Inner Ring (33%) */}
                            <motion.circle 
                                cx="0" cy="0" 
                                r={useTransform(orbitSizeNum, v => v * 0.33)} 
                                fill="none" 
                                stroke="#ffffff" 
                                strokeWidth="1" 
                                strokeOpacity="0.1" 
                            />
                             {/* Middle Ring (66%) */}
                             <motion.circle 
                                cx="0" cy="0" 
                                r={useTransform(orbitSizeNum, v => v * 0.66)} 
                                fill="none" 
                                stroke="#ffffff" 
                                strokeWidth="1" 
                                strokeOpacity="0.1" 
                                strokeDasharray="4 4" 
                            />
                            {/* Outer Orbit Ring (100%) */}
                             <motion.circle 
                                cx="0" cy="0" 
                                r={orbitSizeNum} 
                                fill="none" 
                                stroke="#ffffff" 
                                strokeWidth="1" 
                                strokeOpacity="0.3" 
                                strokeDasharray="8 8" 
                            />
                            
                            {/* Spokes */}
                            {[0, 120, 240].map((angle, i) => (
                                <motion.line
                                    key={`spoke-${i}`}
                                    x1="0" y1="0"
                                    x2="0" 
                                    y2={useTransform(orbitSizeNum, v => -v)} 
                                    stroke="#ffffff"
                                    strokeWidth="4"
                                    strokeOpacity="0.5"
                                    style={{ 
                                        rotate: angle,
                                        transformOrigin: "0px 0px"
                                    }}
                                />
                            ))}
                         </svg>


                        {/* AGENT 1: Deep Search (0 degrees - Top) */}
                        <motion.div
                            className="absolute flex items-center justify-center"
                            style={{ 
                                x: 0, 
                                y: useTransform(orbitSizeNum, v => -v), 
                            }} 
                        >
                            {/* Counter-Rotate Content */}
                            <motion.div 
                                animate={{ rotate: -360 }} 
                                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                style={{ opacity: nodesOpacity, scale: nodesScale }}
                            >
                                <div className="flex flex-col items-center gap-2 -translate-y-1/2">
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
                                            <div className="absolute bottom-1 right-2 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded-sm text-[9px] font-mono text-blue-300 border border-blue-500/10">
                                                Found: {sourcesCount}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* AGENT 2: Analysis (120 degrees - Bottom Right) */}
                        {/* 
                            Angle: 120 degrees. 
                            X = sin(120) * r = 0.866 * r
                            Y = -cos(120) * r ... wait, standard unit circle?
                            Let's use CSS clock-wise: 0 is Up.
                            120 is Right-Down.
                            X = r * sin(120) = r * 0.866
                            Y = -r * cos(120) = -r * (-0.5) = 0.5 * r
                        */}
                        <motion.div
                            className="absolute flex items-center justify-center"
                            style={{ 
                                x: useTransform(orbitSizeNum, v => v * 0.866), 
                                y: useTransform(orbitSizeNum, v => v * 0.5), 
                            }} 
                        >
                             {/* Counter-Rotate Content */}
                             <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                style={{ opacity: nodesOpacity, scale: centerNodeScale }}
                             >
                                <div className="flex flex-col items-center gap-2 -translate-y-1/2">
                                     <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1 z-20">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                        <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Analysis</span>
                                    </div>
        
                                    <div className="w-32 h-24 bg-[#0A0A0A] border border-white/10 rounded-sm flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                                        <div className="text-3xl font-serif text-white mb-1 z-10 flex items-end">4.9</div>
                                        <div className="flex gap-1 z-10">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="w-2 h-2 bg-yellow-500 clip-star" style={{ clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"}} />
                                            ))}
                                        </div>
                                        <div className="text-[8px] text-white/30 mt-2 font-mono tracking-wider">{reviewCount} REVIEWS</div>
                                    </div>
                                </div>
                             </motion.div>
                        </motion.div>

                        {/* AGENT 3: Negotiation (240 degrees - Bottom Left) */}
                         {/* 
                            Angle: 240 degrees.
                            X = r * sin(240) = r * -0.866
                            Y = -r * cos(240) = -r * (-0.5) = 0.5 * r
                        */}
                        <motion.div
                            className="absolute flex items-center justify-center"
                            style={{ 
                                x: useTransform(orbitSizeNum, v => v * -0.866), 
                                y: useTransform(orbitSizeNum, v => v * 0.5), 
                            }}
                        >
                             <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                style={{ opacity: nodesOpacity, scale: nodesScale }}
                             >
                                <div className="flex flex-col items-center gap-2 -translate-y-1/2">
                                     <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 mb-1 z-20">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Negotiation</span>
                                    </div>
        
                                     <div className="w-32 h-24 bg-[#0A0A0A] border border-white/10 rounded-sm p-3 relative shadow-2xl">
                                        <div className="grid grid-cols-4 gap-1 h-full">
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <motion.div key={i} className={`rounded-[1px] ${i === 5 || i === 9 ? 'bg-green-500' : 'bg-white/10'}`} />
                                            ))}
                                        </div>
                                        <motion.div 
                                            animate={{ top: ["0%", "100%"] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 right-0 h-[1px] bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                        />
                                    </div>
                                </div>
                             </motion.div>
                        </motion.div>

                    </motion.div>
                 </div>

                {/* ─── ACT III: RESULT ────────────────────────────────────── */}
                 <motion.div
                    style={{ opacity: act4Opacity, scale: act4Scale, y: act4Y, x: -50 }} // Offset Left (Agent)
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 px-4"
                >
                     {/* Gray Response Bubble - THEME TRANSITION */}
                     <motion.div 
                        className="relative group w-[300px] md:w-[400px]"
                        animate={{ 
                            boxShadow: `0 2px 8px rgba(0, 0, 0, ${shadowOpacity}), inset 0 1px 0px rgba(255, 255, 255, 0.05)`
                        }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            className="relative px-5 py-3.5 rounded-[22px] rounded-bl-[4px] leading-snug text-[17px] font-normal antialiased backdrop-blur-md"
                            animate={{
                                background: grayBubbleBg,
                                color: grayBubbleTextColor
                            }}
                            transition={{ duration: 0.5 }}
                            style={{
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                letterSpacing: '-0.012em',
                            }}
                        >
                            {responseTypedText.text}
                            {/* Done. I scheduled you for <motion.span animate={{ color: grayBubbleTextColor }} transition={{ duration: 0.5 }} className="font-semibold">Dr. Elena Rosas</motion.span> in Shadyside for <motion.span animate={{ color: greenTextColor }} transition={{ duration: 0.5 }}>Tuesday at 5:30 PM</motion.span>. */}
                        </motion.div>
                        {/* Tail - SVG - Animate Fill */}
                        <svg className="absolute bottom-[0px] -left-[5px] w-[20px] h-[20px]" viewBox="0 0 20 20" style={{ transform: 'rotateY(180deg)' }}>
                            <motion.path d="M0 20 L20 20 C 12 20 5 15 0 0 Z" animate={{ fill: grayBubbleTailColor }} transition={{ duration: 0.5 }} />
                        </svg>
                    </motion.div>
                </motion.div>

                 {/* ─── STICKY FOOTER ────────────────────────────────────────── */}
                <motion.footer 
                    className="fixed bottom-0 w-full py-6 px-8 pointer-events-none z-40 mix-blend-difference"
                    animate={{ color: textColor }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="max-w-[1400px] mx-auto flex items-center justify-between text-xs font-mono uppercase tracking-widest opacity-50">
                        <span>EasyClaw</span>
                        <span className="hidden md:inline"></span>
                        <span>© 2026</span>
                    </div>
                </motion.footer>

            </div>
        </motion.div>

            {/* ─── VALUE PROPS ────────────────────────────────────────── */}
            <div className="relative z-10 bg-white text-black">
                <div className="max-w-[1000px] mx-auto px-6 py-32 grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">01</span>
                        <h3 className="text-2xl font-sans font-medium tracking-tight">Acts, not answers.</h3>
                        <p className="text-base text-black/60 leading-relaxed">Other AIs give you options. EasyClaw books the appointment, orders the food, sends the email.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">02</span>
                        <h3 className="text-2xl font-sans font-medium tracking-tight">Lives in Telegram.</h3>
                        <p className="text-base text-black/60 leading-relaxed">No app to download. No account to set up. Text it like you&apos;d text a friend.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">03</span>
                        <h3 className="text-2xl font-sans font-medium tracking-tight">Knows you.</h3>
                        <p className="text-base text-black/60 leading-relaxed">Your preferences, your schedule, your insurance. It gets smarter the more you use it.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">04</span>
                        <h3 className="text-2xl font-sans font-medium tracking-tight">Pay for what you use.</h3>
                        <p className="text-base text-black/60 leading-relaxed">No subscriptions. No commitments. Credits that never expire.</p>
                    </div>
                </div>

                {/* CTA */}
                <div className="max-w-[1000px] mx-auto px-6 pb-32 flex flex-col items-center text-center gap-6">
                    <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight">Beyond chat. Built for action.</h2>
                    <p className="text-lg text-black/50 max-w-md">Get early access to the personal AI that actually gets things done.</p>
                    <Link href="/sign-up" className="mt-4 px-8 py-3 bg-black text-white text-sm font-medium tracking-wide rounded-full hover:bg-black/80 transition-colors">
                        Get Started
                    </Link>
                </div>
            </div>
        </>
    );
}

