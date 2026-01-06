import React from "react";

export default function Header({ onStart }) {
    return (
        <header className="absolute top-0 right-0 p-6 z-30">
            <button
                onClick={onStart}
                className="px-4 py-2 rounded-full bg-white/10 text-white text-xs hover:bg-white/20 transition"
            >
                시작하기
            </button>
        </header>
    );
}
