import axiosInstance from './axiosInstance';

// 알림 목록 조회
export const getNotifications = async (memberNo, limit = 50) => {
    const response = await axiosInstance.get(`/api/notification/list/${memberNo}?limit=${limit}`);
    return response.data;
};

// 읽지 않은 알림 목록
export const getUnreadNotifications = async (memberNo) => {
    const response = await axiosInstance.get(`/api/notification/unread/${memberNo}`);
    return response.data;
};

// 읽지 않은 알림 수
export const getUnreadCount = async (memberNo) => {
    const response = await axiosInstance.get(`/api/notification/unread/count/${memberNo}`);
    return response.data.count;
};

// 읽음 처리
export const markAsRead = async (notificationId) => {
    const response = await axiosInstance.put(`/api/notification/${notificationId}/read`);
    return response.data;
};

// 모두 읽음 처리
export const markAllAsRead = async (memberNo) => {
    const response = await axiosInstance.put(`/api/notification/read-all/${memberNo}`);
    return response.data;
};

// 알림 삭제
export const deleteNotification = async (notificationId) => {
    const response = await axiosInstance.delete(`/api/notification/${notificationId}`);
    return response.data;
};

// 모든 알림 삭제
export const deleteAllNotifications = async (memberNo) => {
    const response = await axiosInstance.delete(`/api/notification/all/${memberNo}`);
    return response.data;
};
