import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import FindId from './pages/FindId';
import FindPassword from './pages/FindPassword';
import TeamView from './pages/TeamView';
import MyPage from './pages/MyPage';
import MyActivity from './pages/MyActivity';
import CreateTeam from './pages/CreateTeam';
import NotificationsPage from './pages/NotificationsPage';
import Invite from './pages/Invite';
import GitHubCallback from './pages/GitHubCallback';
import OAuth2Redirect from './pages/OAuth2Redirect';
import SocialSignupComplete from './pages/SocialSignupComplete';
import Landing from './pages/views/Landing';
import './App.css';

function AppContent() {
  const location = useLocation();
  const pathname = location.pathname;

  // Landing 페이지 (자체 헤더 있음)
  if (pathname === '/') {
    return <Landing />;
  }

  // OAuth 리다이렉트 처리
  if (pathname === '/oauth2/redirect') {
    return <OAuth2Redirect />;
  }

  // 소셜 로그인 추가 정보 입력
  if (pathname === '/social-signup-complete') {
    return <SocialSignupComplete />;
  }

  // GitHub 콜백
  if (pathname === '/github/callback') {
    return <GitHubCallback />;
  }

  // 팀 페이지
  if (pathname.startsWith('/team/')) {
    return (
      <Routes>
        <Route path="/team/:teamId" element={<TeamView />} />
      </Routes>
    );
  }

  // 초대 페이지
  if (pathname.startsWith('/invite/')) {
    return (
      <Routes>
        <Route path="/invite/:teamCode" element={<Invite />} />
      </Routes>
    );
  }

  // 마이페이지
  if (pathname === '/mypage') {
    return <MyPage />;
  }

  // 내 활동
  if (pathname === '/activity') {
    return <MyActivity />;
  }

  // 팀 생성
  if (pathname === '/create-team') {
    return <CreateTeam />;
  }

  // 알림
  if (pathname === '/notifications') {
    return <NotificationsPage />;
  }

  // 헤더 숨김 페이지들
  const hideHeader = ['/login', '/register', '/find-id', '/find-password'].includes(pathname);

  return (
    <div className="App">
      {!hideHeader && (
        <header className="App-header">
          <h1>Synodos</h1>
        </header>
      )}
      <main className={hideHeader ? 'no-header' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
