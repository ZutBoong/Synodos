import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FindId from "./pages/FindId";
import FindPassword from "./pages/FindPassword";

import Calendar from "./pages/Calendar";
import TeamView from "./pages/TeamView";
import MyPage from "./pages/MyPage";
import MyActivity from "./pages/MyActivity";
import CreateTeam from "./pages/CreateTeam";
import NotificationsPage from "./pages/NotificationsPage";

import MainHome from "./pages/MainHome";

import "./App.css";

function AppContent() {
    const location = useLocation();

    const isTeamPage = location.pathname.startsWith("/team/");
    const isCalendarPage = location.pathname === "/calendar";
    const isMyPage = location.pathname === "/mypage";
    const isMyActivity = location.pathname === "/activity";
    const isCreateTeam = location.pathname === "/create-team";
    const isNotifications = location.pathname === "/notifications";

    // MainHome/Home/Login/Register/Find* 는 헤더 숨김
    const hideHeader = ["/", "/home", "/login", "/register", "/find-id", "/find-password"].includes(
        location.pathname
    );

    // 독립 레이아웃 페이지
    if (isTeamPage) {
        return (
            <Routes>
                <Route path="/team/:teamId" element={<TeamView />} />
            </Routes>
        );
    }
    if (isCalendarPage) return <Calendar />;
    if (isMyPage) return <MyPage />;
    if (isMyActivity) return <MyActivity />;
    if (isCreateTeam) return <CreateTeam />;
    if (isNotifications) return <NotificationsPage />;

    // 공통 레이아웃
    return (
        <div className="App">
            {!hideHeader && (
                <header className="App-header">
                    <h1>Flowtask</h1>
                </header>
            )}

            <main className={hideHeader ? "no-header" : ""}>
                <Routes>
                    <Route path="/" element={<MainHome />} />
                    <Route path="/home" element={<Home />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/find-id" element={<FindId />} />
                    <Route path="/find-password" element={<FindPassword />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
