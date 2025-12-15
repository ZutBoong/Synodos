import React, { useState, useEffect, useRef } from 'react';
import { getTagsByTeam, createTag } from '../api/tagApi';
import './TagInput.css';

const DEFAULT_COLORS = [
    '#dc3545', '#fd7e14', '#ffc107', '#28a745',
    '#20c997', '#17a2b8', '#0d6efd', '#6f42c1',
    '#e83e8c', '#6c757d'
];

function TagInput({ teamId, selectedTags = [], onChange }) {
    const [teamTags, setTeamTags] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (teamId) {
            fetchTeamTags();
        }
    }, [teamId]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setShowCreateForm(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTeamTags = async () => {
        try {
            const tags = await getTagsByTeam(teamId);
            setTeamTags(tags || []);
        } catch (error) {
            console.error('태그 목록 조회 실패:', error);
        }
    };

    const handleTagToggle = (tag) => {
        const isSelected = selectedTags.some(t => t.tagId === tag.tagId);
        if (isSelected) {
            onChange(selectedTags.filter(t => t.tagId !== tag.tagId));
        } else {
            onChange([...selectedTags, tag]);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            const newTag = await createTag({
                teamId,
                tagName: newTagName.trim(),
                color: newTagColor
            });
            setTeamTags([...teamTags, newTag]);
            onChange([...selectedTags, newTag]);
            setNewTagName('');
            setShowCreateForm(false);
        } catch (error) {
            console.error('태그 생성 실패:', error);
        }
    };

    const removeTag = (tagId, e) => {
        e.stopPropagation();
        onChange(selectedTags.filter(t => t.tagId !== tagId));
    };

    return (
        <div className="tag-input-container" ref={containerRef}>
            <div className="selected-tags" onClick={() => setIsOpen(!isOpen)}>
                {selectedTags.length === 0 ? (
                    <span className="placeholder">태그 선택...</span>
                ) : (
                    selectedTags.map(tag => (
                        <span
                            key={tag.tagId}
                            className="tag-pill"
                            style={{ backgroundColor: tag.color }}
                        >
                            {tag.tagName}
                            <button
                                className="tag-remove"
                                onClick={(e) => removeTag(tag.tagId, e)}
                            >
                                ×
                            </button>
                        </span>
                    ))
                )}
                <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
                <div className="tag-dropdown">
                    <div className="tag-list">
                        {teamTags.map(tag => {
                            const isSelected = selectedTags.some(t => t.tagId === tag.tagId);
                            return (
                                <div
                                    key={tag.tagId}
                                    className={`tag-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleTagToggle(tag)}
                                >
                                    <span
                                        className="tag-color"
                                        style={{ backgroundColor: tag.color }}
                                    />
                                    <span className="tag-name">{tag.tagName}</span>
                                    {isSelected && <span className="checkmark">✓</span>}
                                </div>
                            );
                        })}
                        {teamTags.length === 0 && !showCreateForm && (
                            <div className="no-tags">태그가 없습니다</div>
                        )}
                    </div>

                    {showCreateForm ? (
                        <div className="create-tag-form">
                            <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="새 태그 이름"
                                autoFocus
                            />
                            <div className="color-picker">
                                {DEFAULT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        className={`color-option ${newTagColor === color ? 'selected' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewTagColor(color)}
                                    />
                                ))}
                            </div>
                            <div className="form-actions">
                                <button className="btn-cancel" onClick={() => setShowCreateForm(false)}>취소</button>
                                <button className="btn-create" onClick={handleCreateTag}>생성</button>
                            </div>
                        </div>
                    ) : (
                        <button className="add-tag-btn" onClick={() => setShowCreateForm(true)}>
                            + 새 태그 만들기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default TagInput;
