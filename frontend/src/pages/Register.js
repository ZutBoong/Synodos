import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, checkUserid, checkEmail } from '../api/memberApi';
import { sendVerificationCode, verifyCode } from '../api/emailApi';
import ShaderBackground from '../components/landing/shader-background';

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
            setErrors({ ...errors, userid: error.response?.data?.message || '중복 체크 중 오류가 발생했습니다.' });
            setChecks({ ...checks, userid: null });
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
            setErrors({ ...errors, email: error.response?.data?.message || '중복 체크 중 오류가 발생했습니다.' });
            setChecks({ ...checks, email: null });
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
        <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                    아이디
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        name="userid"
                        value={form.userid}
                        onChange={handleChange}
                        placeholder="아이디를 입력하세요"
                        className="flex-1 px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                    />
                    <button 
                        type="button" 
                        className="px-4 py-3 rounded-full bg-transparent border border-white/40 text-white text-sm font-medium transition-all duration-200 hover:bg-white/20 hover:border-white/60 whitespace-nowrap"
                        onClick={handleCheckUserid}
                    >
                        중복확인
                    </button>
                </div>
                {checks.userid === true && (
                    <span className="text-sm font-semibold text-green-100 px-2">사용 가능한 아이디입니다.</span>
                )}
                {errors.userid && (
                    <span className="text-sm font-semibold text-red-100 px-2">{errors.userid}</span>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                    비밀번호
                </label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                />
                {errors.password && (
                    <span className="text-xs text-red-200 px-2">{errors.password}</span>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                    비밀번호 확인
                </label>
                <input
                    type="password"
                    name="passwordConfirm"
                    value={form.passwordConfirm}
                    onChange={handleChange}
                    placeholder="비밀번호를 다시 입력하세요"
                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                />
                {errors.passwordConfirm && (
                    <span className="text-xs text-red-200 px-2">{errors.passwordConfirm}</span>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                    이름
                </label>
                <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="이름을 입력하세요"
                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                />
                {errors.name && (
                    <span className="text-xs text-red-200 px-2">{errors.name}</span>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                    이메일
                </label>
                <div className="flex gap-2">
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="이메일을 입력하세요"
                        className="flex-1 px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                    />
                    <button 
                        type="button" 
                        className="px-4 py-3 rounded-full bg-transparent border border-white/40 text-white text-sm font-medium transition-all duration-200 hover:bg-white/20 hover:border-white/60 whitespace-nowrap"
                        onClick={handleCheckEmail}
                    >
                        중복확인
                    </button>
                </div>
                {checks.email === true && (
                    <span className="text-xs text-green-200 px-2">사용 가능한 이메일입니다.</span>
                )}
                {errors.email && (
                    <span className="text-xs text-red-200 px-2">{errors.email}</span>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                    전화번호 (선택)
                </label>
                <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="전화번호를 입력하세요"
                    className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                />
            </div>

            <div className="flex gap-4 pt-2">
                <button 
                    type="submit" 
                    className="flex-1 px-8 py-3 rounded-full bg-white text-black font-semibold text-base transition-all duration-200 hover:bg-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? '처리 중...' : '이메일 인증하기'}
                </button>
                <button 
                    type="button" 
                    className="flex-1 px-8 py-3 rounded-full bg-transparent border border-white/30 text-white font-normal text-xs transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer"
                    onClick={() => navigate('/login')}
                >
                    로그인으로
                </button>
            </div>
        </form>
    );

    // Step 2: 이메일 인증 코드 입력
    const renderStep2 = () => (
        <form onSubmit={handleVerifyAndRegister} className="space-y-6">
            <div className="px-4 py-4 rounded-full bg-white/20 border border-white/30 text-center space-y-2">
                <p className="text-white text-sm font-medium"><strong className="font-bold">{form.email}</strong>로 인증 코드를 발송했습니다.</p>
                <p className="text-white text-sm font-medium">이메일에서 6자리 인증 코드를 확인해주세요.</p>
                {codeExpiry > 0 && (
                    <p className="text-yellow-300 text-xs">남은 시간: <strong>{formatTime(codeExpiry)}</strong></p>
                )}
                {codeExpiry === 0 && (
                    <p className="text-red-300 text-xs">인증 코드가 만료되었습니다. 재발송해주세요.</p>
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
                {verificationError && (
                    <span className="text-sm font-semibold text-red-100 px-2">{verificationError}</span>
                )}
            </div>

            <div className="flex gap-4">
                <button
                    type="submit"
                    className="flex-1 px-8 py-3 rounded-full bg-white text-black font-semibold text-base transition-all duration-200 hover:bg-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || codeExpiry === 0}
                >
                    {isSubmitting ? '처리 중...' : '인증 확인 및 가입'}
                </button>
                <button
                    type="button"
                    className="flex-1 px-8 py-3 rounded-full bg-transparent border border-white/40 text-white font-medium text-base transition-all duration-200 hover:bg-white/20 hover:border-white/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleResendCode}
                    disabled={countdown > 0}
                >
                    {countdown > 0 ? `재발송 (${countdown}초)` : '인증 코드 재발송'}
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
    );

    // Step 3: 가입 완료
    const renderStep3 = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto text-3xl text-green-200">
                ✓
            </div>
            <h3 className="text-xl font-light text-white">회원가입이 완료되었습니다!</h3>
            <p className="text-white text-base font-medium">{form.name}님, 환영합니다.</p>
            <p className="text-white text-base font-medium">이제 로그인하여 Synodos를 이용해보세요.</p>
            <button
                type="button"
                className="w-full px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer"
                onClick={() => navigate('/login')}
            >
                로그인하기
            </button>
        </div>
    );

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
                        회원가입
                    </h2>

                    {/* 단계 표시 */}
                    <div className="flex items-center justify-center mb-8 gap-2">
                        <div className={`flex flex-col items-center ${step >= 1 ? 'text-white' : 'text-white/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light border transition-all ${
                                step > 1 ? 'bg-green-500/20 border-green-500/50' : 
                                step >= 1 ? 'bg-white/10 border-white/30' : 
                                'bg-white/5 border-white/20'
                            }`}>
                                {step > 1 ? '✓' : '1'}
                            </div>
                            <span className="text-xs mt-1">정보 입력</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-2"></div>
                        <div className={`flex flex-col items-center ${step >= 2 ? 'text-white' : 'text-white/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light border transition-all ${
                                step > 2 ? 'bg-green-500/20 border-green-500/50' : 
                                step >= 2 ? 'bg-white/10 border-white/30' : 
                                'bg-white/5 border-white/20'
                            }`}>
                                {step > 2 ? '✓' : '2'}
                            </div>
                            <span className="text-xs mt-1">이메일 인증</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-2"></div>
                        <div className={`flex flex-col items-center ${step >= 3 ? 'text-white' : 'text-white/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light border transition-all ${
                                step >= 3 ? 'bg-white/10 border-white/30' : 
                                'bg-white/5 border-white/20'
                            }`}>
                                3
                            </div>
                            <span className="text-xs mt-1">완료</span>
                        </div>
                    </div>

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>
            </div>
        </ShaderBackground>
    );
}

export default Register;
