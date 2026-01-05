import React from "react";

export default function HeroContent({ onMoreInfo, onStart }) {
    return (
        <main className="absolute bottom-8 left-8 z-20 max-w-lg">
            <div className="text-left">
                {/* Badge */}
                <div
                    className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm mb-4 relative"
                    style={{ filter: "url(#glass-effect)" }}
                >
                    <div className="absolute top-0 left-1 right-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
                    <span className="text-white/90 text-xs font-light relative z-10">
                        ✨ 새로운 기능들을 만나보세요
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-6xl md:leading-16 tracking-tight font-light text-white mb-4">
                    <span className="font-medium italic instrument">SYN'ODOS</span>
                    <br />
                    <span className="font-light tracking-tight text-white">
                        Experiences
                    </span>
                </h1>

                {/* Description (두 줄 유지) */}
                <p className="text-xs font-light text-white/70 mb-4 leading-relaxed">
                    SYN’ODOS는 흐름 속에서 협업이 자연스럽게 이어지도록 설계된 프로젝트 관리 경험입니다.
                    <br />
                    팀의 작업, 맥락, 그리고 의사결정을 하나의 리듬으로 연결합니다.
                </p>

                {/* Buttons */}
                <div className="flex items-center gap-4 flex-wrap">
                    <button
                        onClick={onMoreInfo}
                        className="px-8 py-3 rounded-full bg-transparent border border-white/30 text-white font-normal text-xs transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer"
                    >
                        More Information
                    </button>

                    <button
                        onClick={onStart}
                        className="px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </main>
    );
}
