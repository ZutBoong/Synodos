import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081/api/project';

// 프로젝트 생성
export const createProject = async (project) => {
    const response = await axios.post(`${API_BASE_URL}/create`, project);
    return response.data;
};

// 팀별 프로젝트 목록
export const getProjectsByTeam = async (teamId) => {
    const response = await axios.get(`${API_BASE_URL}/list/${teamId}`);
    return response.data;
};

// 프로젝트 상세
export const getProject = async (projectId) => {
    const response = await axios.get(`${API_BASE_URL}/${projectId}`);
    return response.data;
};

// 프로젝트 수정
export const updateProject = async (project) => {
    const response = await axios.put(`${API_BASE_URL}/update`, project);
    return response.data;
};

// 프로젝트 삭제
export const deleteProject = async (projectId) => {
    const response = await axios.delete(`${API_BASE_URL}/${projectId}`);
    return response.data;
};
