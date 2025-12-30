import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, checkUserid, checkEmail } from '../api/memberApi';
import { sendVerificationCode, verifyCode } from '../api/emailApi';
import './Auth.css';

function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: 정보입력, 2: 이메일 인증, 3: 완료
    const [form, setForm] = useState({
        userid: '',
        password: '',
        passwordConfirm: '',
        name: '',
        email: '',
        phone: ''
    });
    const [errors, setErrors] = useState({});
    const [checks, setChecks] = useState({
        userid: null,
        email: null
    });

    // 이메일 인증 관련 상태
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationError, setVerificationError] = useState('');
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });

        if (name === 'userid' || name === 'email') {
            setChecks({ ...checks, [name]: null });
        }
    };

    const handleCheckUserid = async () => {
        if (!form.userid) {
            setErrors({ ...errors, userid: '아이디를 입력해주세요.' });
            return;
        }
        try {
            const result = await checkUserid(form.userid);
            setChecks({ ...checks, userid: result.available });
            if (!result.available) {
                setErrors({ ...errors, userid: result.message });
            } else {
                setErrors({ ...errors, userid: '' });
            }
        } catch (error) {
            console.error('아이디 중복 체크 실패:', error);
        }
    };

    const handleCheckEmail = async () => {
        if (!form.email) {
            setErrors({ ...errors, email: '이메일을 입력해주세요.' });
            return;
        }
        try {
            const result = await checkEmail(form.email);
            setChecks({ ...checks, email: result.available });
            if (!result.available) {
                setErrors({ ...errors, email: result.message });
            } else {
                setErrors({ ...errors, email: '' });
            }
        } catch (error) {
            console.error('이메일 중복 체크 실패:', error);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!form.userid) newErrors.userid = '아이디를 입력해주세요.';
        else if (checks.userid === false) newErrors.userid = '이미 사용 중인 아이디입니다.';
        else if (checks.userid === null) newErrors.userid = '아이디 중복 체크를 해주세요.';

        if (!form.password) newErrors.password = '비밀번호를 입력해주세요.';
        else if (form.password.length < 4) newErrors.password = '비밀번호는 4자 이상이어야 합니다.';

        if (!form.passwordConfirm) newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.';
        else if (form.password !== form.passwordConfirm) newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';

        if (!form.name) newErrors.name = '이름을 입력해주세요.';

        if (!form.email) newErrors.email = '이메일을 입력해주세요.';
        else if (checks.email === false) newErrors.email = '이미 사용 중인 이메일입니다.';
        else if (checks.email === null) newErrors.email = '이메일 중복 체크를 해주세요.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Step 1: 정보 입력 후 이메일 인증 코드 발송
    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await sendVerificationCode(form.email);
            setStep(2);
            setCountdown(60);
            setCodeExpiry(300); // 5분
            setVerificationError('');
        } catch (error) {
            console.error('인증 코드 발송 실패:', error);
            alert(error.response?.data?.message || '인증 코드 발송에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 인증 코드 재발송
    const handleResendCode = async () => {
        if (countdown > 0) return;

        try {
            await sendVerificationCode(form.email);
            setCountdown(60);
            setCodeExpiry(300);
            setVerificationCode('');
            setVerificationError('');
            alert('인증 코드가 재발송되었습니다.');
        } catch (error) {
            console.error('인증 코드 재발송 실패:', error);
            alert(error.response?.data?.message || '인증 코드 재발송에 실패했습니다.');
        }
    };

    // Step 2: 인증 코드 확인 및 회원가입 완료
    const handleVerifyAndRegister = async (e) => {
        e.preventDefault();

        if (!verificationCode || verificationCode.length !== 6) {
            setVerificationError('6자리 인증 코드를 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 인증 코드 확인
            const verifyResult = await verifyCode(form.email, verificationCode, 'REGISTER');

            if (!verifyResult.success) {
                setVerificationError(verifyResult.message || '인증 코드가 올바르지 않습니다.');
                setIsSubmitting(false);
                return;
            }

            // 회원가입 진행
            const result = await register({
                userid: form.userid,
                password: form.password,
                name: form.name,
                email: form.email,
                phone: form.phone,
                emailVerified: true
            });

            if (result.success) {
                setStep(3);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('회원가입 실패:', error);
            setVerificationError(error.response?.data?.message || '회원가입에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Step 1: 정보 입력 폼
    const renderStep1 = () => (
        <form onSubmit={handleSendCode}>
            <div className="form-group">
                <label>아이디</label>
                <div className="input-with-button">
                    <input
                        type="text"
                        name="userid"
                        value={form.userid}
                        onChange={handleChange}
                        placeholder="아이디를 입력하세요"
                    />
                    <button type="button" className="btn btn-secondary btn-small" onClick={handleCheckUserid}>
                        중복확인
                    </button>
                </div>
                {checks.userid === true && <span className="success-msg">사용 가능한 아이디입니다.</span>}
                {errors.userid && <span className="error-msg">{errors.userid}</span>}
            </div>

            <div className="form-group">
                <label>비밀번호</label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="비밀번호를 입력하세요"
                />
                {errors.password && <span className="error-msg">{errors.password}</span>}
            </div>

            <div className="form-group">
                <label>비밀번호 확인</label>
                <input
                    type="password"
                    name="passwordConfirm"
                    value={form.passwordConfirm}
                    onChange={handleChange}
                    placeholder="비밀번호를 다시 입력하세요"
                />
                {errors.passwordConfirm && <span className="error-msg">{errors.passwordConfirm}</span>}
            </div>

            <div className="form-group">
                <label>이름</label>
                <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="이름을 입력하세요"
                />
                {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>

            <div className="form-group">
                <label>이메일</label>
                <div className="input-with-button">
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="이메일을 입력하세요"
                    />
                    <button type="button" className="btn btn-secondary btn-small" onClick={handleCheckEmail}>
                        중복확인
                    </button>
                </div>
                {checks.email === true && <span className="success-msg">사용 가능한 이메일입니다.</span>}
                {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
                <label>전화번호 (선택)</label>
                <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="전화번호를 입력하세요"
                />
            </div>

            <div className="button-group">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? '처리 중...' : '이메일 인증하기'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/login')}>
                    로그인으로
                </button>
            </div>
        </form>
    );

    // Step 2: 이메일 인증 코드 입력
    const renderStep2 = () => (
        <form onSubmit={handleVerifyAndRegister}>
            <div className="verification-info">
                <p><strong>{form.email}</strong>로 인증 코드를 발송했습니다.</p>
                <p>이메일에서 6자리 인증 코드를 확인해주세요.</p>
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
                {verificationError && <span className="error-msg">{verificationError}</span>}
            </div>

            <div className="button-group">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || codeExpiry === 0}
                >
                    {isSubmitting ? '처리 중...' : '인증 확인 및 가입'}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResendCode}
                    disabled={countdown > 0}
                >
                    {countdown > 0 ? `재발송 (${countdown}초)` : '인증 코드 재발송'}
                </button>
            </div>

            <div className="step-back">
                <button type="button" className="btn-link" onClick={() => setStep(1)}>
                    ← 이전 단계로
                </button>
            </div>
        </form>
    );

    // Step 3: 가입 완료
    const renderStep3 = () => (
        <div className="complete-section">
            <div className="complete-icon">✓</div>
            <h3>회원가입이 완료되었습니다!</h3>
            <p>{form.name}님, 환영합니다.</p>
            <p>이제 로그인하여 Synodos를 이용해보세요.</p>
            <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/login')}
            >
                로그인하기
            </button>
        </div>
    );

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>회원가입</h2>

                {/* 단계 표시 */}
                <div className="step-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">정보 입력</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">이메일 인증</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <span className="step-number">3</span>
                        <span className="step-label">완료</span>
                    </div>
                </div>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
}

export default Register;
