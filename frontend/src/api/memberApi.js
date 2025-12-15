import axiosInstance from './axiosInstance';

// 회원가입
export const register = async (member) => {
    const response = await axiosInstance.post('/member/register', member);
    return response.data;
};

// 아이디 중복 체크
export const checkUserid = async (userid) => {
    const response = await axiosInstance.get('/member/check-userid', {
        params: { userid }
    });
    return response.data;
};

// 이메일 중복 체크
export const checkEmail = async (email) => {
    const response = await axiosInstance.get('/member/check-email', {
        params: { email }
    });
    return response.data;
};

// 로그인
export const login = async (member) => {
    const response = await axiosInstance.post('/member/login', member);
    return response.data;
};

// 아이디 찾기
export const findUserid = async (member) => {
    const response = await axiosInstance.post('/member/find-userid', member);
    return response.data;
};

// 비밀번호 찾기 (회원 확인)
export const findPassword = async (member) => {
    const response = await axiosInstance.post('/member/find-password', member);
    return response.data;
};

// 비밀번호 변경
export const resetPassword = async (member) => {
    const response = await axiosInstance.put('/member/reset-password', member);
    return response.data;
};

// 로그아웃
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('member');
};
