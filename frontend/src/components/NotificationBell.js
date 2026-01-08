import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
} from '../api/notificationApi';
import websocketService from '../api/websocketService';
import './NotificationBell.css';

function NotificationBell({ memberNo }) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const subscribedRef = useRef(false);

    // 실시간 알림 수신 핸들러
    const handleRealtimeNotification = useCallback((notification) => {
        // 알림 목록 상단에 추가
        setNotifications(prev => [notification, ...prev]);
        // 읽지 않은 알림 수 증가
        setUnreadCount(prev => prev + 1);
    }, []);

    // WebSocket 구독 설정
    useEffect(() => {
        if (!memberNo) return;

        const setupSubscription = () => {
            if (websocketService.isConnected() && !subscribedRef.current) {
                websocketService.subscribeToUserNotifications(memberNo, handleRealtimeNotification);
                subscribedRef.current = true;
            }
        };

        // 이미 연결되어 있으면 바로 구독
        if (websocketService.isConnected()) {
            setupSubscription();
        }

        // 연결 상태 체크 (WebSocket이 나중에 연결될 경우를 대비)
        const checkConnection = setInterval(() => {
            if (websocketService.isConnected() && !subscribedRef.current) {
                setupSubscription();
            }
        }, 1000);

        return () => {
            clearInterval(checkConnection);
            if (subscribedRef.current) {
                websocketService.unsubscribeFromUserNotifications(memberNo);
                subscribedRef.current = false;
            }
        };
    }, [memberNo, handleRealtimeNotification]);

    // 초기 읽지 않은 알림 수 가져오기
    useEffect(() => {
        if (memberNo) {
            fetchUnreadCount();
        }
    }, [memberNo]);

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadCount(memberNo);
            setUnreadCount(count);
        } catch (error) {
            // Error handled silently
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getNotifications(memberNo);
            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleBellClick = () => {
        if (!isOpen) {
            fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    const handleMarkAsRead = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await markAsRead(notificationId);
            setNotifications(notifications.map(n =>
                n.notificationId === notificationId ? { ...n, isRead: true } : n
            ));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (error) {
            // Error handled silently
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead(memberNo);
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            // Error handled silently
        }
    };

    const handleDelete = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await deleteNotification(notificationId);
            const deletedNotif = notifications.find(n => n.notificationId === notificationId);
            setNotifications(notifications.filter(n => n.notificationId !== notificationId));
            if (deletedNotif && !deletedNotif.isRead) {
                setUnreadCount(Math.max(0, unreadCount - 1));
            }
        } catch (error) {
            // Error handled silently
        }
    };

    const handleDeleteAll = async () => {
        if (window.confirm('모든 알림을 삭제하시겠습니까?')) {
            try {
                await deleteAllNotifications(memberNo);
                setNotifications([]);
                setUnreadCount(0);
            } catch (error) {
                // Error handled silently
            }
        }
    };

    // 이동 가능한 알림 타입인지 확인
    const isNavigable = (notification) => {
        const { notificationType, teamId, taskId } = notification;

        // 태스크 관련 알림: teamId와 taskId 필요
        const taskTypes = [
            'TASK_ASSIGNEE', 'TASK_VERIFIER',
            'TASK_REVIEW', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_ACCEPTED', 'TASK_DECLINED',
            'COMMENT_ADDED', 'MENTION',
            'DEADLINE_APPROACHING', 'DEADLINE_OVERDUE',
            'COMMIT_LINKED'
        ];
        if (taskTypes.includes(notificationType) && teamId && taskId) {
            return true;
        }

        // 팀 초대: teamId만 필요
        if (notificationType === 'TEAM_INVITE' && teamId) {
            return true;
        }

        return false;
    };

    // 알림 클릭 시 이동 처리
    const handleNotificationClick = async (notification) => {
        const { notificationId, notificationType, teamId, taskId, isRead } = notification;

        // 읽음 처리
        if (!isRead) {
            try {
                await markAsRead(notificationId);
                setNotifications(notifications.map(n =>
                    n.notificationId === notificationId ? { ...n, isRead: true } : n
                ));
                setUnreadCount(Math.max(0, unreadCount - 1));
            } catch (error) {
                // Error handled silently
            }
        }

        // 이동 가능한 알림이면 해당 페이지로 이동
        if (isNavigable(notification)) {
            setIsOpen(false); // 드롭다운 닫기

            if (notificationType === 'TEAM_INVITE') {
                // 팀 초대: 팀 페이지로 이동
                navigate(`/team/${teamId}`);
            } else if (taskId && teamId) {
                // 태스크 관련: 보드 뷰에서 태스크 열기
                navigate(`/team/${teamId}?view=board&task=${taskId}`);
            }
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

    const formatTime = (dateString) => {
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

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button className="bell-button" onClick={handleBellClick}>
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>알림</h3>
                        <div className="header-actions">
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllAsRead} className="action-btn">
                                    모두 읽음
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={handleDeleteAll} className="action-btn delete">
                                    모두 삭제
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">로딩 중...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">알림이 없습니다.</div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.notificationId}
                                    className={`notification-item ${!notification.isRead ? 'unread' : ''} ${isNavigable(notification) ? 'clickable' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <span className="notification-icon">
                                        {getNotificationIcon(notification.notificationType)}
                                    </span>
                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        <div className="notification-meta">
                                            {notification.senderName && (
                                                <span className="sender">{notification.senderName}</span>
                                            )}
                                            <span className="time">{formatTime(notification.createdAt)}</span>
                                        </div>
                                    </div>
                                    {isNavigable(notification) && (
                                        <span className="navigate-icon" title="이동">
                                            →
                                        </span>
                                    )}
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => handleDelete(notification.notificationId, e)}
                                        title="삭제"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
