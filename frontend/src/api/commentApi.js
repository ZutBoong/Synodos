import axiosInstance from './axiosInstance';

const API_PATH = '/api';

// 댓글 생성
export const createComment = async (comment) => {
    const response = await axiosInstance.post(`${API_PATH}/comment`, comment);
    return response.data;
};

// 태스크별 댓글 목록
export const getCommentsByTask = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/comment/task/${taskId}`);
    return response.data;
};

// 댓글 상세
export const getComment = async (commentId) => {
    const response = await axiosInstance.get(`${API_PATH}/comment/${commentId}`);
    return response.data;
};

// 댓글 수정
export const updateComment = async (commentId, content) => {
    const response = await axiosInstance.put(`${API_PATH}/comment/${commentId}`, { content });
    return response.data;
};

// 댓글 삭제
export const deleteComment = async (commentId) => {
    const response = await axiosInstance.delete(`${API_PATH}/comment/${commentId}`);
    return response.data;
};

// 태스크별 댓글 수
export const getCommentCount = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/comment/count/${taskId}`);
    return response.data;
};
