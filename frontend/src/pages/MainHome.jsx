import React from "react";
import { useNavigate } from "react-router-dom";
import ShaderBackgroundV0 from "../components/ShaderBackgroundV0";
import "./MainHome.css";

export default function MainHome() {
    const navigate = useNavigate();

    return (
        <div className="main-home">
            <ShaderBackgroundV0 />

            <button className="start-btn" onClick={() => navigate("/home")}>
                시작하기
            </button>

            <h1 className="title">Flowtask</h1>
            <p className="subtitle">흐름처럼 자연스러운 협업</p>
        </div>
    );
}
