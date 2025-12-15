import axiosInstance from './axiosInstance';

// 메시지 전송
export const sendMessage = async (teamId, senderNo, content) => {
  const response = await axiosInstance.post('/api/chat/send', {
    teamId,
    senderNo,
    content
  });
  return response.data;
};

// 팀별 최근 메시지 조회
export const getRecentMessages = async (teamId, limit = 100) => {
  const response = await axiosInstance.get(`/api/chat/team/${teamId}`, {
    params: { limit }
  });
  return response.data;
};

// 이전 메시지 로드 (무한 스크롤용)
export const getMessagesBefore = async (teamId, messageId, limit = 50) => {
  const response = await axiosInstance.get(`/api/chat/team/${teamId}/before/${messageId}`, {
    params: { limit }
  });
  return response.data;
};

// 메시지 삭제
export const deleteMessage = async (messageId) => {
  const response = await axiosInstance.delete(`/api/chat/${messageId}`);
  return response.data;
};
