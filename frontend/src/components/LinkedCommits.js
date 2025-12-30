import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getTaskCommits, unlinkCommit } from '../api/githubApi';
import './LinkedCommits.css';

const LinkedCommits = forwardRef(({ taskId, canEdit }, ref) => {
    const [commits, setCommits] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchCommits = async () => {
        if (!taskId) return;
        setLoading(true);
        try {
            const data = await getTaskCommits(taskId);
            setCommits(data || []);
        } catch (err) {
            console.error('커밋 목록 조회 실패:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommits();
    }, [taskId]);

    // 부모 컴포넌트에서 refresh 호출 가능하게
    useImperativeHandle(ref, () => ({
        refresh: fetchCommits
    }));

    const handleUnlink = async (commitId) => {
        if (!window.confirm('이 커밋 연결을 해제하시겠습니까?')) return;
        try {
            await unlinkCommit(taskId, commitId);
            setCommits(prev => prev.filter(c => c.id !== commitId));
        } catch (err) {
            alert('커밋 연결 해제 실패');
        }
    };

    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 30) return `${diffDays}일 전`;
        return date.toLocaleDateString('ko-KR');
    };

    if (loading) {
        return (
            <div className="linked-commits-loading">
                <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
        );
    }

    if (commits.length === 0) {
        return null;
    }

    return (
        <div className="linked-commits">
            {commits.map(commit => (
                <div key={commit.id} className="linked-commit-item">
                    <a
                        href={commit.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="commit-link"
                    >
                        <span className="commit-sha">{commit.commitSha.substring(0, 7)}</span>
                        <span className="commit-message">{commit.commitMessage}</span>
                    </a>
                    <div className="commit-meta">
                        <span>{commit.commitAuthor}</span>
                        <span>·</span>
                        <span>{commit.commitDate ? getRelativeTime(commit.commitDate) : ''}</span>
                    </div>
                    {canEdit && (
                        <button
                            className="unlink-btn"
                            onClick={() => handleUnlink(commit.id)}
                            title="연결 해제"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
});

export default LinkedCommits;
