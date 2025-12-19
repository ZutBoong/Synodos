import React, { useState, useEffect } from 'react';
import { getTaskFavorites, toggleTaskFavorite } from '../../api/boardApi';
import { useNavigate } from 'react-router-dom';
import TeamHeader from '../../components/TeamHeader';
import './OverviewView.css';

// 상태별 라벨
const STATUS_LABELS = {
    OPEN: '열림',
    IN_PROGRESS: '진행중',
    RESOLVED: '해결됨',
    CLOSED: '닫힘'
};

// 우선순위별 라벨
const PRIORITY_LABELS = {
    LOW: '낮음',
    MEDIUM: '보통',
    HIGH: '높음',
    URGENT: '긴급'
};

function OverviewView({ team, tasks, teamMembers, loginMember, isLeader, updateTeam }) {
    const navigate = useNavigate();
    const [favoriteTasks, setFavoriteTasks] = useState([]);

    // 즐겨찾기한 태스크 로드
    useEffect(() => {
        if (loginMember) {
            loadFavoriteTasks();
        }
    }, [loginMember]);

    const loadFavoriteTasks = async () => {
        try {
            const favorites = await getTaskFavorites(loginMember.no);
            setFavoriteTasks(favorites || []);
        } catch (error) {
            console.error('즐겨찾기 로드 실패:', error);
        }
    };

    // 내가 참여중인 태스크 (담당자로 지정된 태스크)
    const getMyTasks = () => {
        if (!loginMember) return [];
        return tasks.filter(task =>
            task.assignees && task.assignees.includes(loginMember.no)
        );
    };

    // 즐겨찾기 토글
    const handleToggleFavorite = async (taskId) => {
        try {
            const result = await toggleTaskFavorite(taskId, loginMember.no);
            if (result.success) {
                // 즐겨찾기 목록 새로고침
                loadFavoriteTasks();
            }
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
        }
    };

    const myTasks = getMyTasks();

    return (
        <div className="overview-view">
            <TeamHeader team={team} />

            {/* 하단: 좌측(참여중인 태스크), 우측(즐겨찾기 태스크) */}
            <div className="overview-bottom-row">
                {/* 참여중인 태스크 */}
                <div className="overview-section tasks-section">
                    <div className="section-header">
                        <h2>참여중인 태스크</h2>
                        <span className="count-badge">{myTasks.length}</span>
                    </div>
                    <div className="tasks-list">
                        {myTasks.length > 0 ? (
                            myTasks.map(task => (
                                <div key={task.taskId} className="task-item">
                                    <div className="task-header">
                                        <span className="task-title">{task.title}</span>
                                        <span className={`task-status status-${task.status?.toLowerCase()}`}>
                                            {STATUS_LABELS[task.status] || task.status}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="task-description">{task.description}</p>
                                    )}
                                    <div className="task-meta">
                                        <span className={`task-priority priority-${task.priority?.toLowerCase()}`}>
                                            {PRIORITY_LABELS[task.priority] || task.priority}
                                        </span>
                                        {task.dueDate && (
                                            <span className="task-due-date">
                                                {new Date(task.dueDate).toLocaleDateString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">참여중인 태스크가 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 즐겨찾기한 태스크 */}
                <div className="overview-section favorites-section">
                    <div className="section-header">
                        <h2>즐겨찾기한 태스크</h2>
                        <span className="count-badge">{favoriteTasks.length}</span>
                    </div>
                    <div className="tasks-list">
                        {favoriteTasks.length > 0 ? (
                            favoriteTasks.map(task => (
                                <div key={task.taskId} className="task-item">
                                    <div className="task-header">
                                        <span className="task-title">{task.title}</span>
                                        <span className={`task-status status-${task.status?.toLowerCase()}`}>
                                            {STATUS_LABELS[task.status] || task.status}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="task-description">{task.description}</p>
                                    )}
                                    <div className="task-meta">
                                        <span className={`task-priority priority-${task.priority?.toLowerCase()}`}>
                                            {PRIORITY_LABELS[task.priority] || task.priority}
                                        </span>
                                        {task.dueDate && (
                                            <span className="task-due-date">
                                                {new Date(task.dueDate).toLocaleDateString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">즐겨찾기한 태스크가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OverviewView;
