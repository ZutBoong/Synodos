import axiosInstance from './axiosInstance';

// 회원가입용 인증 코드 발송
export const sendVerificationCode = async (email) => {
    const response = await axiosInstance.post('/api/email/send-code', { email });
    return response.data;
};

// 인증 코드 확인
export const verifyCode = async (email, code, type = 'REGISTER') => {
    const response = await axiosInstance.post('/api/email/verify-code', { email, code, type });
    return response.data;
};

// 비밀번호 재설정용 인증 코드 발송
export const sendPasswordResetCode = async (email) => {
    const response = await axiosInstance.post('/api/email/send-reset-code', { email });
    return response.data;
};

// 인증 코드 재발송
export const resendCode = async (email, type = 'REGISTER') => {
    const response = await axiosInstance.post('/api/email/resend-code', { email, type });
    return response.data;
};
