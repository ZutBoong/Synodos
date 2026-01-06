import React, { useState, useEffect, useRef, useCallback } from 'react';
import { taskupdate, updateTaskAssignees, updateTaskVerifiers, archiveTask, unarchiveTask, toggleTaskFavorite, checkTaskFavorite } from '../api/boardApi';
import { getTeamMembers, getTeam } from '../api/teamApi';
import { uploadFile, getFilesByTask, deleteFile, formatFileSize, getFileIcon } from '../api/fileApi';
import { createTaskBranch, createTaskPR, getTaskPRs, getBranches, getDefaultBranch, mergePR, getPRDetail, aiResolveConflict, applyConflictResolution } from '../api/githubApi';
import CommentSection from './CommentSection';
import CommitBrowser from './CommitBrowser';
import LinkedCommits from './LinkedCommits';
import GitHubIssueLink from './GitHubIssueLink';
import './TaskDetailView.css';

// 워크플로우 상태 표시
const WORKFLOW_STATUS = {
    WAITING: { label: '대기중', color: '#94a3b8', bg: '#f1f5f9' },
    IN_PROGRESS: { label: '진행중', color: '#3b82f6', bg: '#dbeafe' },
    REVIEW: { label: '검토중', color: '#f59e0b', bg: '#fef3c7' },
    DONE: { label: '완료', color: '#10b981', bg: '#d1fae5' },
    REJECTED: { label: '반려', color: '#ef4444', bg: '#fee2e2' },
    DECLINED: { label: '거부됨', color: '#6b7280', bg: '#f3f4f6' }
};


function TaskDetailView({ task, teamId, onClose, onUpdate, loginMember, lastCommentEvent }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [files, setFiles] = useState([]);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isArchived, setIsArchived] = useState(false);
    const [hasGithubRepo, setHasGithubRepo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // 편집용 폼 상태
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: null, // 우선순위 미설정
        startDate: '',
        startTime: '',
        dueDate: '',
        dueTime: ''
    });
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [selectedVerifiers, setSelectedVerifiers] = useState([]);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [verifierSearch, setVerifierSearch] = useState('');

    const [showCommitBrowser, setShowCommitBrowser] = useState(false);

    // PR 관련 상태
    const [taskPRs, setTaskPRs] = useState([]);
    const [showPRDialog, setShowPRDialog] = useState(false);
    const [branches, setBranches] = useState([]);
    const [defaultBranch, setDefaultBranchState] = useState('main');
    const [prLoading, setPRLoading] = useState(false);
    const [prForm, setPRForm] = useState({
        headBranch: '',
        baseBranch: '',
        title: '',
        body: ''
    });

    // PR 머지 다이얼로그 상태
    const [mergeDialog, setMergeDialog] = useState({
        show: false,
        pr: null,
        prDetail: null,       // PR 상세 정보 (충돌 상태 포함)
        mergeMethod: 'merge',
        loading: false,
        checkingStatus: false // 머지 가능 여부 확인 중
    });

    // AI 충돌 해결 상태
    const [aiResolution, setAiResolution] = useState({
        show: false,           // AI 해결 패널 표시
        filename: null,        // 현재 해결 중인 파일
        loading: false,        // AI 분석 중
        applying: false,       // 해결 코드 적용 중
        result: null,          // AI 해결 결과
        error: null,           // 에러 메시지
        selectedOption: null   // 선택된 옵션 인덱스
    });

    const commentSectionRef = useRef(null);
    const linkedCommitsRef = useRef(null);
    const fileInputRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const initialLoadRef = useRef(true);

    // 탭 상태
    const [activeTab, setActiveTab] = useState('info');

    // task 변경 시 폼 초기화
    useEffect(() => {
        if (task) {
            initialLoadRef.current = true;
            setForm({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || null, // 우선순위 미설정이면 null
                startDate: formatDateForInput(task.startDate),
                startTime: extractTimeFromDateTime(task.startDate),
                dueDate: formatDateForInput(task.dueDate),
                dueTime: extractTimeFromDateTime(task.dueDate)
            });
            setSelectedAssignees(task.assignees?.map(a => a.memberNo) || []);
            setSelectedVerifiers(task.verifiers?.map(v => v.memberNo) || []);
            // 초기 로드 후 플래그 해제
            setTimeout(() => {
                initialLoadRef.current = false;
            }, 100);
        }
    }, [task]);

    useEffect(() => {
        if (teamId) {
            fetchTeamMembers();
            checkGithubRepo();
        }
        if (task?.taskId) {
            fetchFiles();
            fetchFavoriteStatus();
        }
    }, [teamId, task?.taskId]);

    // 자동 저장 함수
    const autoSave = useCallback(async (updatedForm, updatedAssignees, updatedVerifiers) => {
        if (!task?.taskId || initialLoadRef.current) return;

        setSaving(true);
        try {
            const startDateTime = updatedForm.startDate && updatedForm.startTime
                ? `${updatedForm.startDate}T${updatedForm.startTime}`
                : updatedForm.startDate || null;
            const dueDateTime = updatedForm.dueDate && updatedForm.dueTime
                ? `${updatedForm.dueDate}T${updatedForm.dueTime}`
                : updatedForm.dueDate || null;

            const taskData = {
                taskId: task.taskId,
                title: updatedForm.title,
                description: updatedForm.description,
                priority: updatedForm.priority,
                startDate: startDateTime,
                dueDate: dueDateTime,
                assigneeNo: updatedAssignees.length > 0 ? updatedAssignees[0] : null
            };

            await taskupdate(taskData);

            const senderNo = loginMember?.no || null;
            await updateTaskAssignees(task.taskId, updatedAssignees, senderNo);
            await updateTaskVerifiers(task.taskId, updatedVerifiers, senderNo);

            // onUpdate는 패널 닫을 때만 호출 (자동저장 시에는 호출하지 않음)
        } catch (error) {
            console.error('자동 저장 실패:', error);
        } finally {
            setSaving(false);
        }
    }, [task?.taskId, loginMember?.no]);

    // 디바운스된 자동 저장
    const debouncedSave = useCallback((updatedForm, updatedAssignees, updatedVerifiers) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            autoSave(updatedForm, updatedAssignees, updatedVerifiers);
        }, 800);
    }, [autoSave]);

    // 컴포넌트 언마운트 시 타임아웃 정리
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // GitHub → Synodos 댓글 동기화 시 실시간 업데이트
    useEffect(() => {
        if (lastCommentEvent && task?.taskId && commentSectionRef.current) {
            // 이 태스크의 댓글 이벤트인지 확인
            if (lastCommentEvent.payload?.taskId === task.taskId) {
                console.log('Comment event for current task, refreshing...', lastCommentEvent);
                commentSectionRef.current.refresh();
            }
        }
    }, [lastCommentEvent, task?.taskId]);

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const extractTimeFromDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return (hours === '00' && minutes === '00') ? '' : `${hours}:${minutes}`;
    };

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(teamId);
            setTeamMembers(members || []);
        } catch (error) {
            console.error('팀 멤버 조회 실패:', error);
        }
    };

    const checkGithubRepo = async () => {
        try {
            const team = await getTeam(teamId);
            const hasRepo = !!team?.githubRepoUrl;
            setHasGithubRepo(hasRepo);
            if (hasRepo) {
                fetchBranches();
                fetchTaskPRs();
            }
        } catch (error) {
            console.error('팀 정보 조회 실패:', error);
        }
    };

    // 브랜치 목록 조회
    const fetchBranches = async () => {
        if (!teamId) return;
        try {
            const branchList = await getBranches(teamId);
            setBranches(Array.isArray(branchList) ? branchList : []);
            const defBranch = await getDefaultBranch(teamId);
            if (defBranch) {
                setDefaultBranchState(defBranch);
                setPRForm(prev => ({ ...prev, baseBranch: defBranch }));
            }
        } catch (error) {
            console.error('브랜치 목록 조회 실패:', error);
        }
    };

    // Task의 PR 목록 조회
    const fetchTaskPRs = async () => {
        if (!task?.taskId || !teamId) return;
        try {
            const prs = await getTaskPRs(task.taskId, teamId);
            setTaskPRs(Array.isArray(prs) ? prs : []);
        } catch (error) {
            console.error('PR 목록 조회 실패:', error);
            setTaskPRs([]);
        }
    };

    // 작업 브랜치 생성
    const handleCreateBranch = async () => {
        if (!task?.taskId || !teamId) return;
        setPRLoading(true);
        try {
            const result = await createTaskBranch(task.taskId, teamId);
            if (result.success) {
                alert(`브랜치가 생성되었습니다: ${result.branchName}`);
                fetchBranches();
                setPRForm(prev => ({ ...prev, headBranch: result.branchName }));
            }
        } catch (error) {
            console.error('브랜치 생성 실패:', error);
            alert(error.response?.data || '브랜치 생성에 실패했습니다.');
        } finally {
            setPRLoading(false);
        }
    };

    // PR 생성
    const handleCreatePR = async () => {
        if (!prForm.headBranch || !prForm.title.trim()) {
            alert('소스 브랜치와 제목을 입력해주세요.');
            return;
        }
        setPRLoading(true);
        try {
            const result = await createTaskPR(
                task.taskId,
                teamId,
                prForm.headBranch,
                prForm.baseBranch || defaultBranch,
                prForm.title,
                prForm.body
            );
            if (result.success) {
                alert(`PR이 생성되었습니다: #${result.pr.number}`);
                setShowPRDialog(false);
                setPRForm({ headBranch: '', baseBranch: defaultBranch, title: '', body: '' });
                fetchTaskPRs();
            }
        } catch (error) {
            console.error('PR 생성 실패:', error);
            alert(error.response?.data || 'PR 생성에 실패했습니다.');
        } finally {
            setPRLoading(false);
        }
    };

    // PR 다이얼로그 열기
    const openPRDialog = () => {
        setPRForm(prev => ({
            ...prev,
            baseBranch: defaultBranch,
            title: form.title || '',
            body: form.description || ''
        }));
        setShowPRDialog(true);
    };

    // PR 머지 다이얼로그 열기
    const openMergeDialog = async (pr) => {
        setMergeDialog({
            show: true,
            pr: pr,
            prDetail: null,
            mergeMethod: 'merge',
            loading: false,
            checkingStatus: true
        });

        // PR 상세 정보 조회 (머지 가능 여부 확인)
        try {
            const detail = await getPRDetail(teamId, pr.prNumber);
            setMergeDialog(prev => ({
                ...prev,
                prDetail: detail,
                checkingStatus: false
            }));
        } catch (error) {
            console.error('PR 상태 확인 실패:', error);
            setMergeDialog(prev => ({
                ...prev,
                checkingStatus: false
            }));
        }
    };

    // PR 머지 다이얼로그 닫기
    const closeMergeDialog = () => {
        setMergeDialog({
            show: false,
            pr: null,
            prDetail: null,
            mergeMethod: 'merge',
            loading: false,
            checkingStatus: false
        });
    };

    // PR 머지 실행
    const handleMergePR = async (retryCount = 0) => {
        if (!mergeDialog.pr) return;

        setMergeDialog(prev => ({ ...prev, loading: true }));
        try {
            const result = await mergePR(
                teamId,
                mergeDialog.pr.prNumber,
                null, // commitTitle - 기본값 사용
                mergeDialog.mergeMethod
            );

            if (result.merged) {
                alert(`PR #${mergeDialog.pr.prNumber}이(가) 성공적으로 머지되었습니다.`);
                closeMergeDialog();
                fetchTaskPRs(); // PR 목록 새로고침
                // 머지 성공 후 TaskDetailView 닫기
                if (onUpdate) onUpdate();
                onClose();
            } else {
                // 머지 불가능 에러 처리
                const errorMsg = result.message || '';
                if (errorMsg.includes('not mergeable') && retryCount < 2) {
                    // GitHub가 아직 준비되지 않음 - 자동 재시도
                    setMergeDialog(prev => ({ ...prev, loading: true }));
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return handleMergePR(retryCount + 1);
                } else if (errorMsg.includes('not mergeable')) {
                    const retry = window.confirm(
                        'GitHub에서 아직 머지 가능 상태로 업데이트되지 않았습니다.\n' +
                        '충돌 해결 후 GitHub가 상태를 업데이트하는데 시간이 걸릴 수 있습니다.\n\n' +
                        '잠시 후 다시 시도하시겠습니까?'
                    );
                    if (retry) {
                        setMergeDialog(prev => ({ ...prev, loading: true }));
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        return handleMergePR(0);
                    }
                } else {
                    alert(result.message || 'PR 머지에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('PR 머지 실패:', error);
            const errorData = error.response?.data || '';
            if (typeof errorData === 'string' && errorData.includes('not mergeable') && retryCount < 2) {
                // 자동 재시도
                await new Promise(resolve => setTimeout(resolve, 3000));
                return handleMergePR(retryCount + 1);
            } else if (typeof errorData === 'string' && errorData.includes('not mergeable')) {
                const retry = window.confirm(
                    'GitHub에서 아직 머지 가능 상태로 업데이트되지 않았습니다.\n' +
                    '잠시 후 다시 시도하시겠습니까?'
                );
                if (retry) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return handleMergePR(0);
                }
            } else {
                alert(errorData || 'PR 머지에 실패했습니다.');
            }
        } finally {
            setMergeDialog(prev => ({ ...prev, loading: false }));
        }
    };

    // AI 충돌 해결 시작
    const handleAiResolveConflict = async (filename) => {
        if (!mergeDialog.pr) return;

        setAiResolution({
            show: true,
            filename: filename,
            loading: true,
            applying: false,
            result: null,
            error: null,
            selectedOption: null
        });

        try {
            const result = await aiResolveConflict(teamId, mergeDialog.pr.prNumber, filename);

            if (result.success) {
                setAiResolution(prev => ({
                    ...prev,
                    loading: false,
                    result: result
                }));
            } else {
                setAiResolution(prev => ({
                    ...prev,
                    loading: false,
                    error: result.error || 'AI 충돌 해결에 실패했습니다.'
                }));
            }
        } catch (error) {
            console.error('AI 충돌 해결 실패:', error);
            setAiResolution(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data || 'AI 충돌 해결에 실패했습니다.'
            }));
        }
    };

    // AI 해결 코드 적용
    const handleApplyResolution = async () => {
        if (!aiResolution.result || !mergeDialog.pr) return;

        // 선택된 옵션 확인
        const selectedIdx = aiResolution.selectedOption;
        if (selectedIdx === null || !aiResolution.result.options?.[selectedIdx]) {
            alert('해결 옵션을 선택해주세요.');
            return;
        }

        const selectedOption = aiResolution.result.options[selectedIdx];

        setAiResolution(prev => ({ ...prev, applying: true }));

        try {
            const result = await applyConflictResolution(
                teamId,
                mergeDialog.pr.prNumber,
                aiResolution.result.filename,
                selectedOption.code,
                aiResolution.result.headSha
            );

            if (result.success) {
                const resolvedFilename = aiResolution.result.filename;
                alert(`충돌이 해결되었습니다: ${resolvedFilename}`);

                // AI 해결 패널 닫기
                setAiResolution({
                    show: false,
                    filename: null,
                    loading: false,
                    applying: false,
                    result: null,
                    error: null,
                    selectedOption: null
                });

                // 해결된 파일을 충돌 목록에서 제거 (낙관적 업데이트)
                setMergeDialog(prev => {
                    const updatedConflictFiles = prev.prDetail?.conflictFiles?.filter(
                        f => f.filename !== resolvedFilename
                    ) || [];
                    const allResolved = updatedConflictFiles.length === 0;

                    return {
                        ...prev,
                        checkingStatus: true,
                        prDetail: prev.prDetail ? {
                            ...prev.prDetail,
                            conflictFiles: updatedConflictFiles,
                            // 모든 충돌이 해결되면 hasConflicts를 false로
                            hasConflicts: !allResolved,
                            // mergeable도 낙관적으로 true로 설정
                            mergeable: allResolved ? true : prev.prDetail.mergeable
                        } : null
                    };
                });

                // 잠시 대기 후 실제 상태 확인 (백그라운드)
                await new Promise(resolve => setTimeout(resolve, 3000));

                // GitHub 상태 확인 (실패해도 무시 - 낙관적 UI 유지)
                try {
                    const detail = await getPRDetail(teamId, mergeDialog.pr.prNumber);
                    // GitHub가 여전히 충돌이라고 하면 그대로 유지, 아니면 업데이트
                    if (!detail.hasConflicts) {
                        setMergeDialog(prev => ({ ...prev, prDetail: detail, checkingStatus: false }));
                    } else {
                        // GitHub가 충돌이라고 해도 우리가 해결한 파일은 목록에서 제거된 상태 유지
                        setMergeDialog(prev => ({ ...prev, checkingStatus: false }));
                    }
                } catch (e) {
                    console.error('PR 상태 확인 실패:', e);
                    setMergeDialog(prev => ({ ...prev, checkingStatus: false }));
                }
            } else {
                setAiResolution(prev => ({
                    ...prev,
                    applying: false,
                    error: result.error || '해결 코드 적용에 실패했습니다.'
                }));
            }
        } catch (error) {
            console.error('해결 코드 적용 실패:', error);
            setAiResolution(prev => ({
                ...prev,
                applying: false,
                error: error.response?.data || '해결 코드 적용에 실패했습니다.'
            }));
        }
    };

    // AI 해결 취소
    const handleCancelAiResolution = () => {
        setAiResolution({
            show: false,
            filename: null,
            loading: false,
            applying: false,
            result: null,
            error: null,
            selectedOption: null
        });
    };

    const fetchFiles = async () => {
        try {
            const fileList = await getFilesByTask(task.taskId);
            setFiles(fileList || []);
        } catch (error) {
            console.error('파일 목록 조회 실패:', error);
        }
    };

    const fetchFavoriteStatus = async () => {
        if (!loginMember?.no) return;
        try {
            const result = await checkTaskFavorite(task.taskId, loginMember.no);
            setIsFavorite(result.isFavorite);
        } catch (error) {
            console.error('즐겨찾기 상태 확인 실패:', error);
        }
    };

    const handleToggleFavorite = async () => {
        if (!loginMember?.no) return;
        try {
            const result = await toggleTaskFavorite(task.taskId, loginMember.no);
            setIsFavorite(result.isFavorite);
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
        }
    };

    const handleArchiveToggle = async () => {
        if (!loginMember) return;
        try {
            if (isArchived) {
                await unarchiveTask(task.taskId, loginMember.no);
                setIsArchived(false);
            } else {
                await archiveTask(task.taskId, loginMember.no, '');
                setIsArchived(true);
            }
        } catch (error) {
            console.error('아카이브 토글 실패:', error);
        }
    };

    const handleFileDownload = (fileId, originalName) => {
        const downloadUrl = `/api/file/download/${fileId}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !task?.taskId) return;

        setUploading(true);
        try {
            const result = await uploadFile(file, teamId, task.taskId, loginMember.no);
            if (result.success) {
                await fetchFiles();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                alert(result.message || '파일 업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            alert('파일 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleFileDelete = async (fileId) => {
        if (!window.confirm('파일을 삭제하시겠습니까?')) return;
        try {
            const result = await deleteFile(fileId);
            if (result.success) {
                await fetchFiles();
            }
        } catch (error) {
            console.error('파일 삭제 실패:', error);
            alert('파일 삭제에 실패했습니다.');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getMemberInfo = (memberNo) => {
        return teamMembers.find(m => m.memberNo === memberNo);
    };

    const filterMembers = (searchTerm) => {
        if (!searchTerm.trim()) return teamMembers || [];
        return (teamMembers || []).filter(member =>
            member.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.memberUserid.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const newForm = { ...form, [name]: value };
        setForm(newForm);
        debouncedSave(newForm, selectedAssignees, selectedVerifiers);
    };

    const handleAssigneeToggle = (memberNo) => {
        const newAssignees = selectedAssignees.includes(memberNo)
            ? selectedAssignees.filter(no => no !== memberNo)
            : [...selectedAssignees, memberNo];
        setSelectedAssignees(newAssignees);
        debouncedSave(form, newAssignees, selectedVerifiers);
    };

    const handleVerifierToggle = (memberNo) => {
        const newVerifiers = selectedVerifiers.includes(memberNo)
            ? selectedVerifiers.filter(no => no !== memberNo)
            : [...selectedVerifiers, memberNo];
        setSelectedVerifiers(newVerifiers);
        debouncedSave(form, selectedAssignees, newVerifiers);
    };

    const status = WORKFLOW_STATUS[task?.workflowStatus] || WORKFLOW_STATUS.WAITING;

    return (
        <div className="task-detail-view">
            {/* 헤더 */}
            <div className="task-detail-view-header">
                <div className="task-detail-view-header-inner">
                    <div className="header-left">
                        <button className="back-btn" onClick={() => {
                            if (onUpdate) onUpdate();
                            onClose();
                        }}>
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <span className="task-id-badge">#{task?.taskId}</span>
                        <button
                            type="button"
                            className="copy-btn"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(`#${task?.taskId}`);
                                    alert('태스크 ID가 복사되었습니다.');
                                } catch (err) {
                                    console.error('복사 실패:', err);
                                }
                            }}
                            title="태스크 ID 복사"
                        >
                            <i className="fa-regular fa-copy"></i>
                        </button>
                        {saving && (
                            <span className="saving-indicator">
                                <i className="fa-solid fa-circle-notch fa-spin"></i>
                                저장중...
                            </span>
                        )}
                    </div>
                    <div className="header-right">
                        <span
                            className="status-badge"
                            style={{ background: status.bg, color: status.color }}
                        >
                            {status.label}
                        </span>
                        <button
                            className={`action-btn urgent-btn ${form.priority === 'URGENT' ? 'active' : ''}`}
                            onClick={() => {
                                const newPriority = form.priority === 'URGENT' ? null : 'URGENT';
                                const updatedForm = { ...form, priority: newPriority };
                                setForm(updatedForm);
                                debouncedSave(updatedForm, selectedAssignees, selectedVerifiers);
                            }}
                            title={form.priority === 'URGENT' ? '긴급 해제' : '긴급 설정'}
                        >
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </button>
                        <button
                            className={`action-btn favorite-btn ${isFavorite ? 'active' : ''}`}
                            onClick={handleToggleFavorite}
                            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        >
                            <i className={isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                        </button>
                        <button
                            className={`action-btn archive-btn ${isArchived ? 'active' : ''}`}
                            onClick={handleArchiveToggle}
                            title={isArchived ? '아카이브 해제' : '아카이브'}
                        >
                            <i className={isArchived ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="task-detail-view-scroll">
                <div className="task-detail-view-content">
                    {/* 제목 */}
                    <div className="task-title-section">
                        <input
                            type="text"
                            name="title"
                            className="title-input"
                            value={form.title}
                            onChange={handleFormChange}
                            placeholder="태스크 제목을 입력하세요..."
                        />
                    </div>

                    {/* 반려 사유 */}
                    {task?.workflowStatus === 'REJECTED' && task?.rejectionReason && (
                        <div className="rejection-notice">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <div>
                                <strong>반려 사유</strong>
                                <p>{task.rejectionReason}</p>
                            </div>
                        </div>
                    )}

                    {/* 탭 네비게이션 */}
                    <div className="task-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={() => setActiveTab('info')}
                        >
                            <i className="fa-solid fa-circle-info"></i>
                            기본정보
                        </button>
                        {hasGithubRepo && (
                            <button
                                className={`tab-btn ${activeTab === 'github' ? 'active' : ''}`}
                                onClick={() => setActiveTab('github')}
                            >
                                <i className="fa-brands fa-github"></i>
                                GitHub
                                {taskPRs.filter(pr => pr.prState === 'open').length > 0 && (
                                    <span className="tab-badge">{taskPRs.filter(pr => pr.prState === 'open').length}</span>
                                )}
                            </button>
                        )}
                        <button
                            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                            onClick={() => setActiveTab('files')}
                        >
                            <i className="fa-solid fa-paperclip"></i>
                            파일
                            {files.length > 0 && <span className="tab-badge">{files.length}</span>}
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('comments')}
                        >
                            <i className="fa-solid fa-comments"></i>
                            댓글
                        </button>
                    </div>

                    {/* 탭 콘텐츠 */}
                    <div className="tab-content">

                    {/* 기본정보 탭 */}
                    {activeTab === 'info' && (
                    <div className="tab-panel">

                    {/* 일정 */}
                    <div className="task-dates-section">
                        <div className="date-card">
                            <div className="date-card-header">
                                <i className="fa-regular fa-calendar"></i>
                                <span>시작일</span>
                            </div>
                            <div className="date-card-inputs">
                                <input
                                    type="date"
                                    name="startDate"
                                    value={form.startDate}
                                    onChange={handleFormChange}
                                />
                                <input
                                    type="time"
                                    name="startTime"
                                    value={form.startTime}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>
                        <div className="date-arrow">
                            <i className="fa-solid fa-arrow-right"></i>
                        </div>
                        <div className="date-card">
                            <div className="date-card-header">
                                <i className="fa-regular fa-calendar-check"></i>
                                <span>마감일</span>
                            </div>
                            <div className="date-card-inputs">
                                <input
                                    type="date"
                                    name="dueDate"
                                    value={form.dueDate}
                                    onChange={handleFormChange}
                                />
                                <input
                                    type="time"
                                    name="dueTime"
                                    value={form.dueTime}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 담당자 & 검증자 */}
                    <div className="task-people-section">
                        <div className="people-group">
                            <label><i className="fa-solid fa-user"></i> 담당자</label>
                            <div className="member-selector">
                                <input
                                    type="text"
                                    className="member-search"
                                    placeholder="담당자 검색..."
                                    value={assigneeSearch}
                                    onChange={(e) => setAssigneeSearch(e.target.value)}
                                />
                                {assigneeSearch.trim() && (
                                    <div className="member-dropdown">
                                        {filterMembers(assigneeSearch).map(member => (
                                            <div
                                                key={member.memberNo}
                                                className={`member-option ${selectedAssignees.includes(member.memberNo) ? 'selected' : ''}`}
                                                onClick={() => handleAssigneeToggle(member.memberNo)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAssignees.includes(member.memberNo)}
                                                    onChange={() => {}}
                                                />
                                                <span>{member.memberName}</span>
                                                <span className="member-id">@{member.memberUserid}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="selected-members">
                                    {selectedAssignees.map(memberNo => {
                                        const member = getMemberInfo(memberNo);
                                        const assignee = task?.assignees?.find(a => a.memberNo === memberNo);
                                        return member ? (
                                            <span key={memberNo} className="selected-tag">
                                                {member.memberName}
                                                {assignee?.accepted && <i className="fa-solid fa-check status-check"></i>}
                                                {assignee?.completed && <i className="fa-solid fa-check-double status-check"></i>}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAssigneeToggle(memberNo)}
                                                >×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="people-group">
                            <label><i className="fa-solid fa-user-check"></i> 검증자</label>
                            <div className="member-selector">
                                <input
                                    type="text"
                                    className="member-search"
                                    placeholder="검증자 검색..."
                                    value={verifierSearch}
                                    onChange={(e) => setVerifierSearch(e.target.value)}
                                />
                                {verifierSearch.trim() && (
                                    <div className="member-dropdown">
                                        {filterMembers(verifierSearch).map(member => (
                                            <div
                                                key={member.memberNo}
                                                className={`member-option ${selectedVerifiers.includes(member.memberNo) ? 'selected' : ''}`}
                                                onClick={() => handleVerifierToggle(member.memberNo)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedVerifiers.includes(member.memberNo)}
                                                    onChange={() => {}}
                                                />
                                                <span>{member.memberName}</span>
                                                <span className="member-id">@{member.memberUserid}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="selected-members">
                                    {selectedVerifiers.map(memberNo => {
                                        const member = getMemberInfo(memberNo);
                                        const verifier = task?.verifiers?.find(v => v.memberNo === memberNo);
                                        return member ? (
                                            <span key={memberNo} className="selected-tag verifier">
                                                {member.memberName}
                                                {verifier?.approved && <i className="fa-solid fa-check status-check"></i>}
                                                <button
                                                    type="button"
                                                    onClick={() => handleVerifierToggle(memberNo)}
                                                >×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 설명 */}
                    <div className="task-description-section">
                        <label><i className="fa-solid fa-align-left"></i> 설명</label>
                        <textarea
                            name="description"
                            className="description-textarea"
                            value={form.description}
                            onChange={handleFormChange}
                            placeholder="태스크에 대한 설명을 입력하세요..."
                            rows={5}
                        />
                    </div>

                    </div>
                    )}

                    {/* GitHub 탭 */}
                    {activeTab === 'github' && hasGithubRepo && (
                    <div className="tab-panel">

                    {/* GitHub 커밋 */}
                    <div className="task-section">
                        <div className="section-header-row">
                            <label><i className="fa-brands fa-github"></i> 연결된 커밋</label>
                            <button
                                type="button"
                                className="link-commit-btn"
                                onClick={() => setShowCommitBrowser(true)}
                            >
                                <i className="fa-solid fa-plus"></i> 커밋 연결
                            </button>
                        </div>
                        <LinkedCommits
                            ref={linkedCommitsRef}
                            taskId={task?.taskId}
                            canEdit={true}
                        />
                    </div>

                    {/* GitHub Issue 연동 */}
                    <div className="task-section">
                        <label><i className="fa-brands fa-github"></i> GitHub Issue</label>
                        <GitHubIssueLink
                            taskId={task?.taskId}
                            teamId={teamId}
                            taskTitle={form.title}
                            taskDescription={form.description}
                            loginMember={loginMember}
                        />
                    </div>

                    {/* GitHub PR */}
                    <div className="task-section pr-section">
                            <div className="section-header-row">
                                <label><i className="fa-solid fa-code-pull-request"></i> Pull Requests</label>
                                <div className="section-actions">
                                    <button
                                        type="button"
                                        className="link-commit-btn"
                                        onClick={handleCreateBranch}
                                        disabled={prLoading}
                                        title="작업 브랜치 생성"
                                    >
                                        <i className="fa-solid fa-code-branch"></i> 브랜치 생성
                                    </button>
                                    <button
                                        type="button"
                                        className="link-commit-btn primary"
                                        onClick={openPRDialog}
                                        disabled={prLoading}
                                    >
                                        <i className="fa-solid fa-plus"></i> PR 생성
                                    </button>
                                </div>
                            </div>
                            <div className="pr-list">
                                {taskPRs.length === 0 ? (
                                    <p className="no-data">연결된 PR이 없습니다.</p>
                                ) : (
                                    taskPRs.map(pr => (
                                        <div key={pr.id || `gh-${pr.prNumber}`} className={`pr-item ${pr.prState}`}>
                                            <div className="pr-icon">
                                                {pr.merged ? (
                                                    <i className="fa-solid fa-code-merge merged"></i>
                                                ) : pr.prState === 'open' ? (
                                                    <i className="fa-solid fa-code-pull-request open"></i>
                                                ) : (
                                                    <i className="fa-solid fa-code-pull-request closed"></i>
                                                )}
                                            </div>
                                            <div className="pr-info">
                                                <div className="pr-title-row">
                                                    <a
                                                        href={pr.prUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="pr-title"
                                                    >
                                                        #{pr.prNumber} {pr.prTitle}
                                                    </a>
                                                    {pr.fromGitHub && (
                                                        <span className="pr-source-badge github" title="GitHub Issue 참조로 발견된 PR">
                                                            <i className="fa-brands fa-github"></i> Issue 참조
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="pr-meta">
                                                    <span className="pr-branch">{pr.headBranch}</span>
                                                    <i className="fa-solid fa-arrow-right"></i>
                                                    <span className="pr-branch">{pr.baseBranch}</span>
                                                    {pr.merged && <span className="pr-status merged">Merged</span>}
                                                    {!pr.merged && pr.prState === 'closed' && <span className="pr-status closed">Closed</span>}
                                                    {pr.prState === 'open' && <span className="pr-status open">Open</span>}
                                                </div>
                                            </div>
                                            {/* 머지 버튼 - open 상태인 PR에만 표시 */}
                                            {pr.prState === 'open' && !pr.merged && (
                                                <div className="pr-actions">
                                                    <button
                                                        type="button"
                                                        className="pr-merge-btn"
                                                        onClick={() => openMergeDialog(pr)}
                                                        title="PR 머지"
                                                    >
                                                        <i className="fa-solid fa-code-merge"></i> 머지
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                    </div>

                    </div>
                    )}

                    {/* 파일 탭 */}
                    {activeTab === 'files' && (
                    <div className="tab-panel">

                    {/* 첨부파일 */}
                    <div className="task-section">
                        <div className="section-header-row">
                            <label><i className="fa-solid fa-paperclip"></i> 첨부파일 {files.length > 0 && `(${files.length})`}</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className="upload-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                <i className="fa-solid fa-upload"></i>
                                {uploading ? '업로드중...' : '파일 추가'}
                            </button>
                        </div>
                        {files.length > 0 ? (
                            <div className="files-list">
                                {files.map(file => (
                                    <div key={file.fileId} className="file-item">
                                        <div className="file-icon">
                                            {getFileIcon(file.mimeType)}
                                        </div>
                                        <div className="file-info">
                                            <div className="file-name">{file.originalName}</div>
                                            <div className="file-meta">
                                                {formatFileSize(file.fileSize)} · {file.uploaderName} · {formatDate(file.uploadedAt)}
                                            </div>
                                        </div>
                                        <button
                                            className="download-btn"
                                            onClick={() => handleFileDownload(file.fileId, file.originalName)}
                                            title="다운로드"
                                        >
                                            <i className="fa-solid fa-arrow-down"></i>
                                        </button>
                                        {loginMember?.no === file.uploaderNo && (
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleFileDelete(file.fileId)}
                                                title="삭제"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">첨부된 파일이 없습니다.</p>
                        )}
                    </div>

                    </div>
                    )}

                    {/* 댓글 탭 */}
                    {activeTab === 'comments' && (
                    <div className="tab-panel">

                    {/* 댓글 */}
                    <div className="task-section comments-section">
                        <label><i className="fa-solid fa-comments"></i> 댓글</label>
                        <CommentSection
                            ref={commentSectionRef}
                            taskId={task?.taskId}
                            loginMember={loginMember}
                        />
                    </div>

                    </div>
                    )}

                    </div>{/* tab-content 닫기 */}
                </div>
            </div>

            {/* CommitBrowser 모달 */}
            {showCommitBrowser && (
                <CommitBrowser
                    teamId={teamId}
                    taskId={task?.taskId}
                    loginMember={loginMember}
                    onClose={() => setShowCommitBrowser(false)}
                    onCommitLinked={() => {
                        if (linkedCommitsRef.current) {
                            linkedCommitsRef.current.refresh();
                        }
                    }}
                />
            )}

            {/* PR 생성 다이얼로그 */}
            {showPRDialog && (
                <div className="pr-dialog-overlay" onClick={() => !prLoading && setShowPRDialog(false)}>
                    <div className="pr-dialog" onClick={e => e.stopPropagation()}>
                        <div className="pr-dialog-header">
                            <h3><i className="fa-solid fa-code-pull-request"></i> Pull Request 생성</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowPRDialog(false)}
                                disabled={prLoading}
                            >
                                <i className="fa-solid fa-x"></i>
                            </button>
                        </div>
                        <div className="pr-dialog-body">
                            <div className="pr-branch-select">
                                <div className="branch-field">
                                    <label>소스 브랜치 (head)</label>
                                    <select
                                        value={prForm.headBranch}
                                        onChange={e => setPRForm(prev => ({ ...prev, headBranch: e.target.value }))}
                                    >
                                        <option value="">브랜치 선택...</option>
                                        {branches.filter(b => b.name !== defaultBranch).map(b => (
                                            <option key={b.name} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="branch-arrow">
                                    <i className="fa-solid fa-arrow-right"></i>
                                </div>
                                <div className="branch-field">
                                    <label>대상 브랜치 (base)</label>
                                    <select
                                        value={prForm.baseBranch}
                                        onChange={e => setPRForm(prev => ({ ...prev, baseBranch: e.target.value }))}
                                    >
                                        {branches.map(b => (
                                            <option key={b.name} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="pr-form-field">
                                <label>PR 제목 *</label>
                                <input
                                    type="text"
                                    value={prForm.title}
                                    onChange={e => setPRForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Pull Request 제목..."
                                />
                            </div>
                            <div className="pr-form-field">
                                <label>설명</label>
                                <textarea
                                    value={prForm.body}
                                    onChange={e => setPRForm(prev => ({ ...prev, body: e.target.value }))}
                                    placeholder="변경사항에 대한 설명..."
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className="pr-dialog-footer">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setShowPRDialog(false)}
                                disabled={prLoading}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                className="submit-btn"
                                onClick={handleCreatePR}
                                disabled={prLoading || !prForm.headBranch || !prForm.title.trim()}
                            >
                                {prLoading ? 'PR 생성 중...' : 'PR 생성'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PR 머지 다이얼로그 */}
            {mergeDialog.show && mergeDialog.pr && (
                <div className="pr-dialog-overlay" onClick={() => !mergeDialog.loading && !mergeDialog.checkingStatus && closeMergeDialog()}>
                    <div className="pr-dialog merge-dialog" onClick={e => e.stopPropagation()}>
                        <div className="pr-dialog-header">
                            <h3><i className="fa-solid fa-code-merge"></i> Pull Request 머지</h3>
                            <button
                                className="close-btn"
                                onClick={closeMergeDialog}
                                disabled={mergeDialog.loading || mergeDialog.checkingStatus}
                            >
                                <i className="fa-solid fa-x"></i>
                            </button>
                        </div>
                        <div className="pr-dialog-body">
                            <div className="merge-pr-info">
                                <div className="merge-pr-title">
                                    <i className="fa-solid fa-code-pull-request"></i>
                                    #{mergeDialog.pr.prNumber} {mergeDialog.pr.prTitle}
                                </div>
                                <div className="merge-pr-branches">
                                    <span className="pr-branch">{mergeDialog.pr.headBranch}</span>
                                    <i className="fa-solid fa-arrow-right"></i>
                                    <span className="pr-branch">{mergeDialog.pr.baseBranch}</span>
                                </div>
                            </div>

                            {/* 머지 상태 확인 중 */}
                            {mergeDialog.checkingStatus && (
                                <div className="merge-status-checking">
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    머지 가능 여부 확인 중...
                                </div>
                            )}

                            {/* 머지 가능 상태 표시 */}
                            {!mergeDialog.checkingStatus && mergeDialog.prDetail && (
                                <>
                                    {/* 충돌 없음 - 머지 가능 */}
                                    {mergeDialog.prDetail.mergeable === true && !mergeDialog.prDetail.hasConflicts && (
                                        <div className="merge-status success">
                                            <i className="fa-solid fa-check-circle"></i>
                                            <span>머지 가능: 충돌 없음</span>
                                        </div>
                                    )}

                                    {/* 아직 확인 중 */}
                                    {mergeDialog.prDetail.mergeable === null && !mergeDialog.prDetail.hasConflicts && (
                                        <div className="merge-status pending">
                                            <i className="fa-solid fa-clock"></i>
                                            <span>GitHub에서 머지 가능 여부 확인 중...</span>
                                            <button
                                                className="refresh-btn"
                                                onClick={async () => {
                                                    setMergeDialog(prev => ({ ...prev, checkingStatus: true }));
                                                    try {
                                                        const detail = await getPRDetail(teamId, mergeDialog.pr.prNumber);
                                                        setMergeDialog(prev => ({ ...prev, prDetail: detail, checkingStatus: false }));
                                                    } catch (e) {
                                                        setMergeDialog(prev => ({ ...prev, checkingStatus: false }));
                                                    }
                                                }}
                                                title="상태 새로고침"
                                            >
                                                <i className="fa-solid fa-rotate"></i>
                                            </button>
                                        </div>
                                    )}

                                    {/* 충돌 있음 */}
                                    {mergeDialog.prDetail.hasConflicts && (
                                        <div className="merge-conflict-section">
                                            <div className="merge-status conflict">
                                                <i className="fa-solid fa-exclamation-triangle"></i>
                                                <span>충돌 발생: 머지 전 충돌 해결 필요</span>
                                            </div>

                                            {/* 충돌 파일 목록 */}
                                            {mergeDialog.prDetail.conflictFiles && mergeDialog.prDetail.conflictFiles.length > 0 && (
                                                <div className="conflict-files">
                                                    <div className="conflict-files-header">
                                                        <i className="fa-solid fa-file-code"></i>
                                                        충돌 가능 파일 ({mergeDialog.prDetail.conflictFiles.length}개)
                                                    </div>
                                                    <ul className="conflict-file-list">
                                                        {mergeDialog.prDetail.conflictFiles.slice(0, 10).map((file, idx) => (
                                                            <li key={idx} className={`conflict-file ${file.status}`}>
                                                                <span className="file-status">
                                                                    {file.status === 'modified' && <i className="fa-solid fa-pen"></i>}
                                                                    {file.status === 'added' && <i className="fa-solid fa-plus"></i>}
                                                                    {file.status === 'removed' && <i className="fa-solid fa-minus"></i>}
                                                                    {file.status === 'renamed' && <i className="fa-solid fa-arrow-right"></i>}
                                                                </span>
                                                                <span className="file-name">{file.filename}</span>
                                                                <span className="file-changes">
                                                                    <span className="additions">+{file.additions}</span>
                                                                    <span className="deletions">-{file.deletions}</span>
                                                                </span>
                                                                {/* AI 해결 버튼 - 수정된 파일에만 표시 */}
                                                                {file.status === 'modified' && (
                                                                    <button
                                                                        className="ai-resolve-btn"
                                                                        onClick={() => handleAiResolveConflict(file.filename)}
                                                                        disabled={aiResolution.loading}
                                                                        title="AI로 충돌 해결"
                                                                    >
                                                                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                                                                        AI 해결
                                                                    </button>
                                                                )}
                                                            </li>
                                                        ))}
                                                        {mergeDialog.prDetail.conflictFiles.length > 10 && (
                                                            <li className="more-files">
                                                                ... 외 {mergeDialog.prDetail.conflictFiles.length - 10}개 파일
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* AI 충돌 해결 패널 */}
                                            {aiResolution.show && (
                                                <div className="ai-resolution-panel">
                                                    <div className="ai-panel-header">
                                                        <div className="ai-panel-title">
                                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                                            AI 충돌 해결
                                                        </div>
                                                        <span className="ai-panel-file">{aiResolution.filename}</span>
                                                        <button
                                                            className="ai-panel-close"
                                                            onClick={handleCancelAiResolution}
                                                            disabled={aiResolution.applying}
                                                        >
                                                            <i className="fa-solid fa-x"></i>
                                                        </button>
                                                    </div>

                                                    <div className="ai-panel-body">
                                                        {/* 로딩 상태 */}
                                                        {aiResolution.loading && (
                                                            <div className="ai-loading">
                                                                <i className="fa-solid fa-spinner fa-spin"></i>
                                                                <span>AI가 충돌을 분석하고 있습니다...</span>
                                                                <p className="ai-loading-hint">양쪽 브랜치의 변경사항을 분석하여 최적의 해결책을 찾고 있습니다.</p>
                                                            </div>
                                                        )}

                                                        {/* 에러 */}
                                                        {aiResolution.error && (
                                                            <div className="ai-error">
                                                                <i className="fa-solid fa-exclamation-circle"></i>
                                                                <span>{aiResolution.error}</span>
                                                                <button
                                                                    className="retry-btn"
                                                                    onClick={() => handleAiResolveConflict(aiResolution.filename)}
                                                                >
                                                                    다시 시도
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* 해결 결과 */}
                                                        {aiResolution.result && !aiResolution.loading && !aiResolution.error && (
                                                            <>
                                                                {/* 분석 내용 */}
                                                                <div className="ai-analysis">
                                                                    <div className="ai-section-title">
                                                                        <i className="fa-solid fa-magnifying-glass-chart"></i>
                                                                        충돌 분석
                                                                    </div>
                                                                    <p>{aiResolution.result.analysis}</p>
                                                                </div>

                                                                {/* 해결 옵션 카드들 */}
                                                                <div className="ai-options">
                                                                    <div className="ai-section-title">
                                                                        <i className="fa-solid fa-list-check"></i>
                                                                        해결 옵션 선택
                                                                    </div>
                                                                    <div className="ai-option-cards">
                                                                        {aiResolution.result.options?.map((option, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className={`ai-option-card ${aiResolution.selectedOption === idx ? 'selected' : ''}`}
                                                                                onClick={() => setAiResolution(prev => ({ ...prev, selectedOption: idx }))}
                                                                            >
                                                                                <div className="option-header">
                                                                                    <span className="option-number">{idx + 1}</span>
                                                                                    <span className="option-title">{option.title}</span>
                                                                                    {aiResolution.selectedOption === idx && (
                                                                                        <i className="fa-solid fa-check-circle selected-check"></i>
                                                                                    )}
                                                                                </div>
                                                                                <p className="option-description">{option.description}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* 선택된 옵션의 코드 미리보기 */}
                                                                {aiResolution.selectedOption !== null && aiResolution.result.options?.[aiResolution.selectedOption] && (
                                                                    <div className="ai-code-preview">
                                                                        <div className="ai-section-title">
                                                                            <i className="fa-solid fa-code"></i>
                                                                            {aiResolution.result.options[aiResolution.selectedOption].title} - 코드 미리보기
                                                                        </div>
                                                                        <pre className="code-block">
                                                                            <code>{aiResolution.result.options[aiResolution.selectedOption].code}</code>
                                                                        </pre>
                                                                    </div>
                                                                )}

                                                                {/* 적용 버튼 */}
                                                                <div className="ai-actions">
                                                                    <button
                                                                        className="cancel-btn"
                                                                        onClick={handleCancelAiResolution}
                                                                        disabled={aiResolution.applying}
                                                                    >
                                                                        취소
                                                                    </button>
                                                                    <button
                                                                        className="apply-btn"
                                                                        onClick={handleApplyResolution}
                                                                        disabled={aiResolution.applying || aiResolution.selectedOption === null}
                                                                    >
                                                                        {aiResolution.applying ? (
                                                                            <>
                                                                                <i className="fa-solid fa-spinner fa-spin"></i>
                                                                                적용 중...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <i className="fa-solid fa-check"></i>
                                                                                선택한 옵션 적용
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 충돌 해결 안내 */}
                                            <div className="conflict-resolution-guide">
                                                <div className="guide-header">
                                                    <i className="fa-solid fa-lightbulb"></i>
                                                    충돌 해결 방법
                                                </div>
                                                <div className="guide-options">
                                                    <a
                                                        href={mergeDialog.prDetail.htmlUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="guide-option github"
                                                    >
                                                        <i className="fa-brands fa-github"></i>
                                                        <div className="option-content">
                                                            <strong>GitHub에서 해결</strong>
                                                            <span>웹 에디터로 충돌 해결</span>
                                                        </div>
                                                        <i className="fa-solid fa-external-link"></i>
                                                    </a>
                                                    <div className="guide-option local">
                                                        <i className="fa-solid fa-terminal"></i>
                                                        <div className="option-content">
                                                            <strong>로컬에서 해결</strong>
                                                            <code>
                                                                git fetch origin<br/>
                                                                git checkout {mergeDialog.prDetail.headRef}<br/>
                                                                git merge origin/{mergeDialog.prDetail.baseRef}<br/>
                                                                <span className="comment"># 충돌 해결 후</span><br/>
                                                                git add . && git commit<br/>
                                                                git push
                                                            </code>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* 머지 방법 선택 (충돌 없을 때만) */}
                            {!mergeDialog.checkingStatus && mergeDialog.prDetail && !mergeDialog.prDetail.hasConflicts && (
                                <div className="pr-form-field">
                                    <label>머지 방법</label>
                                    <select
                                        value={mergeDialog.mergeMethod}
                                        onChange={e => setMergeDialog(prev => ({ ...prev, mergeMethod: e.target.value }))}
                                        disabled={mergeDialog.loading}
                                    >
                                        <option value="merge">Merge commit (모든 커밋 유지)</option>
                                        <option value="squash">Squash and merge (커밋 하나로 합치기)</option>
                                        <option value="rebase">Rebase and merge (리베이스 후 머지)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="pr-dialog-footer">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={closeMergeDialog}
                                disabled={mergeDialog.loading || mergeDialog.checkingStatus}
                            >
                                {mergeDialog.prDetail?.hasConflicts ? '닫기' : '취소'}
                            </button>
                            {!mergeDialog.prDetail?.hasConflicts && (
                                <button
                                    type="button"
                                    className="submit-btn merge"
                                    onClick={handleMergePR}
                                    disabled={mergeDialog.loading || mergeDialog.checkingStatus}
                                >
                                    {mergeDialog.loading ? '머지 중...' : mergeDialog.checkingStatus ? '확인 중...' : '머지 확인'}
                                </button>
                            )}
                            {mergeDialog.prDetail?.hasConflicts && (
                                <a
                                    href={mergeDialog.prDetail.htmlUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="submit-btn github-link"
                                >
                                    <i className="fa-brands fa-github"></i> GitHub에서 해결
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskDetailView;
