import axiosInstance from './axiosInstance';

const API_PATH = '/api/github';

/**
 * 팀 저장소의 브랜치 목록을 조회합니다.
 */
export const getBranches = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/branches/${teamId}`);
    return response.data;
};

/**
 * 팀 저장소의 커밋 목록을 조회합니다.
 */
export const getCommits = async (teamId, branch = 'main', page = 1) => {
    const response = await axiosInstance.get(`${API_PATH}/commits/${teamId}`, {
        params: { branch, page }
    });
    return response.data;
};

/**
 * 태스크에 커밋을 연결합니다.
 */
export const linkCommit = async (taskId, commitData) => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/commit`, commitData);
    return response.data;
};

/**
 * 태스크에서 커밋 연결을 해제합니다.
 */
export const unlinkCommit = async (taskId, commitId) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/${taskId}/commit/${commitId}`);
    return response.data;
};

/**
 * 태스크에 연결된 커밋 목록을 조회합니다.
 */
export const getTaskCommits = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/${taskId}/commits`);
    return response.data;
};
