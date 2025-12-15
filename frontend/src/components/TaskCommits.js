import React, { useState, useEffect } from 'react';
import { getCommitsByTask } from '../api/gitApi';
import './TaskCommits.css';

function TaskCommits({ taskId }) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommits();
  }, [taskId]);

  const loadCommits = async () => {
    try {
      setLoading(true);
      const data = await getCommitsByTask(taskId);
      setCommits(data || []);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shortenSha = (sha) => {
    return sha ? sha.substring(0, 7) : '';
  };

  if (loading) {
    return <div className="task-commits-loading">커밋 로딩 중...</div>;
  }

  return (
    <div className="task-commits">
      <div className="commits-header">
        <h4>관련 커밋 ({commits.length})</h4>
      </div>

      {commits.length === 0 ? (
        <div className="commits-empty">
          <p>연결된 커밋이 없습니다.</p>
          <p className="commits-hint">
            커밋 메시지에 #{taskId}를 포함하면 자동으로 연결됩니다.
          </p>
        </div>
      ) : (
        <div className="commits-list">
          {commits.map((commit) => (
            <div key={commit.commitSha} className="commit-item">
              <div className="commit-sha">
                <code>{shortenSha(commit.commitSha)}</code>
              </div>
              <div className="commit-details">
                <div className="commit-message">{commit.commitMessage}</div>
                <div className="commit-meta">
                  <span className="commit-author">{commit.authorName}</span>
                  <span className="commit-date">{formatDate(commit.committedAt)}</span>
                </div>
              </div>
              {commit.commitUrl && (
                <a
                  href={commit.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="commit-link"
                  title="GitHub에서 보기"
                >
                  ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskCommits;
