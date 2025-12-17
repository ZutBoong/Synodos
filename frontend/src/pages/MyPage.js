import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword } from '../api/memberApi';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import './MyPage.css';

function MyPage() {
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loginMember, setLoginMember] = useState(null);

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
        setLoginMember(memberData);
        fetchProfile(memberData.no);

        // 저장된 현재 팀 불러오기
        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
            setCurrentTeam(JSON.parse(storedTeam));
        }
    }, [navigate]);

    const fetchProfile = async (memberNo) => {
        try {
            setLoading(true);
            const profileRes = await getProfile(memberNo);

            if (profileRes.success) {
                setMember(profileRes.member);
                setProfileForm({
                    name: profileRes.member.name || '',
                    email: profileRes.member.email || '',
                    phone: profileRes.member.phone || ''
                });
            }
        } catch (error) {
            console.error('프로필 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', JSON.stringify(team));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        navigate('/');
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
                setLoginMember(prev => ({
                    ...prev,
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

    return (
        <div className="mypage-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={currentTeam}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`mypage-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* 헤더 */}
                <header className="mypage-header">
                    <div className="header-left">
                        <h1>마이페이지</h1>
                    </div>
                    <div className="header-right">
                        {loginMember && <NotificationBell memberNo={loginMember.no} />}
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                {/* 메인 콘텐츠 */}
                <div className="mypage-content">
                    {loading ? (
                        <div className="loading">로딩 중...</div>
                    ) : (
                        <div className="mypage-box">
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
                            </div>

                            <div className="mypage-tab-content">
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MyPage;
