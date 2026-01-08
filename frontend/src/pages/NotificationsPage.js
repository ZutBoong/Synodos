import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
} from '../api/notificationApi';
import Sidebar from '../components/Sidebar';
import ShaderBackground from '../components/landing/shader-background';
import './NotificationsPage.css';

function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loginMember, setLoginMember] = useState(null);
    const [filter, setFilter] = useState('all'); // all, unread

    useEffect(() => {
        const storedMember = localStorage.getItem('member');
        if (!storedMember) {
            navigate('/login');
            return;
        }

        const memberData = JSON.parse(storedMember);
        setLoginMember(memberData);
        fetchNotifications(memberData.no);

        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
            setCurrentTeam(JSON.parse(storedTeam));
        }
    }, [navigate]);

    const fetchNotifications = async (memberNo) => {
        try {
            setLoading(true);
            const data = await getNotifications(memberNo, 100);
            setNotifications(data || []);
        } catch (error) {
            console.error('알림 목록 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', JSON.stringify(team));
        navigate(`/team/${team.teamId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        navigate('/login');
    };

    const handleSelectNotification = async (notification) => {
        setSelectedNotification(notification);
        // 읽음 처리
        if (!notification.isRead) {
            await handleMarkAsRead(notification.notificationId);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
            );
            if (selectedNotification?.notificationId === notificationId) {
                setSelectedNotification(prev => ({ ...prev, isRead: true }));
            }
            // 사이드바 알림 배지 갱신
            window.dispatchEvent(new CustomEvent('notificationRead'));
        } catch (error) {
            console.error('읽음 처리 실패:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead(loginMember.no);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            if (selectedNotification) {
                setSelectedNotification(prev => ({ ...prev, isRead: true }));
            }
            // 사이드바 알림 배지 갱신
            window.dispatchEvent(new CustomEvent('notificationRead'));
        } catch (error) {
            console.error('모두 읽음 처리 실패:', error);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
            if (selectedNotification?.notificationId === notificationId) {
                setSelectedNotification(null);
            }
            // 사이드바 알림 배지 갱신
            window.dispatchEvent(new CustomEvent('notificationRead'));
        } catch (error) {
            console.error('알림 삭제 실패:', error);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('모든 알림을 삭제하시겠습니까?')) return;
        try {
            await deleteAllNotifications(loginMember.no);
            setNotifications([]);
            setSelectedNotification(null);
            // 사이드바 알림 배지 갱신
            window.dispatchEvent(new CustomEvent('notificationRead'));
        } catch (error) {
            console.error('모든 알림 삭제 실패:', error);
        }
    };

    const handleGoToTask = () => {
        if (selectedNotification?.taskId && selectedNotification?.teamId) {
            navigate(`/team/${selectedNotification.teamId}?view=board`);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            // 팀 관련
            case 'TEAM_INVITE':
                return '👥';
            // 담당자/검수자 배정
            case 'TASK_ASSIGNEE':
                return '📋';
            case 'TASK_VERIFIER':
                return '🔍';
            // 워크플로우
            case 'TASK_REVIEW':
                return '✅';
            case 'TASK_APPROVED':
                return '✓';
            case 'TASK_REJECTED':
                return '❌';
            case 'TASK_ACCEPTED':
                return '👍';
            case 'TASK_DECLINED':
                return '👎';
            // 댓글/멘션
            case 'COMMENT_ADDED':
                return '💬';
            case 'MENTION':
                return '@';
            // 마감일
            case 'DEADLINE_APPROACHING':
                return '⏰';
            case 'DEADLINE_OVERDUE':
                return '🚨';
            // 기타
            case 'COLUMN_UPDATED':
                return '📝';
            case 'TASK_UPDATED':
                return '🔄';
            case 'COMMIT_LINKED':
                return '🔗';
            default:
                return '🔔';
        }
    };

    const getNotificationTypeLabel = (type) => {
        switch (type) {
            // 팀 관련
            case 'TEAM_INVITE':
                return '팀 초대';
            // 담당자/검수자 배정
            case 'TASK_ASSIGNEE':
                return '작업 배정';
            case 'TASK_VERIFIER':
                return '검수자 배정';
            // 워크플로우
            case 'TASK_REVIEW':
                return '검수 요청';
            case 'TASK_APPROVED':
                return '작업 승인';
            case 'TASK_REJECTED':
                return '작업 반려';
            case 'TASK_ACCEPTED':
                return '작업 수락';
            case 'TASK_DECLINED':
                return '작업 거절';
            // 댓글/멘션
            case 'COMMENT_ADDED':
                return '댓글';
            case 'MENTION':
                return '멘션';
            // 마감일
            case 'DEADLINE_APPROACHING':
                return '마감 임박';
            case 'DEADLINE_OVERDUE':
                return '마감 초과';
            // 기타
            case 'COLUMN_UPDATED':
                return '컬럼 변경';
            case 'TASK_UPDATED':
                return '작업 변경';
            case 'COMMIT_LINKED':
                return '커밋 연결';
            default:
                return '알림';
        }
    };

    const getNotificationDescription = (type) => {
        switch (type) {
            // 팀 관련
            case 'TEAM_INVITE':
                return '새로운 팀에 초대되었습니다.';
            // 담당자/검수자 배정
            case 'TASK_ASSIGNEE':
                return '새로운 작업이 배정되었습니다. 작업 내용을 확인하고 진행해주세요.';
            case 'TASK_VERIFIER':
                return '작업 검수자로 배정되었습니다.';
            // 워크플로우
            case 'TASK_REVIEW':
                return '작업 검수가 요청되었습니다. 작업 결과를 확인하고 승인 또는 반려해주세요.';
            case 'TASK_APPROVED':
                return '작업이 승인되었습니다.';
            case 'TASK_REJECTED':
                return '작업이 반려되었습니다. 피드백을 확인하고 수정해주세요.';
            case 'TASK_ACCEPTED':
                return '담당자가 작업을 수락했습니다.';
            case 'TASK_DECLINED':
                return '담당자가 작업을 거절했습니다.';
            // 댓글/멘션
            case 'COMMENT_ADDED':
                return '작업에 새로운 댓글이 달렸습니다.';
            case 'MENTION':
                return '댓글에서 회원님을 멘션했습니다.';
            // 마감일
            case 'DEADLINE_APPROACHING':
                return '작업 마감일이 임박했습니다.';
            case 'DEADLINE_OVERDUE':
                return '작업 마감일이 지났습니다. 확인해주세요.';
            // 기타
            case 'COLUMN_UPDATED':
                return '컬럼이 변경되었습니다.';
            case 'TASK_UPDATED':
                return '작업이 변경되었습니다.';
            case 'COMMIT_LINKED':
                return 'GitHub 커밋이 작업에 연결되었습니다.';
            default:
                return '새로운 알림이 있습니다.';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return date.toLocaleDateString('ko-KR');
    };

    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <ShaderBackground>
            <div className="notifications-page">
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    currentTeam={currentTeam}
                    onSelectTeam={handleSelectTeam}
                    loginMember={loginMember}
                />

                <div className={`notifications-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <header className="notifications-header">
                    <div className="notifications-header-left">
                        <h1 className="notifications-title">알림함</h1>
                        {unreadCount > 0 && (
                            <span className="unread-count-badge">{unreadCount}개의 읽지 않은 알림</span>
                        )}
                    </div>
                    <div className="notifications-header-right">
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                <div className="notifications-main">
                    <div className="notifications-split-view">
                        {/* 왼쪽: 알림 목록 */}
                        <div className="notifications-list-panel">
                            {/* 필터 및 액션 바 */}
                            <div className="notifications-toolbar">
                                <div className="filter-tabs">
                                    <button
                                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                                        onClick={() => setFilter('all')}
                                    >
                                        전체 ({notifications.length})
                                    </button>
                                    <button
                                        className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                                        onClick={() => setFilter('unread')}
                                    >
                                        읽지 않음 ({unreadCount})
                                    </button>
                                </div>
                                <div className="toolbar-actions">
                                    {unreadCount > 0 && (
                                        <button className="toolbar-btn" onClick={handleMarkAllAsRead} title="모두 읽음">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button className="toolbar-btn danger" onClick={handleDeleteAll} title="모두 삭제">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 알림 목록 */}
                            <div className="notifications-list">
                                {loading ? (
                                    <div className="notifications-loading">
                                        <div className="loading-spinner"></div>
                                        <p>알림을 불러오는 중...</p>
                                    </div>
                                ) : filteredNotifications.length === 0 ? (
                                    <div className="notifications-empty">
                                        <i className="fa-regular fa-bell empty-icon"></i>
                                        <p>{filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}</p>
                                    </div>
                                ) : (
                                    filteredNotifications.map(notification => (
                                        <div
                                            key={notification.notificationId}
                                            className={`notification-list-item ${!notification.isRead ? 'unread' : ''} ${selectedNotification?.notificationId === notification.notificationId ? 'selected' : ''}`}
                                            onClick={() => handleSelectNotification(notification)}
                                        >
                                            <div className="notification-list-icon">
                                                {getNotificationIcon(notification.notificationType)}
                                            </div>
                                            <div className="notification-list-content">
                                                <div className="notification-list-header">
                                                    <span className="notification-list-type">
                                                        {getNotificationTypeLabel(notification.notificationType)}
                                                    </span>
                                                    <span className="notification-list-time">
                                                        {formatDate(notification.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="notification-list-message">{notification.message}</p>
                                            </div>
                                            {!notification.isRead && <div className="unread-dot"></div>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 오른쪽: 상세 정보 */}
                        <div className="notifications-detail-panel">
                            {selectedNotification ? (
                                <div className="notification-detail">
                                    <div className="detail-header">
                                        <div className="detail-icon">
                                            {getNotificationIcon(selectedNotification.notificationType)}
                                        </div>
                                        <div className="detail-meta">
                                            <span className="detail-type">
                                                {getNotificationTypeLabel(selectedNotification.notificationType)}
                                            </span>
                                            <span className="detail-time">
                                                {formatFullDate(selectedNotification.createdAt)}
                                            </span>
                                        </div>
                                        <div className="detail-actions">
                                            <button
                                                className="detail-action-btn"
                                                onClick={() => handleDelete(selectedNotification.notificationId)}
                                                title="삭제"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="detail-body">
                                        <h2 className="detail-title">{selectedNotification.message}</h2>
                                        <p className="detail-description">
                                            {getNotificationDescription(selectedNotification.notificationType)}
                                        </p>

                                        {selectedNotification.taskTitle && (
                                            <div className="detail-task-info">
                                                <div className="task-info-label">관련 작업</div>
                                                <div className="task-info-card">
                                                    <span className="task-icon">📋</span>
                                                    <span className="task-title">{selectedNotification.taskTitle}</span>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNotification.senderName && (
                                            <div className="detail-sender-info">
                                                <div className="sender-info-label">보낸 사람</div>
                                                <div className="sender-info-card">
                                                    <div className="sender-avatar">
                                                        {selectedNotification.senderName.charAt(0)}
                                                    </div>
                                                    <span className="sender-name">{selectedNotification.senderName}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="detail-footer">
                                        {selectedNotification.taskId && selectedNotification.teamId && (
                                            <button className="go-to-task-btn" onClick={handleGoToTask}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15 3 21 3 21 9" />
                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                                작업으로 이동
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="notification-detail-empty">
                                    <i className="fa-solid fa-box empty-detail-icon"></i>
                                    <h3>알림을 선택하세요</h3>
                                    <p>왼쪽 목록에서 알림을 선택하면<br />상세 내용을 확인할 수 있습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </ShaderBackground>
    );
}

export default NotificationsPage;
