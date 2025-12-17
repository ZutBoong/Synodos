import React, { useState, useEffect, useRef } from 'react';
import { getTagsByTeam } from '../api/tagApi';
import './FilterBar.css';

const STATUSES = [
    { value: 'OPEN', label: '열림' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'RESOLVED', label: '해결됨' },
    { value: 'CLOSED', label: '닫힘' },
    { value: 'CANNOT_REPRODUCE', label: '재현불가' },
    { value: 'DUPLICATE', label: '중복' }
];

function FilterBar({ teamId, teamMembers, filters, onFilterChange }) {
    const [teamTags, setTeamTags] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMembersDropdown, setShowMembersDropdown] = useState(false);
    const membersDropdownRef = useRef(null);

    // 팀원 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (membersDropdownRef.current && !membersDropdownRef.current.contains(event.target)) {
                setShowMembersDropdown(false);
            }
        };

        if (showMembersDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMembersDropdown]);

    useEffect(() => {
        if (teamId) {
            fetchTeamTags();
        }
    }, [teamId]);

    const fetchTeamTags = async () => {
        try {
            const tags = await getTagsByTeam(teamId);
            setTeamTags(tags || []);
        } catch (error) {
            console.error('태그 목록 조회 실패:', error);
        }
    };

    const handleSearchChange = (e) => {
        onFilterChange({ ...filters, searchQuery: e.target.value });
    };

    const toggleStatus = (status) => {
        const current = filters.statuses || [];
        const updated = current.includes(status)
            ? current.filter(s => s !== status)
            : [...current, status];
        onFilterChange({ ...filters, statuses: updated });
    };

    const toggleTag = (tagId) => {
        const current = filters.tags || [];
        const updated = current.includes(tagId)
            ? current.filter(t => t !== tagId)
            : [...current, tagId];
        onFilterChange({ ...filters, tags: updated });
    };

    const handleAssigneeChange = (e) => {
        const value = e.target.value ? parseInt(e.target.value) : null;
        onFilterChange({ ...filters, assigneeNo: value });
    };

    const handleDueDateFilterChange = (e) => {
        onFilterChange({ ...filters, dueDateFilter: e.target.value });
    };

    const clearFilters = () => {
        onFilterChange({
            searchQuery: '',
            statuses: [],
            tags: [],
            assigneeNo: null,
            dueDateFilter: ''
        });
    };

    const hasActiveFilters = () => {
        return filters.searchQuery ||
            (filters.statuses && filters.statuses.length > 0) ||
            (filters.tags && filters.tags.length > 0) ||
            filters.assigneeNo ||
            filters.dueDateFilter;
    };

    return (
        <div className="filter-bar">
            <div className="filter-bar-main">
                <div className="search-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="이슈 검색..."
                        value={filters.searchQuery || ''}
                        onChange={handleSearchChange}
                    />
                </div>

                <button
                    className={`filter-toggle ${isExpanded ? 'active' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    필터
                    {hasActiveFilters() && <span className="filter-badge" />}
                </button>

                {hasActiveFilters() && (
                    <button className="clear-filters" onClick={clearFilters}>
                        필터 초기화
                    </button>
                )}

                {/* 팀원 목록 */}
                {teamMembers && teamMembers.length > 0 && (
                    <div className="team-members-section" ref={membersDropdownRef}>
                        <div
                            className={`team-members-trigger ${showMembersDropdown ? 'active' : ''}`}
                            onClick={() => setShowMembersDropdown(!showMembersDropdown)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>팀원 ({teamMembers.length})</span>
                            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>

                        {/* 팀원 상세 드롭다운 */}
                        {showMembersDropdown && (
                            <div className="members-dropdown">
                                <div className="members-dropdown-header">
                                    <h4>팀원 목록</h4>
                                    <span className="members-count">{teamMembers.length}명</span>
                                </div>
                                <ul className="members-dropdown-list">
                                    {[...teamMembers].sort((a, b) => {
                                        if (a.role === 'LEADER') return -1;
                                        if (b.role === 'LEADER') return 1;
                                        return 0;
                                    }).map(member => (
                                        <li key={member.memberNo} className="members-dropdown-item">
                                            <div className={`member-avatar ${member.role === 'LEADER' ? 'leader' : ''}`}>
                                                {member.memberName?.charAt(0) || 'U'}
                                            </div>
                                            <div className="member-details">
                                                <span className="member-name">
                                                    {member.memberName}
                                                    {member.role === 'LEADER' && <span className="leader-star">★</span>}
                                                </span>
                                                <span className="member-userid">@{member.memberUserid}</span>
                                            </div>
                                            <span className={`member-role-badge ${member.role === 'LEADER' ? 'leader' : 'member'}`}>
                                                {member.role === 'LEADER' ? '팀장' : '멤버'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="filter-bar-expanded">
                    <div className="filter-section">
                        <label>상태</label>
                        <div className="filter-chips">
                            {STATUSES.map(s => (
                                <button
                                    key={s.value}
                                    className={`filter-chip ${(filters.statuses || []).includes(s.value) ? 'active' : ''}`}
                                    onClick={() => toggleStatus(s.value)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {teamTags.length > 0 && (
                        <div className="filter-section">
                            <label>태그</label>
                            <div className="filter-chips">
                                {teamTags.map(tag => (
                                    <button
                                        key={tag.tagId}
                                        className={`filter-chip tag-chip ${(filters.tags || []).includes(tag.tagId) ? 'active' : ''}`}
                                        style={{
                                            '--chip-color': tag.color,
                                            borderColor: (filters.tags || []).includes(tag.tagId) ? tag.color : undefined,
                                            backgroundColor: (filters.tags || []).includes(tag.tagId) ? tag.color : undefined
                                        }}
                                        onClick={() => toggleTag(tag.tagId)}
                                    >
                                        {tag.tagName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="filter-section">
                        <label>담당자</label>
                        <select
                            value={filters.assigneeNo || ''}
                            onChange={handleAssigneeChange}
                        >
                            <option value="">전체</option>
                            {teamMembers.map(member => (
                                <option key={member.memberNo} value={member.memberNo}>
                                    {member.memberName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-section">
                        <label>마감일</label>
                        <select
                            value={filters.dueDateFilter || ''}
                            onChange={handleDueDateFilterChange}
                        >
                            <option value="">전체</option>
                            <option value="overdue">지난 이슈</option>
                            <option value="today">오늘 마감</option>
                            <option value="week">이번 주</option>
                            <option value="nodate">마감일 없음</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FilterBar;
