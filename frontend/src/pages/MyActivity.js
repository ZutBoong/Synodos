import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams } from '../api/teamApi';
import { getColumnArchives } from '../api/columnApi';
import { tasklistByAssignee } from '../api/boardApi';
import Sidebar from '../components/Sidebar';
import './MyActivity.css';

function MyActivity() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [archives, setArchives] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loginMember, setLoginMember] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        const storedMember = localStorage.getItem('member');
        if (!storedMember) {
            navigate('/login');
            return;
        }

        const memberData = JSON.parse(storedMember);
        setLoginMember(memberData);
        fetchData(memberData.no);

        // 저장된 현재 팀 불러오기
        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
            setCurrentTeam(JSON.parse(storedTeam));
        }
    }, [navigate]);

    const fetchData = async (memberNo) => {
        try {
            setLoading(true);
            const [teamsRes, archivesRes, tasksRes] = await Promise.all([
                getMyTeams(memberNo),
                getColumnArchives(memberNo).catch(() => []),
                tasklistByAssignee(memberNo).catch(() => [])
            ]);

            setTeams(teamsRes || []);
            setArchives(archivesRes || []);
            setMyTasks(tasksRes || []);
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', JSON.stringify(team));
    };

    // 캘린더 관련 함수
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days = [];

        // 이전 달 날짜 채우기
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // 현재 달 날짜
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const getTasksForDate = (day) => {
        if (!day) return [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const dateStr = new Date(year, month, day).toDateString();

        return myTasks.filter(task => {
            if (!task.dueDate) return false;
            return new Date(task.dueDate).toDateString() === dateStr;
        });
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    return (
        <div className="myactivity-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={currentTeam}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`myactivity-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* 통합 헤더 */}
                <header className="team-header">
                    <div className="team-header-left">
                        <h1 className="team-name">내 활동</h1>
                    </div>
                    <div className="team-header-right">
                        <button className="logout-btn" onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('member');
                            localStorage.removeItem('currentTeam');
                            navigate('/login');
                        }}>로그아웃</button>
                    </div>
                </header>

                {/* 메인 콘텐츠 */}
                <div className="myactivity-content">
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>로딩 중...</p>
                        </div>
                    ) : (
                        <div className="activity-view">
                            {/* 상단: 캘린더 (전체 너비) */}
                            <div className="activity-top-section">
                                <div className="activity-section calendar-section">
                                    <div className="section-header">
                                        <h2>내 일정</h2>
                                        <div className="calendar-nav">
                                            <button onClick={prevMonth}>‹</button>
                                            <span className="calendar-month">
                                                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                                            </span>
                                            <button onClick={nextMonth}>›</button>
                                        </div>
                                    </div>
                                    <div className="calendar-view">
                                        <div className="calendar-weekdays">
                                            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                                                <div key={day} className="calendar-weekday">{day}</div>
                                            ))}
                                        </div>
                                        <div className="calendar-days">
                                            {getDaysInMonth(currentMonth).map((day, index) => {
                                                const dayTasks = getTasksForDate(day);
                                                const isToday = day &&
                                                    new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                                                    >
                                                        {day && (
                                                            <>
                                                                <span className="day-number">{day}</span>
                                                                {dayTasks.length > 0 && (
                                                                    <div className="day-tasks">
                                                                        {dayTasks.slice(0, 2).map(task => (
                                                                            <div key={task.taskId} className="day-task" title={task.title}>
                                                                                {task.title}
                                                                            </div>
                                                                        ))}
                                                                        {dayTasks.length > 2 && (
                                                                            <div className="day-task-more">+{dayTasks.length - 2}</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 하단: 좌측(참여 팀), 우측(아카이브) */}
                            <div className="activity-bottom-row">
                                {/* 참여 중인 팀 목록 */}
                                <div className="activity-section teams-section">
                                    <div className="section-header">
                                        <h2>참여 중인 팀</h2>
                                        <span className="count-badge">{teams.length}</span>
                                    </div>
                                    <div className="teams-list">
                                        {teams.length > 0 ? (
                                            teams.map(t => (
                                                <div
                                                    key={t.teamId}
                                                    className={`team-item ${t.teamId === currentTeam?.teamId ? 'active' : ''}`}
                                                    onClick={() => {
                                                        handleSelectTeam(t);
                                                        navigate(`/team/${t.teamId}?view=overview`);
                                                    }}
                                                >
                                                    <div className="team-icon">
                                                        {t.teamName?.charAt(0) || 'T'}
                                                    </div>
                                                    <div className="team-details">
                                                        <span className="team-name">{t.teamName}</span>
                                                        {t.leaderNo === loginMember?.no && (
                                                            <span className="team-badge">리더</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="no-data">참여 중인 팀이 없습니다.</p>
                                        )}
                                    </div>
                                </div>

                                {/* 아카이브된 태스크 */}
                                <div className="activity-section archives-section">
                                    <div className="section-header">
                                        <h2>아카이브</h2>
                                        <span className="count-badge">{archives.length}</span>
                                    </div>
                                    <div className="archives-list">
                                        {archives.length > 0 ? (
                                            archives.slice(0, 10).map(archive => (
                                                <div key={archive.archiveId} className="archive-item">
                                                    <div className="archive-header">
                                                        <span className="archive-title">📦 {archive.columnTitle}</span>
                                                        <span className="archive-date">
                                                            {new Date(archive.archivedAt).toLocaleDateString('ko-KR', {
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    {archive.archiveNote && (
                                                        <p className="archive-note">{archive.archiveNote}</p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="no-data">아카이브된 항목이 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MyActivity;
