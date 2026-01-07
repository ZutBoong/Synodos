import React from "react";

export default function LogoCenter() {
    return (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <img
                src="/LOGO.png"
                alt="SYN'ODOS Logo"
                className="w-[360px] md:w-[480px] opacity-90"
            />
        </div>
    );
}
