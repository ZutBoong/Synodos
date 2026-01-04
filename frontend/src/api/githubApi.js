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

/**
 * 팀 저장소의 기본 브랜치를 조회합니다.
 */
export const getDefaultBranch = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/default-branch/${teamId}`);
    return response.data;
};

/**
 * 브랜치 그래프 시각화용 커밋 데이터를 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {string[]} branches - 조회할 브랜치 목록
 * @param {number} depth - 각 브랜치당 조회할 커밋 수 (기본 50)
 */
export const getCommitsGraph = async (teamId, branches = [], depth = 50) => {
    const params = { depth };
    if (branches.length > 0) {
        params.branches = branches.join(',');
    }
    const response = await axiosInstance.get(`${API_PATH}/graph/${teamId}`, { params });
    return response.data;
};

/**
 * 두 브랜치를 비교하여 분기점(merge base)을 조회합니다.
 */
export const compareBranches = async (teamId, base, head) => {
    const response = await axiosInstance.get(`${API_PATH}/compare/${teamId}`, {
        params: { base, head }
    });
    return response.data;
};

// ==================== 브랜치 작업 API ====================

/**
 * 새 브랜치를 생성합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} branchName - 생성할 브랜치 이름
 * @param {string} fromSha - 분기할 커밋 SHA
 */
export const createBranch = async (teamId, branchName, fromSha) => {
    const response = await axiosInstance.post(`${API_PATH}/branch/${teamId}`, {
        branchName,
        fromSha
    });
    return response.data;
};

/**
 * 브랜치를 머지합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} base - 머지 대상 브랜치 (예: main)
 * @param {string} head - 머지할 브랜치 (예: feature/xxx)
 * @param {string} commitMessage - 머지 커밋 메시지 (선택)
 */
export const mergeBranches = async (teamId, base, head, commitMessage = null) => {
    const response = await axiosInstance.post(`${API_PATH}/merge/${teamId}`, {
        base,
        head,
        commitMessage
    });
    return response.data;
};

/**
 * 브랜치를 삭제합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} branchName - 삭제할 브랜치 이름
 */
export const deleteBranch = async (teamId, branchName) => {
    const response = await axiosInstance.delete(`${API_PATH}/branch/${teamId}/${encodeURIComponent(branchName)}`);
    return response.data;
};
