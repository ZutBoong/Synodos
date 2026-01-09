// src/components/landing/shader-background.jsx
import React, { useEffect, useRef, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

export default function ShaderBackground({ children }) {
    const containerRef = useRef(null);
    const [, setIsActive] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // 마운트 후 약간의 딜레이를 주어 텍스처 로딩 시간 확보
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleMouseEnter = () => setIsActive(true);
        const handleMouseLeave = () => setIsActive(false);

        const el = containerRef.current;
        if (!el) return;

        el.addEventListener("mouseenter", handleMouseEnter);
        el.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            el.removeEventListener("mouseenter", handleMouseEnter);
            el.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div ref={containerRef} className="relative h-full">
            {/* SVG Filters */}
            <svg className="absolute inset-0 w-0 h-0">
                <defs>
                    <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
                        <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
                        <feColorMatrix
                            type="matrix"
                            values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
                            result="tint"
                        />
                    </filter>
                    <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                            result="gooey"
                        />
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                    </filter>
                </defs>
            </svg>

            {/* ✅ 배경은 스크롤과 무관하게 고정 */}
            <div className="fixed inset-0 -z-10 pointer-events-none" style={{ backgroundColor: "#0b0714" }}>
                {isMounted && (
                    <>
                        <MeshGradient
                            className="absolute inset-0 w-full h-full"
                            colors={[
                                "#0b0714", // 거의 검정에 가까운 딥 퍼플
                                "#c4b5fd", // 연보라 (lavender)
                                "#8b5cf6", // 퍼플 (primary)
                                "#312e81", // 딥 인디고
                                "#60a5fa", // 살짝 푸른 블루 포인트
                            ]}
                            speed={0.25}
                        />
                        <MeshGradient
                            className="absolute inset-0 w-full h-full opacity-50"
                            colors={[
                                "#0b0714",
                                "#a78bfa", // 밝은 퍼플
                                "#6366f1", // 블루퍼플
                                "#0b0714",
                            ]}
                            speed={0.18}
                            wireframe="true"
                        />
                    </>
                )}
            </div>

            {/* Foreground */}
            <div className="relative z-10 h-full">{children}</div>
        </div>
    );
}
