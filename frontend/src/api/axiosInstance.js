import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL !== undefined
    ? process.env.REACT_APP_API_URL
    : 'http://localhost:8081';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 요청 인터셉터 - 토큰 자동 첨부
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터 - 401 에러 처리
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // 토큰 만료 또는 유효하지 않은 토큰인 경우에만 로그아웃 처리
            // 특정 API 호출 중 401이 발생해도 무조건 로그아웃하지 않음
            const errorMessage = error.response.data?.message || error.response.data?.error || '';
            const isTokenError =
                errorMessage.includes('token') ||
                errorMessage.includes('Token') ||
                errorMessage.includes('JWT') ||
                errorMessage.includes('인증') ||
                errorMessage.includes('expired') ||
                errorMessage.includes('invalid') ||
                !localStorage.getItem('token'); // 토큰이 없는 경우

            if (isTokenError) {
                localStorage.removeItem('token');
                localStorage.removeItem('member');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
