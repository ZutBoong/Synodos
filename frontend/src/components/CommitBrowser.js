import React, { useState, useEffect } from 'react';
import { getBranches, getCommits, linkCommit } from '../api/githubApi';
import './CommitBrowser.css';

function CommitBrowser({ teamId, taskId, loginMember, onClose, onCommitLinked }) {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [commits, setCommits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [linking, setLinking] = useState(null); // 연결 중인 커밋 SHA

    // 브랜치 목록 로드
    useEffect(() => {
        const fetchBranches = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getBranches(teamId);
                setBranches(data || []);
                // 기본 브랜치 선택 (main 또는 master 우선)
                if (data && data.length > 0) {
                    const defaultBranch = data.find(b => b.name === 'main') ||
                                         data.find(b => b.name === 'master') ||
                                         data[0];
                    setSelectedBranch(defaultBranch.name);
                }
            } catch (err) {
                setError(err.response?.data || err.message || '브랜치 목록 조회 실패');
            } finally {
                setLoading(false);
            }
        };

        if (teamId) {
            fetchBranches();
        }
    }, [teamId]);

    // 커밋 목록 로드
    useEffect(() => {
        const fetchCommits = async () => {
            if (!selectedBranch) return;

            setLoading(true);
            setError(null);
            try {
                const data = await getCommits(teamId, selectedBranch, page);
                if (page === 1) {
                    setCommits(data || []);
                } else {
                    setCommits(prev => [...prev, ...(data || [])]);
                }
                setHasMore(data && data.length === 20);
            } catch (err) {
                setError(err.response?.data || err.message || '커밋 목록 조회 실패');
            } finally {
                setLoading(false);
            }
        };

        fetchCommits();
    }, [teamId, selectedBranch, page]);

    // 브랜치 변경
    const handleBranchChange = (e) => {
        setSelectedBranch(e.target.value);
        setPage(1);
        setCommits([]);
    };

    // 더 보기
    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    // 커밋 연결
    const handleLinkCommit = async (commit) => {
        setLinking(commit.sha);
        try {
            await linkCommit(taskId, {
                commitSha: commit.sha,
                commitMessage: commit.message,
                commitAuthor: commit.authorName || commit.authorLogin,
                commitDate: commit.date,
                githubUrl: commit.htmlUrl,
                linkedBy: loginMember.no
            });
            if (onCommitLinked) {
                onCommitLinked();
            }
            onClose();
        } catch (err) {
            const errorMsg = err.response?.data || err.message || '커밋 연결 실패';
            alert(errorMsg);
        } finally {
            setLinking(null);
        }
    };

    // 상대 시간 계산
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

    return (
        <div className="commit-browser-overlay" onClick={onClose}>
            <div className="commit-browser-modal" onClick={e => e.stopPropagation()}>
                <div className="commit-browser-header">
                    <h3><i className="fa-brands fa-github"></i> 커밋 연결</h3>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="commit-browser-content">
                    {/* 브랜치 선택 */}
                    <div className="branch-selector">
                        <label>
                            <i className="fa-solid fa-code-branch"></i> 브랜치
                        </label>
                        <select value={selectedBranch} onChange={handleBranchChange} disabled={loading}>
                            {branches.map(branch => (
                                <option key={branch.name} value={branch.name}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 에러 표시 */}
                    {error && (
                        <div className="commit-browser-error">
                            <i className="fa-solid fa-circle-exclamation"></i> {error}
                        </div>
                    )}

                    {/* 커밋 목록 */}
                    <div className="commit-list">
                        {commits.length === 0 && !loading && !error && (
                            <div className="commit-empty">커밋이 없습니다.</div>
                        )}

                        {commits.map(commit => (
                            <div key={commit.sha} className="commit-item">
                                <div className="commit-info">
                                    <div className="commit-message">
                                        <span className="commit-sha">{commit.shortSha}</span>
                                        {commit.message}
                                    </div>
                                    <div className="commit-meta">
                                        <span className="commit-author">
                                            {commit.authorName || commit.authorLogin}
                                        </span>
                                        <span className="commit-date">
                                            {getRelativeTime(commit.date)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="link-btn"
                                    onClick={() => handleLinkCommit(commit)}
                                    disabled={linking !== null}
                                >
                                    {linking === commit.sha ? (
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                    ) : (
                                        <i className="fa-solid fa-link"></i>
                                    )}
                                </button>
                            </div>
                        ))}

                        {loading && (
                            <div className="commit-loading">
                                <i className="fa-solid fa-spinner fa-spin"></i> 로딩 중...
                            </div>
                        )}

                        {!loading && hasMore && commits.length > 0 && (
                            <button className="load-more-btn" onClick={handleLoadMore}>
                                더 보기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CommitBrowser;
