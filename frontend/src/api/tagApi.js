import axiosInstance from './axiosInstance';

const API_PATH = '/api/tag';

// 태그 생성
export const createTag = async (tag) => {
    const response = await axiosInstance.post(API_PATH, tag);
    return response.data;
};

// 팀 태그 목록
export const getTagsByTeam = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/team/${teamId}`);
    return response.data;
};

// 태스크 태그 목록
export const getTagsByTask = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/${taskId}`);
    return response.data;
};

// 태그 수정
export const updateTag = async (tagId, tag) => {
    const response = await axiosInstance.put(`${API_PATH}/${tagId}`, tag);
    return response.data;
};

// 태그 삭제
export const deleteTag = async (tagId) => {
    const response = await axiosInstance.delete(`${API_PATH}/${tagId}`);
    return response.data;
};

// 태스크에 태그 추가
export const addTagToTask = async (taskId, tagId) => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/tags`, { tagId });
    return response.data;
};

// 태스크에서 태그 제거
export const removeTagFromTask = async (taskId, tagId) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/${taskId}/tags/${tagId}`);
    return response.data;
};

// 태스크의 태그 전체 업데이트
export const updateTaskTags = async (taskId, tagIds) => {
    const response = await axiosInstance.put(`${API_PATH}/task/${taskId}/tags`, tagIds);
    return response.data;
};
