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

/**
 * 커밋을 되돌립니다 (Revert).
 * @param {number} teamId - 팀 ID
 * @param {string} branch - 브랜치 이름
 * @param {string} commitSha - 되돌릴 커밋 SHA
 */
export const revertCommit = async (teamId, branch, commitSha) => {
    const response = await axiosInstance.post(`${API_PATH}/revert/${teamId}`, {
        branch,
        commitSha
    });
    return response.data;
};

// ==================== Pull Request API ====================

/**
 * Task에서 작업용 브랜치를 생성합니다.
 * @param {number} taskId - Task ID
 * @param {number} teamId - 팀 ID
 * @param {string} branchName - 브랜치 이름 (선택, 없으면 자동 생성)
 * @param {string} baseSha - 분기할 커밋 SHA (선택)
 */
export const createTaskBranch = async (taskId, teamId, branchName = null, baseSha = null) => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/branch?teamId=${teamId}`, {
        branchName,
        baseSha
    });
    return response.data;
};

/**
 * Task에서 Pull Request를 생성합니다.
 * @param {number} taskId - Task ID
 * @param {number} teamId - 팀 ID
 * @param {string} head - 소스 브랜치
 * @param {string} base - 대상 브랜치 (선택, 기본: 기본 브랜치)
 * @param {string} title - PR 제목
 * @param {string} body - PR 본문 (선택)
 */
export const createTaskPR = async (taskId, teamId, head, base, title, body = '') => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/pr?teamId=${teamId}`, {
        head,
        base,
        title,
        body
    });
    return response.data;
};

/**
 * Task에 연결된 PR 목록을 조회합니다.
 * @param {number} taskId - Task ID
 * @param {number} teamId - 팀 ID
 */
export const getTaskPRs = async (taskId, teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/${taskId}/prs?teamId=${teamId}`);
    return response.data;
};

/**
 * 팀의 모든 PR 목록을 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} state - 상태 필터 (open, closed, all)
 */
export const getTeamPRs = async (teamId, state = 'all') => {
    const response = await axiosInstance.get(`${API_PATH}/prs/${teamId}?state=${state}`);
    return response.data;
};

/**
 * PR을 머지합니다.
 * @param {number} teamId - 팀 ID
 * @param {number} prNumber - PR 번호
 * @param {string} commitTitle - 머지 커밋 제목 (선택)
 * @param {string} mergeMethod - 머지 방법 (merge, squash, rebase)
 */
export const mergePR = async (teamId, prNumber, commitTitle = null, mergeMethod = 'merge') => {
    const response = await axiosInstance.put(`${API_PATH}/pr/${teamId}/${prNumber}/merge`, {
        commitTitle,
        mergeMethod
    });
    return response.data;
};
