import axiosInstance from './axiosInstance';

const API_PATH = '/api';

/**
 * GitHub URL의 코드를 AI로 분석합니다.
 * 분석 결과는 태스크의 댓글로 저장됩니다.
 */
export const analyzeCode = async (taskId, githubUrl, requesterId) => {
    const response = await axiosInstance.post(`${API_PATH}/analysis`, {
        taskId,
        githubUrl,
        requesterId
    });
    return response.data;
};
