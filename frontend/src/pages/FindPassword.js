import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/memberApi';
import { sendPasswordResetCode, verifyCode } from '../api/emailApi';
import './Auth.css';

function FindPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: 이메일 입력, 2: 인증 코드, 3: 비밀번호 변경, 4: 완료
    const [email, setEmail] = useState('');
    const [userid, setUserid] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [passwordForm, setPasswordForm] = useState({
        password: '',
        passwordConfirm: ''
    });
    const [memberNo, setMemberNo] = useState(null);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [codeExpiry, setCodeExpiry] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 재발송 쿨다운 타이머
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // 인증 코드 만료 타이머
    useEffect(() => {
        if (codeExpiry > 0) {
            const timer = setTimeout(() => setCodeExpiry(codeExpiry - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [codeExpiry]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm({ ...passwordForm, [name]: value });
        setError('');
    };

    // Step 1: 이메일로 인증 코드 발송
    const handleSendCode = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('이메일을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await sendPasswordResetCode(email);
            if (response.userid) {
                setUserid(response.userid);
            }
            setStep(2);
            setCountdown(60);
            setCodeExpiry(300);
            setError('');
        } catch (error) {
            console.error('인증 코드 발송 실패:', error);
            setError(error.response?.data?.message || '인증 코드 발송에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 인증 코드 재발송
    const handleResendCode = async () => {
        if (countdown > 0) return;

        try {
            await sendPasswordResetCode(email);
            setCountdown(60);
            setCodeExpiry(300);
            setVerificationCode('');
            setError('');
            alert('인증 코드가 재발송되었습니다.');
        } catch (error) {
            console.error('인증 코드 재발송 실패:', error);
            setError(error.response?.data?.message || '인증 코드 재발송에 실패했습니다.');
        }
    };

    // Step 2: 인증 코드 확인
    const handleVerifyCode = async (e) => {
        e.preventDefault();

        if (!verificationCode || verificationCode.length !== 6) {
            setError('6자리 인증 코드를 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await verifyCode(email, verificationCode, 'PASSWORD_RESET');

            if (response.success) {
                setMemberNo(response.memberNo);
                setStep(3);
                setError('');
            } else {
                setError(response.message || '인증 코드가 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('인증 실패:', error);
            setError(error.response?.data?.message || '인증에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 3: 비밀번호 변경
    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!passwordForm.password || !passwordForm.passwordConfirm) {
            setError('새 비밀번호를 입력해주세요.');
            return;
        }

        if (passwordForm.password.length < 4) {
            setError('비밀번호는 4자 이상이어야 합니다.');
            return;
        }

        if (passwordForm.password !== passwordForm.passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await resetPassword({
                no: memberNo,
                password: passwordForm.password
            });

            if (response.success) {
                setStep(4);
                setError('');
            } else {
                setError(response.message);
            }
        } catch (error) {
            console.error('비밀번호 변경 실패:', error);
            setError('비밀번호 변경에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>비밀번호 찾기</h2>

                {/* 단계 표시 */}
                <div className="step-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">이메일 입력</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">인증</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                        <span className="step-number">3</span>
                        <span className="step-label">비밀번호 변경</span>
                    </div>
                </div>

                {/* Step 1: 이메일 입력 */}
                {step === 1 && (
                    <form onSubmit={handleSendCode}>
                        <div className="form-group">
                            <label>이메일</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder="가입 시 등록한 이메일을 입력하세요"
                            />
                        </div>

                        {error && <div className="error-msg" style={{ marginBottom: '15px' }}>{error}</div>}

                        <div className="button-group">
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? '처리 중...' : '인증 코드 받기'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/login')}>
                                로그인으로
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: 인증 코드 입력 */}
                {step === 2 && (
                    <form onSubmit={handleVerifyCode}>
                        <div className="verification-info">
                            <p><strong>{email}</strong>로 인증 코드를 발송했습니다.</p>
                            {userid && <p>아이디: <strong>{userid}</strong></p>}
                            {codeExpiry > 0 && (
                                <p className="expiry-timer">남은 시간: <strong>{formatTime(codeExpiry)}</strong></p>
                            )}
                            {codeExpiry === 0 && (
                                <p className="error-msg">인증 코드가 만료되었습니다. 재발송해주세요.</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label>인증 코드</label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="6자리 인증 코드 입력"
                                maxLength={6}
                                className="verification-code-input"
                            />
                        </div>

                        {error && <div className="error-msg" style={{ marginBottom: '15px' }}>{error}</div>}

                        <div className="button-group">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting || codeExpiry === 0}
                            >
                                {isSubmitting ? '확인 중...' : '인증 확인'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleResendCode}
                                disabled={countdown > 0}
                            >
                                {countdown > 0 ? `재발송 (${countdown}초)` : '재발송'}
                            </button>
                        </div>

                        <div className="step-back">
                            <button type="button" className="btn-link" onClick={() => setStep(1)}>
                                ← 이전 단계로
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: 비밀번호 변경 */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="verification-info" style={{ background: '#d1fae5' }}>
                            <p style={{ color: '#10b981' }}>이메일 인증이 완료되었습니다.</p>
                            <p>새 비밀번호를 설정해주세요.</p>
                        </div>

                        <div className="form-group">
                            <label>새 비밀번호</label>
                            <input
                                type="password"
                                name="password"
                                value={passwordForm.password}
                                onChange={handlePasswordChange}
                                placeholder="새 비밀번호를 입력하세요"
                            />
                        </div>

                        <div className="form-group">
                            <label>새 비밀번호 확인</label>
                            <input
                                type="password"
                                name="passwordConfirm"
                                value={passwordForm.passwordConfirm}
                                onChange={handlePasswordChange}
                                placeholder="새 비밀번호를 다시 입력하세요"
                            />
                        </div>

                        {error && <div className="error-msg" style={{ marginBottom: '15px' }}>{error}</div>}

                        <div className="button-group">
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 4: 완료 */}
                {step === 4 && (
                    <div className="complete-section">
                        <div className="complete-icon">✓</div>
                        <h3>비밀번호가 변경되었습니다!</h3>
                        <p>새 비밀번호로 로그인해주세요.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/login')}
                        >
                            로그인하기
                        </button>
                    </div>
                )}

                {step < 4 && (
                    <div className="auth-links">
                        <span onClick={() => navigate('/find-id')}>아이디 찾기</span>
                        <span className="divider">|</span>
                        <span onClick={() => navigate('/register')}>회원가입</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FindPassword;
