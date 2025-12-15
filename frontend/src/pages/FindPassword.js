import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findPassword, resetPassword } from '../api/memberApi';
import './Auth.css';

function FindPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: 회원확인, 2: 비밀번호 변경, 3: 완료
    const [form, setForm] = useState({
        userid: '',
        email: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        password: '',
        passwordConfirm: ''
    });
    const [memberNo, setMemberNo] = useState(null);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        setError('');
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm({ ...passwordForm, [name]: value });
        setError('');
    };

    const handleFindPassword = async (e) => {
        e.preventDefault();

        if (!form.userid || !form.email) {
            setError('아이디와 이메일을 입력해주세요.');
            return;
        }

        try {
            const response = await findPassword(form);

            if (response.success) {
                setMemberNo(response.memberNo);
                setStep(2);
                setError('');
            } else {
                setError(response.message);
            }
        } catch (error) {
            console.error('비밀번호 찾기 실패:', error);
            setError('비밀번호 찾기에 실패했습니다.');
        }
    };

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

        try {
            const response = await resetPassword({
                no: memberNo,
                password: passwordForm.password
            });

            if (response.success) {
                setStep(3);
                setError('');
            } else {
                setError(response.message);
            }
        } catch (error) {
            console.error('비밀번호 변경 실패:', error);
            setError('비밀번호 변경에 실패했습니다.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>비밀번호 찾기</h2>

                {step === 1 && (
                    <form onSubmit={handleFindPassword}>
                        <div className="form-group">
                            <label>아이디</label>
                            <input
                                type="text"
                                name="userid"
                                value={form.userid}
                                onChange={handleChange}
                                placeholder="아이디를 입력하세요"
                            />
                        </div>

                        <div className="form-group">
                            <label>이메일</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="가입 시 등록한 이메일을 입력하세요"
                            />
                        </div>

                        {error && <div className="error-msg" style={{ marginBottom: '15px' }}>{error}</div>}

                        <div className="button-group">
                            <button type="submit" className="btn btn-primary">확인</button>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/login')}>
                                로그인으로
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="result-box" style={{ marginBottom: '20px', background: '#e7f3ff' }}>
                            <p>회원 확인이 완료되었습니다.<br />새 비밀번호를 설정해주세요.</p>
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
                            <button type="submit" className="btn btn-primary">비밀번호 변경</button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="result-box">
                        <h3>비밀번호가 변경되었습니다!</h3>
                        <p>새 비밀번호로 로그인해주세요.</p>
                        <div className="button-group" style={{ marginTop: '20px' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/login')}>
                                로그인하기
                            </button>
                        </div>
                    </div>
                )}

                <div className="auth-links">
                    <span onClick={() => navigate('/find-id')}>아이디 찾기</span>
                    <span className="divider">|</span>
                    <span onClick={() => navigate('/register')}>회원가입</span>
                </div>
            </div>
        </div>
    );
}

export default FindPassword;
