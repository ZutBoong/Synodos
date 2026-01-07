import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findUserid } from '../api/memberApi';
import ShaderBackground from '../components/landing/shader-background';

function FindId() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: ''
    });
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        setError('');
        setResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name || !form.email) {
            setError('이름과 이메일을 입력해주세요.');
            return;
        }

        try {
            const response = await findUserid(form);

            if (response.success) {
                setResult(response.userid);
                setError('');
            } else {
                setError(response.message);
                setResult(null);
            }
        } catch (error) {
            console.error('아이디 찾기 실패:', error);
            setError('아이디 찾기에 실패했습니다.');
        }
    };

    return (
        <ShaderBackground>
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <div 
                    className="w-full max-w-md p-8 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20"
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
                    <h2 className="text-3xl font-light text-white mb-8 text-center">
                        아이디 찾기
                    </h2>

                    {!result ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-light text-white/95 uppercase tracking-wider">
                                    이름
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="이름을 입력하세요"
                                    className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/20 text-white placeholder-white/60 text-sm font-light focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all duration-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-light text-white/95 uppercase tracking-wider">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="가입 시 등록한 이메일을 입력하세요"
                                    className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/20 text-white placeholder-white/60 text-sm font-light focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all duration-200"
                                />
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 text-xs text-center">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    type="submit" 
                                    className="flex-1 px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer"
                                >
                                    아이디 찾기
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
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center space-y-4">
                                <h3 className="text-xl font-light text-white">아이디를 찾았습니다!</h3>
                                <p className="text-white/90 text-sm">회원님의 아이디는</p>
                                <div className="px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white text-xl font-light">
                                    {result}
                                </div>
                                <p className="text-white/90 text-sm">입니다.</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    className="flex-1 px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer"
                                    onClick={() => navigate('/login')}
                                >
                                    로그인하기
                                </button>
                                <button 
                                    className="flex-1 px-8 py-3 rounded-full bg-transparent border border-white/30 text-white font-normal text-xs transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer"
                                    onClick={() => navigate('/find-password')}
                                >
                                    비밀번호 찾기
                                </button>
                            </div>
                        </div>
                    )}

                    {!result && (
                        <div className="text-center space-x-4 text-xs mt-8">
                            <span 
                                onClick={() => navigate('/find-password')} 
                                className="text-white/90 hover:text-white cursor-pointer transition-colors"
                            >
                                비밀번호 찾기
                            </span>
                            <span className="text-white/50">|</span>
                            <span 
                                onClick={() => navigate('/register')} 
                                className="text-white/90 hover:text-white cursor-pointer transition-colors"
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

export default FindId;
