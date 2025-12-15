import axiosInstance from './axiosInstance';

const API_PATH = '/api/team';

// 팀 생성
export const createTeam = async (team) => {
    const response = await axiosInstance.post(`${API_PATH}/create`, team);
    return response.data;
};

// 팀 코드로 가입
export const joinTeam = async (teamCode, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/join`, { teamCode, memberNo });
    return response.data;
};

// 내 팀 목록
export const getMyTeams = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/my-teams/${memberNo}`);
    return response.data;
};

// 팀 정보 조회
export const getTeam = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/${teamId}`);
    return response.data;
};

// 팀 멤버 목록
export const getTeamMembers = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/${teamId}/members`);
    return response.data;
};

// 팀 탈퇴
export const leaveTeam = async (teamId, memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/${teamId}/leave/${memberNo}`);
    return response.data;
};

// 팀 삭제
export const deleteTeam = async (teamId) => {
    const response = await axiosInstance.delete(`${API_PATH}/${teamId}`);
    return response.data;
};
