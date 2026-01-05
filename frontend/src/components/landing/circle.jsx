import React from "react";
import { PulsingBorder } from "@paper-design/shaders-react";
import { motion } from "framer-motion";

export default function Circle() {
    const pathId = "circle-path-circle";

    return (
        <div className="absolute bottom-8 right-8 z-[9999]">
            <div className="relative w-20 h-20 flex items-center justify-center cursor-pointer">
                <PulsingBorder
                    colors={["#BEECFF", "#E77EDC", "#FF4C3E", "#00FF88", "#FFD700", "#FF6B35", "#8A2BE2"]}
                    colorBack="#00000000"
                    speed={1.5}
                    roundness={1}
                    thickness={0.1}
                    softness={0.2}
                    intensity={5}
                    spotsPerColor={5}
                    spotSize={0.1}
                    pulse={0.1}
                    smoke={0.5}
                    smokeSize={4}
                    scale={0.65}
                    rotation={0}
                    frame={9161408.251009725}
                    style={{ width: "60px", height: "60px", borderRadius: "50%" }}
                />

                <motion.svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    style={{ transform: "scale(1.6)" }}
                >
                    <defs>
                        <path
                            id={pathId}
                            d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
                        />
                    </defs>
                    <text className="text-sm fill-white/80 instrument">
                        <textPath href={`#${pathId}`} startOffset="0%">
                            SYN'ODOS • SYN'ODOS • SYN'ODOS • SYN'ODOS •
                        </textPath>
                    </text>
                </motion.svg>
            </div>
        </div>
    );
}
