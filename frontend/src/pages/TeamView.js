import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { columnlistByTeam, tasklistByTeam } from '../api/boardApi';
import { getTeam, getTeamMembers } from '../api/teamApi';
import { getProfileImageUrl } from '../api/memberApi';
import websocketService from '../api/websocketService';
import Sidebar from '../components/Sidebar';
import OverviewView from './views/OverviewView';
import ListView from './views/ListView';
import BoardView from './views/BoardView';
import TimelineView from './views/TimelineView';
import CalendarView from './views/CalendarView';
import ChatView from './views/ChatView';
import FilesView from './views/FilesView';
import BranchView from './views/BranchView';
import SettingsView from './views/SettingsView';
import './TeamView.css';

// 탭 정의
const TABS = [
    { id: 'overview', label: '개요', icon: '📋' },
    { id: 'list', label: '목록', icon: '☰' },
    { id: 'board', label: '보드', icon: '▦' },
    { id: 'timeline', label: '타임라인', icon: '📊' },
    { id: 'calendar', label: '캘린더', icon: '📅' },
    { id: 'chat', label: '채팅', icon: '💬' },
    { id: 'files', label: '파일', icon: '📁' },
    { id: 'branches', label: '브랜치', icon: '🌿' },
    { id: 'settings', label: '설정', icon: '⚙️', leaderOnly: true }
];

function TeamView() {
    const navigate = useNavigate();
    const { teamId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // 현재 활성 탭 (URL 파라미터에서 가져오거나 기본값 'overview')
    const activeTab = searchParams.get('view') || 'overview';
    // 선택된 Task ID (URL 파라미터에서 가져옴)
    const selectedTaskId = searchParams.get('task') ? parseInt(searchParams.get('task')) : null;

    // 상태 관리
    const [team, setTeam] = useState(null);
    const [columns, setColumns] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loginMember, setLoginMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [memberSidebarOpen, setMemberSidebarOpen] = useState(true);
    const [wsConnected, setWsConnected] = useState(false);
    const [onlineMembers, setOnlineMembers] = useState([]);
    const [filters, setFilters] = useState({
        searchQuery: '',
        priorities: [],
        statuses: [],
        assigneeNo: null,
        dueDateFilter: ''
    });
    const [searchMatchIndex, setSearchMatchIndex] = useState(0); // 현재 검색 매칭 인덱스
    const [lastCommentEvent, setLastCommentEvent] = useState(null);  // 댓글 실시간 업데이트용

    // 자식 뷰 ref (스크롤용)
    const viewRef = useRef(null);

    // 검색어에 매칭되는 태스크 목록
    const searchMatches = useMemo(() => {
        if (!filters.searchQuery) return [];
        const query = filters.searchQuery.toLowerCase();
        return tasks.filter(task => {
            const matchTitle = task.title?.toLowerCase().includes(query);
            const matchDesc = task.description?.toLowerCase().includes(query);
            const matchAssignee = task.assignees?.some(a =>
                a.memberName?.toLowerCase().includes(query)
            );
            return matchTitle || matchDesc || matchAssignee;
        });
    }, [tasks, filters.searchQuery]);

    // 검색어 변경 시 첫 번째 매칭으로 자동 스크롤
    useEffect(() => {
        if (searchMatches.length > 0) {
            setSearchMatchIndex(0);
            // 약간의 딜레이 후 스크롤 (렌더링 완료 대기)
            setTimeout(() => {
                scrollToMatch(0);
            }, 100);
        } else {
            setSearchMatchIndex(0);
        }
    }, [filters.searchQuery]);

    // 특정 매칭으로 스크롤
    const scrollToMatch = (index) => {
        if (searchMatches.length === 0 || index < 0 || index >= searchMatches.length) return;
        const taskId = searchMatches[index].taskId;

        // DOM에서 해당 태스크 요소 찾기
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 하이라이트 효과
            taskElement.classList.add('search-focus');
            setTimeout(() => {
                taskElement.classList.remove('search-focus');
            }, 1500);
        }
    };

    // 이전 매칭으로 이동
    const goToPrevMatch = () => {
        if (searchMatches.length === 0) return;
        const newIndex = searchMatchIndex > 0 ? searchMatchIndex - 1 : searchMatches.length - 1;
        setSearchMatchIndex(newIndex);
        scrollToMatch(newIndex);
    };

    // 다음 매칭으로 이동
    const goToNextMatch = () => {
        if (searchMatches.length === 0) return;
        const newIndex = searchMatchIndex < searchMatches.length - 1 ? searchMatchIndex + 1 : 0;
        setSearchMatchIndex(newIndex);
        scrollToMatch(newIndex);
    };

    // 탭 변경 핸들러
    const handleTabChange = (tabId) => {
        // 탭 변경 시 task 파라미터는 유지하지 않음
        setSearchParams({ view: tabId });
    };

    // 선택된 Task 변경 핸들러 (URL 파라미터 업데이트)
    const handleSelectTask = useCallback((taskId) => {
        const newParams = { view: activeTab };
        if (taskId) {
            newParams.task = taskId.toString();
        }
        setSearchParams(newParams);
    }, [activeTab, setSearchParams]);

    // 로그아웃 핸들러
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        websocketService.disconnect();
        navigate('/login');
    };

    // WebSocket 이벤트 핸들러 (모든 뷰가 공유)
    const handleBoardEvent = useCallback((event) => {
        console.log('TeamView event received:', event);

        switch (event.eventType) {
            // Column 이벤트
            case 'COLUMN_CREATED':
                setColumns(prev => {
                    const exists = prev.some(col => col.columnId === event.payload.columnId);
                    if (exists) return prev;
                    return [...prev, event.payload].sort((a, b) => a.position - b.position);
                });
                break;

            case 'COLUMN_UPDATED':
                setColumns(prev => prev.map(col =>
                    col.columnId === event.payload.columnId ? event.payload : col
                ));
                break;

            case 'COLUMN_DELETED':
                setColumns(prev => prev.filter(col => col.columnId !== event.payload));
                setTasks(prev => prev.filter(task => task.columnId !== event.payload));
                break;

            case 'COLUMN_MOVED':
                setColumns(prev => prev.map(col =>
                    col.columnId === event.payload.columnId ? event.payload : col
                ).sort((a, b) => a.position - b.position));
                break;

            // Task 이벤트
            case 'TASK_CREATED':
                setTasks(prev => {
                    const exists = prev.some(task => task.taskId === event.payload.taskId);
                    if (exists) return prev;
                    return [...prev, event.payload];
                });
                break;

            case 'TASK_UPDATED':
            case 'TASK_DATES_CHANGED':
                setTasks(prev => prev.map(task =>
                    task.taskId === event.payload.taskId ? event.payload : task
                ));
                break;

            case 'TASK_DELETED':
                setTasks(prev => prev.filter(task => task.taskId !== event.payload));
                break;

            case 'TASK_MOVED':
                setTasks(prev => prev.map(task =>
                    task.taskId === event.payload.taskId ? event.payload : task
                ));
                break;

            // Team 이벤트
            case 'TEAM_UPDATED':
                if (event.payload.teamId === parseInt(teamId)) {
                    setTeam(prev => ({ ...prev, ...event.payload }));
                }
                break;

            // Presence 이벤트
            case 'PRESENCE_UPDATE':
                setOnlineMembers(Array.isArray(event.payload) ? event.payload : []);
                break;

            // Comment 이벤트 (GitHub → Synodos 동기화 등)
            case 'COMMENT_CREATED':
            case 'COMMENT_UPDATED':
            case 'COMMENT_DELETED':
                // 댓글 이벤트 발생 시 lastCommentEvent 업데이트
                setLastCommentEvent({ ...event, timestamp: Date.now() });
                break;

            default:
                console.log('Unhandled event type:', event.eventType);
        }
    }, [teamId]);

    // 로그인 확인
    useEffect(() => {
        const token = localStorage.getItem('token');
        const member = localStorage.getItem('member');
        if (!token || !member) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        setLoginMember(JSON.parse(member));
    }, [navigate]);

    // WebSocket 연결
    useEffect(() => {
        websocketService.connect(
            () => {
                console.log('WebSocket connected in TeamView');
                setWsConnected(true);
            },
            (error) => console.error('WebSocket error:', error)
        );

        return () => {
            websocketService.disconnect();
        };
    }, []);

    // 팀 변경 시 WebSocket 구독
    useEffect(() => {
        if (teamId && wsConnected && loginMember) {
            const tid = parseInt(teamId);
            websocketService.subscribeToTeam(tid, handleBoardEvent);
            // 온라인 상태 알림
            websocketService.joinTeamPresence(tid, loginMember.no);

            return () => {
                websocketService.leaveTeamPresence(tid);
                websocketService.unsubscribeFromTeam(tid);
                setOnlineMembers([]);
            };
        }
    }, [teamId, wsConnected, loginMember, handleBoardEvent]);

    // 데이터 로드
    useEffect(() => {
        if (teamId && loginMember) {
            fetchData();
        }
    }, [teamId, loginMember]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamData, columnsData, tasksData, membersData] = await Promise.all([
                getTeam(teamId),
                columnlistByTeam(teamId),
                tasklistByTeam(teamId),
                getTeamMembers(teamId)
            ]);

            setTeam(teamData);
            setColumns(Array.isArray(columnsData) ? columnsData : []);
            setTasks(Array.isArray(tasksData) ? tasksData : []);
            setTeamMembers(Array.isArray(membersData) ? membersData : []);

            // localStorage에 현재 팀 저장
            if (teamData) {
                localStorage.setItem('currentTeam', JSON.stringify(teamData));
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            if (error.response?.status === 404) {
                alert('팀을 찾을 수 없습니다.');
                localStorage.removeItem('currentTeam');
                navigate('/');
            } else if (error.response?.status === 403) {
                alert('해당 팀에 접근 권한이 없습니다. 팀에서 퇴출되었을 수 있습니다.');
                localStorage.removeItem('currentTeam');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    // Tasks 업데이트 헬퍼 (자식 컴포넌트에서 사용)
    const updateTask = useCallback((updatedTask) => {
        setTasks(prev => prev.map(task =>
            task.taskId === updatedTask.taskId ? { ...task, ...updatedTask } : task
        ));
    }, []);

    const addTask = useCallback((newTask) => {
        setTasks(prev => [...prev, newTask]);
    }, []);

    const removeTask = useCallback((taskId) => {
        setTasks(prev => prev.filter(task => task.taskId !== taskId));
    }, []);

    // Columns 업데이트 헬퍼
    const updateColumn = useCallback((updatedColumn) => {
        setColumns(prev => prev.map(col =>
            col.columnId === updatedColumn.columnId ? { ...col, ...updatedColumn } : col
        ));
    }, []);

    const addColumn = useCallback((newColumn) => {
        setColumns(prev => [...prev, newColumn].sort((a, b) => a.position - b.position));
    }, []);

    const removeColumn = useCallback((columnId) => {
        setColumns(prev => prev.filter(col => col.columnId !== columnId));
        setTasks(prev => prev.filter(task => task.columnId !== columnId));
    }, []);

    // Team 업데이트 헬퍼
    const updateTeam = useCallback((updatedTeam) => {
        setTeam(prev => ({ ...prev, ...updatedTeam }));
        localStorage.setItem('currentTeam', JSON.stringify({ ...team, ...updatedTeam }));
    }, [team]);

    // 사이드바에서 팀 선택 시
    const handleSelectTeam = (selectedTeam) => {
        navigate(`/team/${selectedTeam.teamId}?view=${activeTab}`);
    };

    // 리더 여부 확인
    const isLeader = team?.leaderNo === loginMember?.no;

    // 공통 props (자식 뷰에 전달)
    const viewProps = {
        team,
        columns,
        tasks,
        teamMembers,
        loginMember,
        isLeader,
        wsConnected,
        filters,
        // 업데이트 헬퍼
        updateTask,
        addTask,
        removeTask,
        updateColumn,
        addColumn,
        removeColumn,
        updateTeam,
        // 데이터 리로드
        refreshData: fetchData,
        // 현재 탭
        activeTab,
        // 선택된 Task (URL 기반)
        selectedTaskId,
        onSelectTask: handleSelectTask,
        // 댓글 실시간 업데이트
        lastCommentEvent
    };

    // 현재 탭에 해당하는 뷰 렌더링
    const renderActiveView = () => {
        if (loading) {
            return (
                <div className="team-loading">
                    <div className="loading-spinner"></div>
                    <p>로딩 중...</p>
                </div>
            );
        }

        if (!team) {
            return (
                <div className="team-not-found">
                    <h2>팀을 찾을 수 없습니다</h2>
                    <p>팀이 삭제되었거나 접근 권한이 없습니다.</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return <OverviewView {...viewProps} />;
            case 'list':
                return <ListView {...viewProps} />;
            case 'board':
                return <BoardView {...viewProps} />;
            case 'timeline':
                return <TimelineView {...viewProps} />;
            case 'calendar':
                return <CalendarView {...viewProps} />;
            case 'chat':
                return <ChatView {...viewProps} />;
            case 'files':
                return <FilesView {...viewProps} />;
            case 'branches':
                return <BranchView {...viewProps} />;
            case 'settings':
                return <SettingsView {...viewProps} />;
            default:
                return <OverviewView {...viewProps} />;
        }
    };

    return (
        <div className="team-view-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={team}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`team-view-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* 통합 헤더: 팀명, 탭, 검색, 로그아웃 */}
                <header className="team-header">
                    <div className="team-header-left">
                        <h1 className="team-name">{team?.teamName || 'Synodos'}</h1>
                        {team && (
                            <div className="header-tabs">
                                {TABS.map(tab => {
                                    if (tab.leaderOnly && !isLeader) return null;
                                    return (
                                        <button
                                            key={tab.id}
                                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                            onClick={() => handleTabChange(tab.id)}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="team-header-right">
                        {team && ['list', 'board', 'timeline', 'calendar', 'branches'].includes(activeTab) && (
                            <div className="search-wrapper">
                                <div className="header-search">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="검색..."
                                        value={filters.searchQuery || ''}
                                        onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                                    />
                                    {filters.searchQuery && (
                                        <button
                                            className="search-clear-btn"
                                            onClick={() => setFilters({ ...filters, searchQuery: '' })}
                                            title="검색 초기화"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {/* 검색 결과 네비게이션 */}
                                {filters.searchQuery && (
                                    <div className="search-nav">
                                        <span className="search-count">
                                            {searchMatches.length > 0
                                                ? `${searchMatchIndex + 1}/${searchMatches.length}`
                                                : '0개'
                                            }
                                        </span>
                                        <button
                                            className="search-nav-btn"
                                            onClick={goToPrevMatch}
                                            disabled={searchMatches.length === 0}
                                            title="이전 결과"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="18 15 12 9 6 15" />
                                            </svg>
                                        </button>
                                        <button
                                            className="search-nav-btn"
                                            onClick={goToNextMatch}
                                            disabled={searchMatches.length === 0}
                                            title="다음 결과"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                {/* 메인 영역: 뷰 + 멤버 사이드바 */}
                <div className="team-view-main">
                    {/* 뷰 컨텐츠 */}
                    <div className="team-view-content">
                        {renderActiveView()}
                    </div>

                    {/* 멤버 사이드바 */}
                    {team && (
                        <aside className={`member-sidebar ${memberSidebarOpen ? 'open' : 'collapsed'}`}>
                            <div className="member-sidebar-header">
                                <button
                                    className="member-sidebar-toggle"
                                    onClick={() => setMemberSidebarOpen(!memberSidebarOpen)}
                                    title={memberSidebarOpen ? '멤버 패널 접기' : '멤버 패널 펼치기'}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {memberSidebarOpen ? (
                                            <polyline points="15 18 9 12 15 6" />
                                        ) : (
                                            <polyline points="9 18 15 12 9 6" />
                                        )}
                                    </svg>
                                </button>
                                {memberSidebarOpen && (
                                    <>
                                        <span>멤버</span>
                                        <span className="member-count">{teamMembers.length}</span>
                                    </>
                                )}
                            </div>
                            {memberSidebarOpen ? (
                            <div className="member-list">
                                {/* 온라인 멤버 */}
                                {teamMembers.filter(m => onlineMembers.includes(m.memberNo)).length > 0 && (
                                    <div className="member-section">
                                        <div className="member-section-title">
                                            <span className="online-indicator"></span>
                                            온라인 — {teamMembers.filter(m => onlineMembers.includes(m.memberNo)).length}
                                        </div>
                                        {teamMembers
                                            .filter(m => onlineMembers.includes(m.memberNo))
                                            .sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0))
                                            .map(member => (
                                            <div key={member.memberNo} className={`member-item ${member.role === 'LEADER' ? 'leader' : ''}`}>
                                                <div className="member-avatar">
                                                    {member.profileImage ? (
                                                        <img src={getProfileImageUrl(member.memberNo)} alt="" className="member-avatar-img" />
                                                    ) : (
                                                        member.memberName?.charAt(0) || 'U'
                                                    )}
                                                    <span className="status-dot online"></span>
                                                </div>
                                                <div className="member-info">
                                                    <span className="member-name">
                                                        {member.memberName}
                                                        {member.role === 'LEADER' && <span className="member-role">팀장</span>}
                                                    </span>
                                                    <span className="member-userid">{member.memberUserid}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* 오프라인 멤버 */}
                                {teamMembers.filter(m => !onlineMembers.includes(m.memberNo)).length > 0 && (
                                    <div className="member-section">
                                        <div className="member-section-title">
                                            오프라인 — {teamMembers.filter(m => !onlineMembers.includes(m.memberNo)).length}
                                        </div>
                                        {teamMembers
                                            .filter(m => !onlineMembers.includes(m.memberNo))
                                            .sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0))
                                            .map(member => (
                                            <div key={member.memberNo} className={`member-item offline ${member.role === 'LEADER' ? 'leader' : ''}`}>
                                                <div className="member-avatar">
                                                    {member.profileImage ? (
                                                        <img src={getProfileImageUrl(member.memberNo)} alt="" className="member-avatar-img" />
                                                    ) : (
                                                        member.memberName?.charAt(0) || 'U'
                                                    )}
                                                    <span className="status-dot"></span>
                                                </div>
                                                <div className="member-info">
                                                    <span className="member-name">
                                                        {member.memberName}
                                                        {member.role === 'LEADER' && <span className="member-role">팀장</span>}
                                                    </span>
                                                    <span className="member-userid">{member.memberUserid}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            ) : (
                            <div className="member-list-collapsed">
                                {teamMembers
                                    .sort((a, b) => {
                                        // 온라인 먼저, 그 다음 리더 먼저
                                        const aOnline = onlineMembers.includes(a.memberNo) ? 1 : 0;
                                        const bOnline = onlineMembers.includes(b.memberNo) ? 1 : 0;
                                        if (aOnline !== bOnline) return bOnline - aOnline;
                                        return a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0;
                                    })
                                    .map(member => (
                                    <div
                                        key={member.memberNo}
                                        className={`member-avatar-collapsed ${member.role === 'LEADER' ? 'leader' : ''}`}
                                        title={`${member.memberName} (${member.memberUserid})`}
                                    >
                                        {member.profileImage ? (
                                            <img src={getProfileImageUrl(member.memberNo)} alt="" className="member-avatar-img" />
                                        ) : (
                                            member.memberName?.charAt(0) || 'U'
                                        )}
                                        <span className={`status-dot ${onlineMembers.includes(member.memberNo) ? 'online' : ''}`}></span>
                                    </div>
                                ))}
                            </div>
                            )}
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TeamView;
