import axiosInstance from './axiosInstance';

const API_PATH = '/api/github';

/**
 * 팀 저장소의 브랜치 목록을 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getBranches = async (teamId, memberNo = null) => {
    const params = {};
    if (memberNo) params.memberNo = memberNo;
    const response = await axiosInstance.get(`${API_PATH}/branches/${teamId}`, { params });
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
 * @param {number} teamId - 팀 ID
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getDefaultBranch = async (teamId, memberNo = null) => {
    const params = {};
    if (memberNo) params.memberNo = memberNo;
    const response = await axiosInstance.get(`${API_PATH}/default-branch/${teamId}`, { params });
    return response.data;
};

/**
 * 브랜치 그래프 시각화용 커밋 데이터를 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {string[]} branches - 조회할 브랜치 목록
 * @param {number} depth - 각 브랜치당 조회할 커밋 수 (기본 50)
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getCommitsGraph = async (teamId, branches = [], depth = 50, memberNo = null) => {
    const params = { depth };
    if (branches.length > 0) {
        params.branches = branches.join(',');
    }
    if (memberNo) params.memberNo = memberNo;
    const response = await axiosInstance.get(`${API_PATH}/graph/${teamId}`, { params });
    return response.data;
};

/**
 * 두 브랜치를 비교하여 분기점(merge base)을 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} base - 기준 브랜치
 * @param {string} head - 비교 브랜치
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const compareBranches = async (teamId, base, head, memberNo = null) => {
    const params = { base, head };
    if (memberNo) params.memberNo = memberNo;
    const response = await axiosInstance.get(`${API_PATH}/compare/${teamId}`, { params });
    return response.data;
};

// ==================== 브랜치 작업 API ====================

/**
 * 새 브랜치를 생성합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} branchName - 생성할 브랜치 이름
 * @param {string} fromSha - 분기할 커밋 SHA
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const createBranch = async (teamId, branchName, fromSha, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/branch/${teamId}`, {
        branchName,
        fromSha,
        memberNo
    });
    return response.data;
};

/**
 * 브랜치를 머지합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} base - 머지 대상 브랜치 (예: main)
 * @param {string} head - 머지할 브랜치 (예: feature/xxx)
 * @param {string} commitMessage - 머지 커밋 메시지 (선택)
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const mergeBranches = async (teamId, base, head, commitMessage = null, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/merge/${teamId}`, {
        base,
        head,
        commitMessage,
        memberNo
    });
    return response.data;
};

/**
 * 브랜치를 삭제합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} branchName - 삭제할 브랜치 이름
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const deleteBranch = async (teamId, branchName, memberNo) => {
    const response = await axiosInstance.delete(
        `${API_PATH}/branch/${teamId}/${encodeURIComponent(branchName)}?memberNo=${memberNo}`
    );
    return response.data;
};

/**
 * 커밋을 되돌립니다 (Revert).
 * @param {number} teamId - 팀 ID
 * @param {string} branch - 브랜치 이름
 * @param {string} commitSha - 되돌릴 커밋 SHA
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const revertCommit = async (teamId, branch, commitSha, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/revert/${teamId}`, {
        branch,
        commitSha,
        memberNo
    });
    return response.data;
};

// ==================== Pull Request API ====================

/**
 * Pull Request를 생성합니다 (Task 연결 없이).
 * @param {number} teamId - 팀 ID
 * @param {string} head - 소스 브랜치
 * @param {string} base - 대상 브랜치 (선택)
 * @param {string} title - PR 제목
 * @param {string} body - PR 본문 (선택)
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const createPR = async (teamId, head, base, title, body = '', memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/pr/${teamId}`, {
        head,
        base,
        title,
        body,
        memberNo
    });
    return response.data;
};

/**
 * Task에서 작업용 브랜치를 생성합니다.
 * @param {number} taskId - Task ID
 * @param {number} teamId - 팀 ID
 * @param {string} branchName - 브랜치 이름 (선택, 없으면 자동 생성)
 * @param {string} baseSha - 분기할 커밋 SHA (선택)
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const createTaskBranch = async (taskId, teamId, branchName = null, baseSha = null, memberNo) => {
    const response = await axiosInstance.post(
        `${API_PATH}/task/${taskId}/branch?teamId=${teamId}&memberNo=${memberNo}`,
        { branchName, baseSha }
    );
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
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const createTaskPR = async (taskId, teamId, head, base, title, body = '', memberNo) => {
    const response = await axiosInstance.post(
        `${API_PATH}/task/${taskId}/pr?teamId=${teamId}&memberNo=${memberNo}`,
        { head, base, title, body }
    );
    return response.data;
};

/**
 * Task에 연결된 PR 목록을 조회합니다.
 * @param {number} taskId - Task ID
 * @param {number} teamId - 팀 ID
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getTaskPRs = async (taskId, teamId, memberNo = null) => {
    let url = `${API_PATH}/task/${taskId}/prs?teamId=${teamId}`;
    if (memberNo) url += `&memberNo=${memberNo}`;
    const response = await axiosInstance.get(url);
    return response.data;
};

/**
 * 팀의 모든 PR 목록을 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {string} state - 상태 필터 (open, closed, all)
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getTeamPRs = async (teamId, state = 'all', memberNo = null) => {
    let url = `${API_PATH}/prs/${teamId}?state=${state}`;
    if (memberNo) url += `&memberNo=${memberNo}`;
    const response = await axiosInstance.get(url);
    return response.data;
};

/**
 * PR을 머지합니다.
 * @param {number} teamId - 팀 ID
 * @param {number} prNumber - PR 번호
 * @param {string} commitTitle - 머지 커밋 제목 (선택)
 * @param {string} mergeMethod - 머지 방법 (merge, squash, rebase)
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const mergePR = async (teamId, prNumber, commitTitle = null, mergeMethod = 'merge', memberNo) => {
    const response = await axiosInstance.put(`${API_PATH}/pr/${teamId}/${prNumber}/merge`, {
        commitTitle,
        mergeMethod,
        memberNo
    });
    return response.data;
};

/**
 * PR 상세 정보 조회 (머지 가능 여부, 충돌 파일 포함)
 * @param {number} teamId - 팀 ID
 * @param {number} prNumber - PR 번호
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getPRDetail = async (teamId, prNumber, memberNo = null) => {
    let url = `${API_PATH}/pr/${teamId}/${prNumber}/detail`;
    if (memberNo) url += `?memberNo=${memberNo}`;
    const response = await axiosInstance.get(url);
    return response.data;
};

// ==================== AI 충돌 해결 API ====================

/**
 * 충돌 파일의 양쪽 버전을 조회합니다.
 * @param {number} teamId - 팀 ID
 * @param {number} prNumber - PR 번호
 * @param {string} filename - 충돌 파일명
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const getConflictFileVersions = async (teamId, prNumber, filename, memberNo = null) => {
    let url = `${API_PATH}/pr/${teamId}/${prNumber}/conflict/${encodeURIComponent(filename)}`;
    if (memberNo) url += `?memberNo=${memberNo}`;
    const response = await axiosInstance.get(url);
    return response.data;
};

/**
 * AI를 사용하여 충돌을 해결합니다.
 * @param {number} teamId - 팀 ID
 * @param {number} prNumber - PR 번호
 * @param {string} filename - 충돌 파일명
 * @param {number} memberNo - 회원 번호 (선택, GitHub 토큰용)
 */
export const aiResolveConflict = async (teamId, prNumber, filename, memberNo = null) => {
    const response = await axiosInstance.post(
        `${API_PATH}/pr/${teamId}/${prNumber}/ai-resolve`,
        { filename, memberNo }
    );
    return response.data;
};

/**
 * AI가 해결한 코드를 GitHub에 커밋합니다.
 * @param {number} teamId - 팀 ID
 * @param {number} prNumber - PR 번호
 * @param {string} filename - 파일명
 * @param {string} resolvedCode - 해결된 코드
 * @param {string} headSha - 파일 SHA
 * @param {number} memberNo - 회원 번호 (필수, GitHub 토큰용)
 */
export const applyConflictResolution = async (teamId, prNumber, filename, resolvedCode, headSha, memberNo) => {
    const response = await axiosInstance.post(
        `${API_PATH}/pr/${teamId}/${prNumber}/apply-resolution`,
        { filename, resolvedCode, headSha, memberNo }
    );
    return response.data;
};
