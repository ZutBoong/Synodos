import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/memberApi';
import { sendPasswordResetCode, verifyCode } from '../api/emailApi';
import ShaderBackground from '../components/landing/shader-background';

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
        <ShaderBackground>
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <div 
                    className="w-full max-w-md p-8 rounded-3xl bg-white/35 backdrop-blur-sm border border-white/30"
                    style={{ filter: "url(#glass-effect)" }}
                >
                    {/* SVG Filters */}
                    <svg className="absolute inset-0 w-0 h-0">
                        <defs>
                            <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
                                <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
                                <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
                                <feColorMatrix
                                    type="matrix"
                                    values="1 0 0 0 0.02
                                      0 1 0 0 0.02
                                      0 0 1 0 0.05
                                      0 0 0 0.9 0"
                                    result="tint"
                                />
                            </filter>
                        </defs>
                    </svg>

                    {/* Title */}
                    <h2 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-lg">
                        비밀번호 찾기
                    </h2>

                    {/* 단계 표시 */}
                    <div className="flex items-center justify-center mb-8 gap-2">
                        <div className={`flex flex-col items-center ${step >= 1 ? 'text-white' : 'text-white/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light border transition-all ${
                                step > 1 ? 'bg-green-500/20 border-green-500/50' : 
                                step >= 1 ? 'bg-white/25 border-white/40' : 
                                'bg-white/15 border-white/30'
                            }`}>
                                {step > 1 ? '✓' : '1'}
                            </div>
                            <span className="text-sm font-medium mt-1">이메일 입력</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-2"></div>
                        <div className={`flex flex-col items-center ${step >= 2 ? 'text-white' : 'text-white/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light border transition-all ${
                                step > 2 ? 'bg-green-500/20 border-green-500/50' : 
                                step >= 2 ? 'bg-white/25 border-white/40' : 
                                'bg-white/15 border-white/30'
                            }`}>
                                {step > 2 ? '✓' : '2'}
                            </div>
                            <span className="text-sm font-medium mt-1">인증</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-2"></div>
                        <div className={`flex flex-col items-center ${step >= 3 ? 'text-white' : 'text-white/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light border transition-all ${
                                step > 3 ? 'bg-green-500/20 border-green-500/50' : 
                                step >= 3 ? 'bg-white/25 border-white/40' : 
                                'bg-white/15 border-white/30'
                            }`}>
                                {step > 3 ? '✓' : '3'}
                            </div>
                            <span className="text-sm font-medium mt-1">비밀번호 변경</span>
                        </div>
                    </div>

                    {/* Step 1: 이메일 입력 */}
                    {step === 1 && (
                        <form onSubmit={handleSendCode} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                    placeholder="가입 시 등록한 이메일을 입력하세요"
                                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                                />
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-100 text-sm font-semibold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    type="submit" 
                                    className="flex-1 px-8 py-3 rounded-full bg-white text-black font-semibold text-base transition-all duration-200 hover:bg-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '처리 중...' : '인증 코드 받기'}
                                </button>
                                <button 
                                    type="button" 
                                    className="flex-1 px-8 py-3 rounded-full bg-transparent border border-white/40 text-white font-medium text-base transition-all duration-200 hover:bg-white/20 hover:border-white/60 cursor-pointer"
                                    onClick={() => navigate('/login')}
                                >
                                    로그인으로
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 2: 인증 코드 입력 */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div className="px-4 py-4 rounded-full bg-white/20 border border-white/30 text-center space-y-2">
                                <p className="text-white text-sm font-medium"><strong className="font-bold">{email}</strong>로 인증 코드를 발송했습니다.</p>
                                {userid && <p className="text-white text-sm font-medium">아이디: <strong className="font-bold">{userid}</strong></p>}
                                {codeExpiry > 0 && (
                                    <p className="text-yellow-200 text-sm font-semibold">남은 시간: <strong className="font-bold">{formatTime(codeExpiry)}</strong></p>
                                )}
                                {codeExpiry === 0 && (
                                    <p className="text-red-100 text-sm font-semibold">인증 코드가 만료되었습니다. 재발송해주세요.</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                    인증 코드
                                </label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="6자리 인증 코드 입력"
                                    maxLength={6}
                                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-center text-xl font-semibold tracking-widest focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                                />
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-100 text-sm font-semibold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-8 py-3 rounded-full bg-white text-black font-semibold text-base transition-all duration-200 hover:bg-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting || codeExpiry === 0}
                                >
                                    {isSubmitting ? '확인 중...' : '인증 확인'}
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 px-8 py-3 rounded-full bg-transparent border border-white/30 text-white font-normal text-xs transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleResendCode}
                                    disabled={countdown > 0}
                                >
                                    {countdown > 0 ? `재발송 (${countdown}초)` : '재발송'}
                                </button>
                            </div>

                            <div className="text-center">
                                <button 
                                    type="button" 
                                    className="text-white font-medium hover:text-white/90 text-sm transition-colors"
                                    onClick={() => setStep(1)}
                                >
                                    ← 이전 단계로
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: 비밀번호 변경 */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="px-4 py-4 rounded-full bg-green-500/20 border border-green-500/30 text-center">
                                <p className="text-green-100 text-sm font-semibold">이메일 인증이 완료되었습니다.</p>
                                <p className="text-green-100 text-sm font-semibold mt-1">새 비밀번호를 설정해주세요.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                    새 비밀번호
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={passwordForm.password}
                                    onChange={handlePasswordChange}
                                    placeholder="새 비밀번호를 입력하세요"
                                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                    새 비밀번호 확인
                                </label>
                                <input
                                    type="password"
                                    name="passwordConfirm"
                                    value={passwordForm.passwordConfirm}
                                    onChange={handlePasswordChange}
                                    placeholder="새 비밀번호를 다시 입력하세요"
                                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                                />
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-100 text-sm font-semibold text-center">
                                    {error}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="w-full px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                            </button>
                        </form>
                    )}

                    {/* Step 4: 완료 */}
                    {step === 4 && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto text-3xl text-green-200">
                                ✓
                            </div>
                            <h3 className="text-xl font-light text-white">비밀번호가 변경되었습니다!</h3>
                            <p className="text-white text-base font-medium">새 비밀번호로 로그인해주세요.</p>
                            <button
                                className="w-full px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer"
                                onClick={() => navigate('/login')}
                            >
                                로그인하기
                            </button>
                        </div>
                    )}

                    {step < 4 && (
                        <div className="text-center space-x-4 text-xs mt-8">
                            <span 
                                onClick={() => navigate('/find-id')} 
                                className="text-white font-medium hover:text-white/90 cursor-pointer transition-colors drop-shadow-sm"
                            >
                                아이디 찾기
                            </span>
                            <span className="text-white/50">|</span>
                            <span 
                                onClick={() => navigate('/register')} 
                                className="text-white font-medium hover:text-white/90 cursor-pointer transition-colors drop-shadow-sm"
                            >
                                회원가입
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </ShaderBackground>
    );
}

export default FindPassword;
