import React, { useState, useEffect } from 'react';
import { getRepoByTeam, connectRepo, disconnectRepo, testConnection, syncCommits } from '../api/gitApi';
import './GitRepoSettings.css';

function GitRepoSettings({ teamId, onClose }) {
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    provider: 'GITHUB',
    repoOwner: '',
    repoName: '',
    accessToken: ''
  });

  useEffect(() => {
    loadRepo();
  }, [teamId]);

  const loadRepo = async () => {
    try {
      setLoading(true);
      const data = await getRepoByTeam(teamId);
      if (data) {
        setRepo(data);
        setFormData({
          provider: data.provider || 'GITHUB',
          repoOwner: data.repoOwner || '',
          repoName: data.repoName || '',
          accessToken: ''  // 토큰은 마스킹되어 오므로 비워둠
        });
      }
    } catch (error) {
      console.error('Failed to load repo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTest = async () => {
    if (!formData.repoOwner || !formData.repoName) {
      setMessage({ type: 'error', text: 'Owner와 Repository 이름을 입력하세요.' });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);
      const result = await testConnection(
        formData.provider,
        formData.repoOwner,
        formData.repoName,
        formData.accessToken
      );
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    } catch (error) {
      setMessage({ type: 'error', text: '연결 테스트 실패: ' + error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.repoOwner || !formData.repoName) {
      setMessage({ type: 'error', text: 'Owner와 Repository 이름을 입력하세요.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const result = await connectRepo(
        teamId,
        formData.provider,
        formData.repoOwner,
        formData.repoName,
        formData.accessToken
      );
      if (result) {
        setRepo(result);
        setMessage({ type: 'success', text: '저장소가 연결되었습니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '저장 실패: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!repo || !window.confirm('저장소 연결을 해제하시겠습니까?')) return;

    try {
      await disconnectRepo(repo.repoId);
      setRepo(null);
      setFormData({
        provider: 'GITHUB',
        repoOwner: '',
        repoName: '',
        accessToken: ''
      });
      setMessage({ type: 'success', text: '연결이 해제되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '연결 해제 실패: ' + error.message });
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const result = await syncCommits(teamId);
      setMessage({ type: 'success', text: result.message });
    } catch (error) {
      setMessage({ type: 'error', text: '동기화 실패: ' + error.message });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="git-settings-modal">
        <div className="git-settings-content">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="git-settings-modal">
      <div className="git-settings-content">
        <div className="git-settings-header">
          <h2>Git 저장소 연결</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {message && (
          <div className={`git-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="git-settings-form">
          <div className="form-group">
            <label>Provider</label>
            <select
              name="provider"
              value={formData.provider}
              onChange={handleChange}
            >
              <option value="GITHUB">GitHub</option>
              <option value="GITLAB" disabled>GitLab (준비 중)</option>
              <option value="BITBUCKET" disabled>Bitbucket (준비 중)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Owner / Organization</label>
            <input
              type="text"
              name="repoOwner"
              value={formData.repoOwner}
              onChange={handleChange}
              placeholder="username 또는 organization"
            />
          </div>

          <div className="form-group">
            <label>Repository Name</label>
            <input
              type="text"
              name="repoName"
              value={formData.repoName}
              onChange={handleChange}
              placeholder="repository-name"
            />
          </div>

          <div className="form-group">
            <label>Personal Access Token {repo && '(변경 시에만 입력)'}</label>
            <input
              type="password"
              name="accessToken"
              value={formData.accessToken}
              onChange={handleChange}
              placeholder={repo ? '새 토큰 입력 (변경하지 않으면 비워두세요)' : 'ghp_xxxxx...'}
            />
            <small className="form-hint">
              GitHub Settings &gt; Developer settings &gt; Personal access tokens에서 생성
            </small>
          </div>

          <div className="git-settings-actions">
            <button
              type="button"
              className="test-btn"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? '테스트 중...' : '연결 테스트'}
            </button>
            <button
              type="button"
              className="save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : (repo ? '수정' : '연결')}
            </button>
          </div>

          {repo && (
            <div className="git-settings-connected">
              <div className="connected-info">
                <span className="connected-icon">✓</span>
                <span>연결됨: {repo.repoOwner}/{repo.repoName}</span>
              </div>
              <div className="connected-actions">
                <button
                  type="button"
                  className="sync-btn"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? '동기화 중...' : '커밋 동기화'}
                </button>
                <button
                  type="button"
                  className="disconnect-btn"
                  onClick={handleDisconnect}
                >
                  연결 해제
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GitRepoSettings;
