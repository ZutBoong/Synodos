import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasklistByDateRange } from '../api/boardApi';
import Sidebar from '../components/Sidebar';
import TaskModal from '../components/TaskModal';
import NotificationBell from '../components/NotificationBell';
import './Calendar.css';

// 요일 이름
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function Calendar() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loginMember, setLoginMember] = useState(null);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

    // 로그인 정보 확인
    useEffect(() => {
        const token = localStorage.getItem('token');
        const member = localStorage.getItem('member');
        if (!token || !member) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        setLoginMember(JSON.parse(member));

        // 저장된 팀 정보 불러오기
        const savedTeam = localStorage.getItem('currentTeam');
        if (savedTeam) {
            setCurrentTeam(JSON.parse(savedTeam));
        }
    }, [navigate]);

    // 팀 변경 또는 날짜 변경 시 데이터 로드
    useEffect(() => {
        if (currentTeam) {
            fetchTasks();
        }
    }, [currentTeam, currentDate, viewMode]);

    const fetchTasks = async () => {
        if (!currentTeam) return;

        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();
            const data = await tasklistByDateRange(
                currentTeam.teamId,
                formatDateForApi(startDate),
                formatDateForApi(endDate)
            );
            setTasks(data || []);
        } catch (error) {
            console.error('캘린더 데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateForApi = (date) => {
        return date.toISOString().split('T')[0];
    };

    const getDateRange = () => {
        if (viewMode === 'week') {
            const start = new Date(currentDate);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return { startDate: start, endDate: end };
        } else {
            // 월간: 해당 월의 시작일과 종료일 (캘린더에 표시되는 범위)
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            start.setDate(start.getDate() - start.getDay()); // 첫째 주 일요일
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            end.setDate(end.getDate() + (6 - end.getDay())); // 마지막 주 토요일
            return { startDate: start, endDate: end };
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', JSON.stringify(team));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        navigate('/');
    };

    // 이전/다음 네비게이션
    const goToPrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const goToNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // 캘린더 그리드 생성
    const generateCalendarDays = () => {
        const days = [];
        const { startDate, endDate } = getDateRange();
        const current = new Date(startDate);

        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    // 특정 날짜의 태스크 가져오기
    const getTasksForDate = (date) => {
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === date.toDateString();
        });
    };

    // 날짜 포맷
    const formatMonthYear = () => {
        return currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long'
        });
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isCurrentMonth = (date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const calendarDays = generateCalendarDays();

    return (
        <div className="calendar-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={currentTeam}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`calendar-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* 헤더 */}
                <header className="calendar-header">
                    <div className="header-left">
                        <button className="nav-btn" onClick={goToPrevious}>&lt;</button>
                        <h1>{formatMonthYear()}</h1>
                        <button className="nav-btn" onClick={goToNext}>&gt;</button>
                        <button className="today-btn" onClick={goToToday}>오늘</button>
                    </div>
                    <div className="header-center">
                        {currentTeam && (
                            <span className="team-name">{currentTeam.teamName}</span>
                        )}
                    </div>
                    <div className="header-right">
                        <div className="view-toggle">
                            <button
                                className={viewMode === 'month' ? 'active' : ''}
                                onClick={() => setViewMode('month')}
                            >
                                월간
                            </button>
                            <button
                                className={viewMode === 'week' ? 'active' : ''}
                                onClick={() => setViewMode('week')}
                            >
                                주간
                            </button>
                        </div>
                        {loginMember && <NotificationBell memberNo={loginMember.no} />}
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                {/* 캘린더 콘텐츠 */}
                <div className="calendar-content">
                    {!currentTeam ? (
                        <div className="no-team-selected">
                            <h2>팀을 선택하세요</h2>
                            <p>왼쪽 사이드바에서 팀을 선택하세요.</p>
                        </div>
                    ) : loading ? (
                        <div className="calendar-loading">
                            <p>로딩 중...</p>
                        </div>
                    ) : (
                        <div className={`calendar-grid ${viewMode}`}>
                            {/* 요일 헤더 */}
                            <div className="calendar-weekdays">
                                {WEEKDAYS.map(day => (
                                    <div key={day} className="weekday">{day}</div>
                                ))}
                            </div>

                            {/* 날짜 그리드 */}
                            <div className="calendar-days">
                                {calendarDays.map((date, index) => {
                                    const dayTasks = getTasksForDate(date);
                                    const isCurrentMonthDay = isCurrentMonth(date);

                                    return (
                                        <div
                                            key={index}
                                            className={`calendar-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonthDay ? 'other-month' : ''}`}
                                        >
                                            <div className="day-header">
                                                <span className="day-number">{date.getDate()}</span>
                                            </div>
                                            <div className="day-tasks">
                                                {dayTasks.slice(0, 3).map(task => (
                                                    <div
                                                        key={task.taskId}
                                                        className="task-item"
                                                        onClick={() => setSelectedTask(task)}
                                                        title={`${task.title}${task.dueDate ? ' - ' + new Date(task.dueDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}`}
                                                    >
                                                        {task.title}
                                                    </div>
                                                ))}
                                                {dayTasks.length > 3 && (
                                                    <div className="more-tasks">
                                                        +{dayTasks.length - 3}개 더
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 태스크 상세 모달 */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    teamId={currentTeam?.teamId}
                    loginMember={loginMember}
                    onClose={() => setSelectedTask(null)}
                    onSave={() => {
                        fetchTasks();
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
}

export default Calendar;
