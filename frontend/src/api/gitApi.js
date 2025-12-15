import axiosInstance from './axiosInstance';

// 저장소 연결
export const connectRepo = async (teamId, provider, repoOwner, repoName, accessToken) => {
  const response = await axiosInstance.post('/api/git/repo', {
    teamId,
    provider,
    repoOwner,
    repoName,
    accessToken
  });
  return response.data;
};

// 팀별 저장소 조회
export const getRepoByTeam = async (teamId) => {
  const response = await axiosInstance.get(`/api/git/repo/team/${teamId}`);
  return response.data;
};

// 저장소 연결 해제
export const disconnectRepo = async (repoId) => {
  const response = await axiosInstance.delete(`/api/git/repo/${repoId}`);
  return response.data;
};

// 연결 테스트
export const testConnection = async (provider, repoOwner, repoName, accessToken) => {
  const response = await axiosInstance.post('/api/git/repo/test', {
    provider,
    repoOwner,
    repoName,
    accessToken
  });
  return response.data;
};

// 커밋 동기화
export const syncCommits = async (teamId) => {
  const response = await axiosInstance.post(`/api/git/sync/${teamId}`);
  return response.data;
};

// 태스크별 커밋 목록
export const getCommitsByTask = async (taskId) => {
  const response = await axiosInstance.get(`/api/git/commits/task/${taskId}`);
  return response.data;
};
