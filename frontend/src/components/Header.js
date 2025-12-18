import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import './Header.css';

function Header({
    title,
    loginMember,
    leftContent,
    centerContent,
    rightContent,
    onLogout,
    className = ''
}) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        if (onLogout) {
            onLogout();
        }
        navigate('/login');
    };

    return (
        <header className={`common-header ${className}`}>
            <div className="header-left">
                {leftContent || <h1>{title}</h1>}
            </div>

            {centerContent && (
                <div className="header-center">
                    {centerContent}
                </div>
            )}

            <div className="header-right">
                {rightContent}
                {loginMember && <NotificationBell memberNo={loginMember.no} />}
                <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
            </div>
        </header>
    );
}

export default Header;
