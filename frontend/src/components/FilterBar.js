import React, { useState, useEffect } from 'react';
import { getTagsByTeam } from '../api/tagApi';
import './FilterBar.css';

const PRIORITIES = [
    { value: 'CRITICAL', label: '긴급', color: '#dc3545' },
    { value: 'HIGH', label: '높음', color: '#fd7e14' },
    { value: 'MEDIUM', label: '보통', color: '#0d6efd' },
    { value: 'LOW', label: '낮음', color: '#6c757d' }
];

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

    const togglePriority = (priority) => {
        const current = filters.priorities || [];
        const updated = current.includes(priority)
            ? current.filter(p => p !== priority)
            : [...current, priority];
        onFilterChange({ ...filters, priorities: updated });
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
            priorities: [],
            statuses: [],
            tags: [],
            assigneeNo: null,
            dueDateFilter: ''
        });
    };

    const hasActiveFilters = () => {
        return filters.searchQuery ||
            (filters.priorities && filters.priorities.length > 0) ||
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
            </div>

            {isExpanded && (
                <div className="filter-bar-expanded">
                    <div className="filter-section">
                        <label>우선순위</label>
                        <div className="filter-chips">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p.value}
                                    className={`filter-chip ${(filters.priorities || []).includes(p.value) ? 'active' : ''}`}
                                    style={{
                                        '--chip-color': p.color,
                                        borderColor: (filters.priorities || []).includes(p.value) ? p.color : undefined,
                                        backgroundColor: (filters.priorities || []).includes(p.value) ? p.color : undefined
                                    }}
                                    onClick={() => togglePriority(p.value)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
