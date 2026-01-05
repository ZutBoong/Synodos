// src/pages/views/Landing.jsx
import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ShaderBackground from "../../components/landing/shader-background";
import Header from "../../components/landing/header";
import HeroContent from "../../components/landing/hero-content";
import Circle from "../../components/landing/circle";
/* import LogoCenter from "../../components/landing/LogoCenter"; */

function ScrollTopButton({ show, onClick }) {
    if (!show) return null;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="맨 위로"
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50
                 w-10 h-10 rounded-full
                 bg-white/10 hover:bg-white/20 text-white
                 border border-white/20 backdrop-blur-sm
                 flex items-center justify-center
                 transition"
            style={{ filter: "url(#glass-effect)" }}
        >
            <span className="text-lg leading-none">↑</span>
        </button>
    );
}

export default function Landing() {
    const navigate = useNavigate();
    const infoRef = useRef(null);
    const topRef = useRef(null);

    const [showTopBtn, setShowTopBtn] = useState(false);

    const scrollToInfo = () => {
        infoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const scrollToTop = () => {
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => {
        const onScroll = () => setShowTopBtn(window.scrollY > 200);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <ShaderBackground>
            <ScrollTopButton show={showTopBtn} onClick={scrollToTop} />

            {/* 1) 첫 화면(히어로) */}
            <section ref={topRef} className="relative min-h-screen">
                {/* ✅ 중앙 로고는 여기 */}


                <Header onStart={() => navigate("/home")} />
                <HeroContent onMoreInfo={scrollToInfo} />
                <Circle />
            </section>

            {/* 2) 아래 소개 섹션 */}
            <section ref={infoRef} className="relative min-h-screen px-10 py-24">
                <h2 className="text-white text-2xl font-light mb-6">SYN'ODOS 소개</h2>
                <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                    SYN’ODOS는 흐름 속에서 협업이 자연스럽게 이어지도록 설계된 프로젝트 관리 경험입니다.
                    <br />
                    팀의 작업, 맥락, 그리고 의사결정을 하나의 리듬으로 연결합니다.
                    <br />
                    <br />
                    태스크와 일정, 팀 상태를 한 화면에서 파악하고 전환 비용을 줄이며, 필요한 순간에 필요한
                    정보가 “아래로 이어지듯” 나타나는 UX를 목표로 합니다.
                </p>
            </section>
        </ShaderBackground>
    );
}
