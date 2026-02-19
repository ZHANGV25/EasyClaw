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

const ExplanationBox = ({ title, description, visible, isLightMode, cta }: { title: string, description: string, visible: boolean, isLightMode: boolean, cta?: { text: string, href: string } }) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} // Slide in from Left
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute left-4 right-4 md:left-8 md:right-auto top-1/2 -translate-y-1/2 max-w-none md:max-w-xs z-40 pointer-events-none flex flex-col items-start text-left`}
                >
                    <div className={`h-[1px] w-12 mb-4 ${isLightMode ? 'bg-black/20' : 'bg-white/20'}`} />
                    <h3 className={`text-sm font-mono uppercase tracking-widest mb-2 ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                        {title}
                    </h3>
                    <p className={`text-xl md:text-2xl font-sans font-medium leading-relaxed ${isLightMode ? 'text-black' : 'text-white'}`}>
                        {description}
                    </p>
                    {cta && (
                        <Link href={cta.href} className="mt-8 pointer-events-auto">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-colors ${
                                    isLightMode 
                                        ? 'bg-black text-white hover:bg-black/80' 
                                        : 'bg-white text-black hover:bg-white/90'
                                }`}
                            >
                                {cta.text}
                            </motion.button>
                        </Link>
                    )}
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
    const [openFAQ, setOpenFAQ] = useState<number | null>(null);

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

    const [explanation, setExplanation] = useState<{title: string, desc: string, show: boolean, cta?: { text: string, href: string }}>({ title: "", desc: "", show: false });

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
                    show: true,
                    cta: { text: "Get Started", href: "/sign-up" }
                });
            } else {
                setExplanation(prev => ({ ...prev, show: false, cta: undefined }));
            }
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    return (
        <>
        <motion.div 
            ref={containerRef} 
            animate={{ color: textColor }} 
            className="h-[400vh] relative selection:bg-blue-500/20 font-sans bg-black"
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
                    cta={explanation.cta}
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
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ transform: "translateX(70px)" }}>
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

                {/* ─── USE CASES ────────────────────────────────────────── */}
                <div className="max-w-[1000px] mx-auto px-6 py-32 border-t border-black/10">
                    <div className="flex flex-col gap-4 mb-16">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">What people ask</span>
                        <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight">One assistant.<br/>A thousand use cases.</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { ask: "Book me a table for 4 Friday night, somewhere with outdoor seating downtown.", tag: "Reservations" },
                            { ask: "Find the cheapest direct flight to Miami next weekend. Window seat.", tag: "Travel" },
                            { ask: "Find me a dentist in Shadyside that takes Blue Cross, open Tuesday after 5.", tag: "Healthcare" },
                            { ask: "Track my Amazon package and let me know when it's out for delivery.", tag: "Tracking" },
                            { ask: "Cancel my Planet Fitness membership. I don't want to call them.", tag: "Errands" },
                            { ask: "Remind me to call Mom every Sunday at 2pm.", tag: "Reminders" },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col gap-4 p-6 rounded-2xl border border-black/5 hover:border-black/15 transition-colors bg-black/[0.02]">
                                <span className="text-[10px] font-mono tracking-[0.2em] uppercase opacity-30">{item.tag}</span>
                                <p className="text-[15px] text-black/70 leading-relaxed">&ldquo;{item.ask}&rdquo;</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── HOW IT WORKS ────────────────────────────────────────── */}
                <div className="max-w-[1000px] mx-auto px-6 py-32 border-t border-black/10">
                    <div className="flex flex-col gap-4 mb-16">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">How it works</span>
                        <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight">Three steps. That&apos;s it.</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-medium">1</div>
                            <h3 className="text-xl font-sans font-medium tracking-tight">Text your request</h3>
                            <p className="text-base text-black/50 leading-relaxed">Open Telegram, type what you need in plain English. No special syntax. No menus.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-medium">2</div>
                            <h3 className="text-xl font-sans font-medium tracking-tight">Agents get to work</h3>
                            <p className="text-base text-black/50 leading-relaxed">Your request is broken down and dispatched to specialized agents that search, verify, and act in parallel.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-medium">3</div>
                            <h3 className="text-xl font-sans font-medium tracking-tight">Done. Confirmed.</h3>
                            <p className="text-base text-black/50 leading-relaxed">You get a confirmation — booked, ordered, scheduled, cancelled. Whatever you asked for, handled.</p>
                        </div>
                    </div>
                </div>

                {/* ─── PRICING ────────────────────────────────────────── */}
                <div className="max-w-[1000px] mx-auto px-6 py-32 border-t border-black/10">
                    <div className="flex flex-col gap-4 mb-16">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">Pricing</span>
                        <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight">Pay for what you use.<br/>Nothing more.</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        {/* Free Tier */}
                        <div className="flex flex-col p-8 rounded-2xl border border-black/5 bg-white h-full relative group hover:border-black/10 transition-colors">
                            <div className="mb-6">
                                <h3 className="text-lg font-medium tracking-tight mb-2">Free</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-medium tracking-tight">$0</span>
                                </div>
                                <p className="text-sm text-black/50 mt-2">To get started</p>
                            </div>
                            
                            <ul className="flex flex-col gap-3 mb-8 flex-1">
                                {[
                                    "50 free credits",
                                    "Basic tasks",
                                    "Telegram access",
                                    "7-day history"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-black/70">
                                        <svg className="w-4 h-4 text-black/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            
                            <Link href="/sign-up" className="w-full py-2.5 px-4 rounded-full border border-black/10 text-sm font-medium text-center hover:bg-black/5 transition-colors">
                                Get Started
                            </Link>
                        </div>

                        {/* Credits Tier (Recommended) */}
                        <div className="flex flex-col p-8 rounded-2xl border border-black/20 bg-white shadow-xl shadow-black/5 h-full relative transform md:-translate-y-4">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-medium">
                                Recommended
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-lg font-medium tracking-tight mb-2">Credits</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-black/50">From</span>
                                    <span className="text-4xl font-medium tracking-tight">$5</span>
                                </div>
                                <p className="text-sm text-black/50 mt-2">For real work</p>
                            </div>
                            
                            <ul className="flex flex-col gap-3 mb-8 flex-1">
                                {[
                                    "Everything in Free",
                                    "Complex tasks",
                                    "Full history",
                                    "Priority response",
                                    "Credits never expire"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-black/80 font-medium">
                                        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            
                            <Link href="/sign-up" className="w-full py-2.5 px-4 rounded-full bg-black text-white text-sm font-medium text-center hover:bg-black/80 transition-colors">
                                Get Started
                            </Link>
                        </div>

                        {/* Team Tier */}
                        <div className="flex flex-col p-8 rounded-2xl border border-black/5 bg-white h-full hover:border-black/10 transition-colors">
                            <div className="mb-6">
                                <h3 className="text-lg font-medium tracking-tight mb-2">Team</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-medium tracking-tight text-black/40">Coming soon</span>
                                </div>
                                <p className="text-sm text-black/50 mt-2">For power users</p>
                            </div>
                            
                            <ul className="flex flex-col gap-3 mb-8 flex-1 opacity-60">
                                {[
                                    "Everything in Credits",
                                    "Shared assistants",
                                    "Admin dashboard",
                                    "Custom integrations",
                                    "Volume discounts"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-black/70">
                                        <svg className="w-4 h-4 text-black/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            
                            <a href="mailto:hello@easyclaw.com" className="w-full py-2.5 px-4 rounded-full border border-black/5 text-sm font-medium text-center text-black/40 hover:text-black hover:border-black/20 transition-colors">
                                Join Waitlist
                            </a>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-sm text-black/40 max-w-lg mx-auto leading-relaxed">
                            <span className="font-medium text-black/60">What&apos;s a credit?</span> One credit ≈ one simple task. Complex tasks use more. You always see the cost before confirming.
                        </p>
                    </div>

                    </div>

                {/* ─── FAQ ────────────────────────────────────────── */}
                <div className="max-w-[700px] mx-auto px-6 py-32 border-t border-black/10">
                    <div className="flex flex-col gap-4 mb-16 text-center">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">FAQ</span>
                        <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight">Questions? Answered.</h2>
                    </div>

                    <div className="flex flex-col">
                        {[
                            { q: "What can EasyClaw actually do?", a: "Anything you'd ask a personal assistant — book appointments, find flights, set reminders, cancel subscriptions, track packages, research options, and more. If it can be done online, EasyClaw can handle it." },
                            { q: "How is this different from ChatGPT?", a: "ChatGPT gives you answers. EasyClaw takes action. Instead of telling you which dentists are available, we book the appointment. Instead of listing flight options, we reserve the seat." },
                            { q: "Is my data safe?", a: "Yes. Your conversations are encrypted, your personal details are stored securely, and we never sell your data. You can delete your account and all data at any time." },
                            { q: "What's a credit?", a: "One credit covers one simple task — like setting a reminder or answering a question. Bigger tasks (booking a flight, multi-step research) use more credits. You always see the estimated cost before confirming." },
                            { q: "Do I need to install anything?", a: "No. EasyClaw works through Telegram — just text it like you'd text a friend. You can also use the web dashboard to manage your account and see activity." },
                            { q: "What if I run out of credits?", a: "You'll get a heads-up when you're running low. Top up anytime from the dashboard — credits never expire. Your assistant pauses non-urgent tasks until you add more." },
                            { q: "Can I use it outside the US?", a: "Yes. EasyClaw works anywhere Telegram does. Some location-specific tasks (like booking a local restaurant) work best in supported regions, which we're expanding." },
                        ].map((item, i) => (
                            <div key={i} className="border-b border-black/10">
                                <button
                                    onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                                    className="w-full py-6 flex items-center justify-between text-left group"
                                >
                                    <span className="text-lg font-medium text-black group-hover:text-black/70 transition-colors pr-8">{item.q}</span>
                                    <div className={`relative w-4 h-4 transition-transform duration-300 ${openFAQ === i ? "rotate-45" : ""}`}>
                                        <div className="absolute top-1/2 left-0 w-4 h-[1.5px] bg-black -translate-y-1/2" />
                                        <div className="absolute top-0 left-1/2 h-4 w-[1.5px] bg-black -translate-x-1/2" />
                                    </div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {openFAQ === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <p className="pb-6 text-base text-black/60 leading-relaxed max-w-[90%]">
                                                {item.a}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── CTA ────────────────────────────────────────── */}
                <div className="max-w-[1000px] mx-auto px-6 py-32 border-t border-black/10 flex flex-col items-center text-center gap-6">
                    <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight">Beyond chat. Built for action.</h2>
                    <p className="text-lg text-black/50 max-w-md">Get early access to the personal AI that actually gets things done.</p>
                    <Link href="/sign-up" className="mt-4 px-8 py-3 bg-black text-white text-sm font-medium tracking-wide rounded-full hover:bg-black/80 transition-colors">
                        Get Started
                    </Link>
                </div>
            </div>

            {/* ─── FOOTER ────────────────────────────────────────── */}
            <div className="bg-[#050505] text-white/50 py-20 px-6 border-t border-white/5 relative z-30">
                <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xl font-serif text-white tracking-tight">EasyClaw</h3>
                        <p className="text-sm">The AI that acts.</p>
                        <p className="text-xs opacity-40 mt-auto">© 2026 EasyClaw. All rights reserved.</p>
                    </div>

                    {/* Product */}
                    <div className="flex flex-col gap-4">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">Product</span>
                        <a href="#" className="text-sm hover:text-white transition-colors">Features</a>
                        <a href="#" className="text-sm hover:text-white transition-colors">Pricing</a>
                        <a href="#" className="text-sm hover:text-white transition-colors">FAQ</a>
                        <a href="#" className="text-sm hover:text-white transition-colors">Changelog</a>
                    </div>

                    {/* Legal */}
                    <div className="flex flex-col gap-4">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">Legal</span>
                        <a href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="text-sm hover:text-white transition-colors">Terms of Service</a>
                         <a href="#" className="text-sm hover:text-white transition-colors">Cookie Policy</a>
                    </div>

                    {/* Connect */}
                    <div className="flex flex-col gap-4">
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">Connect</span>
                        <a href="#" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">Twitter / X</a>
                        <a href="#" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">Discord</a>
                        <a href="mailto:vhzhang2020@gmail.com" className="text-sm hover:text-white transition-colors">Email</a>
                    </div>
                </div>

                <div className="max-w-[1000px] mx-auto pt-8 border-t border-white/5 flex items-center justify-between text-xs opacity-40">
                    <span>Built in Pittsburgh 🏗️</span>
                    <a href="#" className="hover:text-white transition-colors">Status</a>
                </div>
            </div>
        </>
    );
}

