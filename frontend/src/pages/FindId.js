import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findUserid } from '../api/memberApi';
import './Auth.css';

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
        <div className="auth-container">
            <div className="auth-box">
                <h2>아이디 찾기</h2>

                {!result ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>이름</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="이름을 입력하세요"
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
                            <button type="submit" className="btn btn-primary">아이디 찾기</button>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/login')}>
                                로그인으로
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="result-box">
                        <h3>아이디를 찾았습니다!</h3>
                        <p>회원님의 아이디는</p>
                        <div className="userid-display">{result}</div>
                        <p>입니다.</p>
                        <div className="button-group" style={{ marginTop: '20px' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/login')}>
                                로그인하기
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/find-password')}>
                                비밀번호 찾기
                            </button>
                        </div>
                    </div>
                )}

                <div className="auth-links">
                    <span onClick={() => navigate('/find-password')}>비밀번호 찾기</span>
                    <span className="divider">|</span>
                    <span onClick={() => navigate('/register')}>회원가입</span>
                </div>
            </div>
        </div>
    );
}

export default FindId;
