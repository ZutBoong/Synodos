import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socialRegister, checkEmail, checkUserid } from '../api/memberApi';
import ShaderBackground from '../components/landing/shader-background';
import './Auth.css';

function SocialSignupComplete() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        userid: '',
        email: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [useridError, setUseridError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);

    // URL 파라미터에서 정보 가져오기
    const params = new URLSearchParams(location.search);
    const provider = params.get('provider');
    const providerId = params.get('providerId');
    const name = params.get('name');
    const initialEmail = params.get('email') || '';
    const needsEmailInput = params.get('needsEmailInput') === 'true';
    // GitHub 로그인 시 추가 정보
    const githubUsername = params.get('githubUsername');
    const githubAccessToken = params.get('githubAccessToken');

    useEffect(() => {
        // 필수 파라미터 체크
        if (!provider || !providerId) {
            navigate('/login');
            return;
        }

        // 이메일이 있으면 폼에 설정
        if (initialEmail) {
            setForm(prev => ({ ...prev, email: initialEmail }));
        }
    }, [provider, providerId, initialEmail, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        setError('');
        if (name === 'userid') {
            setUseridError('');
        }
        if (name === 'email') {
            setEmailError('');
        }
    };

    // 아이디 중복 체크
    const handleUseridBlur = async () => {
        if (!form.userid) return;

        // 아이디 형식 체크 (영문, 숫자, 4-20자)
        if (!/^[a-zA-Z0-9]{4,20}$/.test(form.userid)) {
            setUseridError('아이디는 영문, 숫자 4-20자로 입력해주세요.');
            return;
        }

        try {
            const result = await checkUserid(form.userid);
            if (!result.available) {
                setUseridError('이미 사용 중인 아이디입니다.');
            }
        } catch (error) {
            console.error('아이디 체크 실패:', error);
        }
    };

    // 이메일 중복 체크
    const handleEmailBlur = async () => {
        if (!form.email) return;

        try {
            const result = await checkEmail(form.email);
            if (!result.available) {
                setEmailError('이미 사용 중인 이메일입니다.');
            }
        } catch (error) {
            console.error('이메일 체크 실패:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 아이디 필수 체크
        if (!form.userid) {
            setError('아이디를 입력해주세요.');
            return;
        }

        // 아이디 형식 체크
        if (!/^[a-zA-Z0-9]{4,20}$/.test(form.userid)) {
            setError('아이디는 영문, 숫자 4-20자로 입력해주세요.');
            return;
        }

        // 이메일 필수 체크
        if (!form.email) {
            setError('이메일을 입력해주세요.');
            return;
        }

        // 이메일 형식 체크
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError('올바른 이메일 형식을 입력해주세요.');
            return;
        }

        // 약관 동의 체크
        if (!agreeTerms || !agreePrivacy) {
            setError('필수 약관에 동의해주세요.');
            return;
        }

        if (useridError) {
            setError('아이디 중복을 확인해주세요.');
            return;
        }

        if (emailError) {
            setError('이메일 중복을 확인해주세요.');
            return;
        }

        setLoading(true);
        try {
            const registerData = {
                userid: form.userid,
                email: form.email,
                phone: form.phone || null,
                name: decodeURIComponent(name || ''),
                provider: provider,
                providerId: providerId
            };

            // GitHub 로그인인 경우 GitHub 정보 추가
            if (provider === 'github' && githubUsername) {
                registerData.githubUsername = githubUsername;
                if (githubAccessToken) {
                    registerData.githubAccessToken = githubAccessToken;
                }
            }

            const result = await socialRegister(registerData);

            if (result.success) {
                // 토큰 및 회원 정보 저장
                localStorage.setItem('token', result.token);
                localStorage.setItem('member', JSON.stringify(result.member));
                alert(`${decodeURIComponent(name || '')}님, 회원가입이 완료되었습니다!`);
                navigate('/activity');
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('회원가입 실패:', error);
            setError('회원가입에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const getProviderName = (provider) => {
        switch (provider) {
            case 'google': return 'Google';
            case 'naver': return 'Naver';
            case 'kakao': return 'Kakao';
            case 'github': return 'GitHub';
            default: return provider;
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
                        회원가입
                    </h2>

                    <div className="px-4 py-4 rounded-full bg-white/20 border border-white/30 text-center space-y-2 mb-6">
                        <p className="text-white text-sm font-medium"><strong className="font-bold">{getProviderName(provider)}</strong> 계정으로 가입합니다.</p>
                        <p className="text-white text-sm font-medium">서비스 이용을 위해 추가 정보를 입력해주세요.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 이름 (읽기 전용) */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                이름
                            </label>
                            <input
                                type="text"
                                value={decodeURIComponent(name || '')}
                                disabled
                                className="w-full px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white/70 placeholder-white/50 text-base font-medium focus:outline-none cursor-not-allowed"
                            />
                        </div>

                        {/* 아이디 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                아이디 <span className="text-red-300">*</span>
                            </label>
                            <input
                                type="text"
                                name="userid"
                                value={form.userid}
                                onChange={handleChange}
                                onBlur={handleUseridBlur}
                                placeholder="영문, 숫자 4-20자"
                                autoComplete="username"
                                className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                            />
                            {useridError && <span className="text-sm font-semibold text-red-100 px-2">{useridError}</span>}
                        </div>

                        {/* 이메일 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                이메일 <span className="text-red-300">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                onBlur={handleEmailBlur}
                                placeholder="이메일을 입력해주세요"
                                disabled={!needsEmailInput && initialEmail}
                                className={`w-full px-4 py-3 rounded-full border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 transition-all duration-200 ${
                                    !needsEmailInput && initialEmail
                                        ? 'bg-white/10 cursor-not-allowed text-white/70'
                                        : 'bg-white/20 focus:bg-white/30'
                                }`}
                            />
                            {emailError && <span className="text-sm font-semibold text-red-100 px-2">{emailError}</span>}
                            {needsEmailInput && (
                                <p className="text-xs text-white/80 px-2 mt-1">
                                    {getProviderName(provider)}에서 이메일을 제공받지 못했습니다. 이메일을 직접 입력해주세요.
                                </p>
                            )}
                        </div>

                        {/* 전화번호 (선택) */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-white uppercase tracking-wider drop-shadow-md">
                                전화번호 <span className="text-white/60 text-xs">(선택)</span>
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="010-1234-5678"
                                className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/80 text-base font-medium focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
                            />
                        </div>

                        {/* 약관 동의 */}
                        <div className="mt-6 mb-4 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreeTerms}
                                    onChange={(e) => setAgreeTerms(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                />
                                <span className="text-sm text-white font-medium">
                                <span className="text-red-300">[필수]</span> 서비스 이용약관에 동의합니다.
                            </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreePrivacy}
                                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                />
                                <span className="text-sm text-white font-medium">
                                <span className="text-red-300">[필수]</span> 개인정보 처리방침에 동의합니다.
                            </span>
                            </label>
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-100 text-sm font-semibold mb-4">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4 pt-2">
                            <button
                                type="submit"
                                className="flex-1 px-8 py-3 rounded-full bg-white text-black font-semibold text-base transition-all duration-200 hover:bg-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? '처리 중...' : '가입 완료'}
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
                </div>
            </div>
        </ShaderBackground>
    );
}

export default SocialSignupComplete;
