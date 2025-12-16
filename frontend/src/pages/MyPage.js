import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword } from '../api/memberApi';
import { getMyTeams } from '../api/teamApi';
import './MyPage.css';

function MyPage() {
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [teams, setTeams] = useState([]);
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);

    // 프로필 수정 폼
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // 비밀번호 변경 폼
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const storedMember = localStorage.getItem('member');
        if (!storedMember) {
            navigate('/login');
            return;
        }

        const memberData = JSON.parse(storedMember);
        fetchData(memberData.no);
    }, [navigate]);

    const fetchData = async (memberNo) => {
        try {
            setLoading(true);
            const [profileRes, teamsRes] = await Promise.all([
                getProfile(memberNo),
                getMyTeams(memberNo)
            ]);

            if (profileRes.success) {
                setMember(profileRes.member);
                setProfileForm({
                    name: profileRes.member.name || '',
                    email: profileRes.member.email || '',
                    phone: profileRes.member.phone || ''
                });
            }
            setTeams(teamsRes || []);
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm({ ...profileForm, [name]: value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });

        if (!profileForm.name.trim()) {
            setProfileMessage({ type: 'error', text: '이름을 입력해주세요.' });
            return;
        }
        if (!profileForm.email.trim()) {
            setProfileMessage({ type: 'error', text: '이메일을 입력해주세요.' });
            return;
        }

        try {
            const result = await updateProfile({
                no: member.no,
                name: profileForm.name,
                email: profileForm.email,
                phone: profileForm.phone
            });

            if (result.success) {
                setProfileMessage({ type: 'success', text: result.message });
                setMember(result.member);
                // localStorage 업데이트
                const storedMember = JSON.parse(localStorage.getItem('member'));
                localStorage.setItem('member', JSON.stringify({
                    ...storedMember,
                    name: result.member.name,
                    email: result.member.email
                }));
            } else {
                setProfileMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: '회원 정보 수정에 실패했습니다.' });
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm({ ...passwordForm, [name]: value });
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (!passwordForm.currentPassword) {
            setPasswordMessage({ type: 'error', text: '현재 비밀번호를 입력해주세요.' });
            return;
        }
        if (!passwordForm.newPassword) {
            setPasswordMessage({ type: 'error', text: '새 비밀번호를 입력해주세요.' });
            return;
        }
        if (passwordForm.newPassword.length < 4) {
            setPasswordMessage({ type: 'error', text: '비밀번호는 4자 이상이어야 합니다.' });
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
            return;
        }

        try {
            const result = await changePassword({
                no: member.no,
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            if (result.success) {
                setPasswordMessage({ type: 'success', text: result.message });
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                setPasswordMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: '비밀번호 변경에 실패했습니다.' });
        }
    };

    if (loading) {
        return (
            <div className="mypage-container">
                <div className="loading">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="mypage-container">
            <div className="mypage-box">
                <h2>마이페이지</h2>

                <div className="mypage-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        프로필 정보
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
                        onClick={() => setActiveTab('password')}
                    >
                        비밀번호 변경
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teams')}
                    >
                        내 팀 목록
                    </button>
                </div>

                <div className="mypage-content">
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit}>
                            <div className="form-group">
                                <label>아이디</label>
                                <input
                                    type="text"
                                    value={member?.userid || ''}
                                    disabled
                                    className="disabled"
                                />
                            </div>
                            <div className="form-group">
                                <label>이름</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profileForm.name}
                                    onChange={handleProfileChange}
                                    placeholder="이름을 입력하세요"
                                />
                            </div>
                            <div className="form-group">
                                <label>이메일</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileForm.email}
                                    onChange={handleProfileChange}
                                    placeholder="이메일을 입력하세요"
                                />
                            </div>
                            <div className="form-group">
                                <label>전화번호</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={profileForm.phone}
                                    onChange={handleProfileChange}
                                    placeholder="전화번호를 입력하세요"
                                />
                            </div>
                            {profileMessage.text && (
                                <div className={`message ${profileMessage.type}`}>
                                    {profileMessage.text}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary">
                                정보 수정
                            </button>
                        </form>
                    )}

                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label>현재 비밀번호</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordForm.currentPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="현재 비밀번호를 입력하세요"
                                />
                            </div>
                            <div className="form-group">
                                <label>새 비밀번호</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="새 비밀번호를 입력하세요"
                                />
                            </div>
                            <div className="form-group">
                                <label>새 비밀번호 확인</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordForm.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="새 비밀번호를 다시 입력하세요"
                                />
                            </div>
                            {passwordMessage.text && (
                                <div className={`message ${passwordMessage.type}`}>
                                    {passwordMessage.text}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary">
                                비밀번호 변경
                            </button>
                        </form>
                    )}

                    {activeTab === 'teams' && (
                        <div className="teams-list">
                            {teams.length === 0 ? (
                                <div className="empty-message">
                                    소속된 팀이 없습니다.
                                </div>
                            ) : (
                                teams.map(team => (
                                    <div key={team.teamId} className="team-card">
                                        <div className="team-info">
                                            <h4>{team.teamName}</h4>
                                            <span className="team-code">{team.teamCode}</span>
                                        </div>
                                        <div className="team-role">
                                            {team.leaderNo === member?.no ? (
                                                <span className="role-badge leader">리더</span>
                                            ) : (
                                                <span className="role-badge member">멤버</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="mypage-footer">
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        뒤로가기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MyPage;
