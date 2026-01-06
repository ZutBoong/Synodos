import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBranches, getCommitsGraph, getDefaultBranch, createBranch, mergeBranches as mergeBranchesApi, deleteBranch, revertCommit, getTeamPRs } from '../../api/githubApi';
import { tasklistByTeam } from '../../api/boardApi';
import axiosInstance from '../../api/axiosInstance';
import './BranchView.css';

// 그래프 설정 (GitKraken 스타일)
const GRAPH_CONFIG = {
    nodeRadius: 12,
    horizontalSpacing: 80,
    rowHeight: 80,
    leftPadding: 180,
    topPadding: 70,
    timelineHeight: 30,
    branchColors: [
        '#6e40c9', // purple
        '#2ea44f', // green
        '#0969da', // blue
        '#cf222e', // red
        '#bf8700', // yellow
        '#e85aad', // pink
        '#1a7f5a', // teal
        '#fa7a18', // orange
    ]
};

function BranchView({ team, loginMember, filters }) {
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [defaultBranch, setDefaultBranch] = useState('main');
    const [commitsByBranch, setCommitsByBranch] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const depth = 10000; // 전체 커밋 가져오기
    const [expandedBranches, setExpandedBranches] = useState(new Set()); // 확장된 브랜치들
    const [expandedDates, setExpandedDates] = useState(new Set()); // 펼쳐진 날짜들 (시간 상세보기)
    const [datesInitialized, setDatesInitialized] = useState(false); // 날짜 초기화 여부

    // 선택된 커밋 (상세 패널용)
    const [selectedCommit, setSelectedCommit] = useState(null);
    const [hoveredCommit, setHoveredCommit] = useState(null);

    // 드래그 앤 드롭 (머지용)
    const [dragState, setDragState] = useState(null); // { node, startX, startY, currentX, currentY }
    const [dropTarget, setDropTarget] = useState(null); // 드롭 대상 노드

    // 검색 (filters.searchQuery 사용)

    // 컨텍스트 메뉴
    const [contextMenu, setContextMenu] = useState(null);
    const [branchContextMenu, setBranchContextMenu] = useState(null); // 브랜치 패널용

    // 다이얼로그 상태
    const [createBranchDialog, setCreateBranchDialog] = useState(null); // { sha, shortSha, message }
    const [mergeDialog, setMergeDialog] = useState(null); // { head, mergeType: 'direct' | 'pr' }
    const [mergeCommitDialog, setMergeCommitDialog] = useState(null); // { sha, shortSha, message, branch, mergeType: 'direct' | 'pr' }
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null); // { branchName }
    const [revertDialog, setRevertDialog] = useState(null); // { sha, shortSha, message, branch }
    const [dialogLoading, setDialogLoading] = useState(false);
    const [dialogError, setDialogError] = useState(null);

    // Task 목록 (PR 연결용)
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState('');

    // Viewport ref (컨텍스트 메뉴 위치용)
    const viewportRef = useRef(null);
    const graphContainerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    // 컨테이너 크기 감지
    useEffect(() => {
        const container = graphContainerRef.current;
        if (!container) return;

        const updateSize = () => {
            setContainerSize({
                width: container.clientWidth,
                height: container.clientHeight
            });
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, []);

    const isGithubConnected = team?.githubRepoUrl && team.githubRepoUrl.trim() !== '';
    const isUserGithubConnected = loginMember?.githubUsername && loginMember.githubUsername.trim() !== '';

    // GitHub 미연결 시 안내 메시지
    const showGithubWarning = () => {
        alert('GitHub 계정을 연결해주세요.\n마이페이지 > 소셜 계정 연동에서 GitHub를 연결할 수 있습니다.');
    };

    // localStorage 키 생성
    const getStorageKey = (teamId) => `branchView_selectedBranches_${teamId}`;

    // 브랜치 목록 로드
    useEffect(() => {
        if (!isGithubConnected || !team?.teamId) return;

        const loadBranches = async () => {
            try {
                const [branchList, defaultBranchData] = await Promise.all([
                    getBranches(team.teamId, loginMember?.no),
                    getDefaultBranch(team.teamId, loginMember?.no)
                ]);
                setBranches(branchList);
                setDefaultBranch(defaultBranchData.defaultBranch || 'main');

                if (branchList.length > 0) {
                    const defaultName = defaultBranchData.defaultBranch || 'main';
                    const branchNames = branchList.map(b => b.name);

                    // localStorage에서 저장된 선택 불러오기
                    const storageKey = getStorageKey(team.teamId);
                    const savedBranches = localStorage.getItem(storageKey);

                    if (savedBranches) {
                        try {
                            const parsed = JSON.parse(savedBranches);
                            // 저장된 브랜치 중 현재 존재하는 것만 필터링
                            const validBranches = parsed.filter(b => branchNames.includes(b));
                            if (validBranches.length > 0) {
                                setSelectedBranches(validBranches);
                                return;
                            }
                        } catch (e) {
                            console.error('Failed to parse saved branches:', e);
                        }
                    }

                    // 저장된 값이 없으면 기본값 사용
                    const initial = [defaultName, ...branchNames
                        .filter(n => n !== defaultName)
                        .slice(0, 3)
                    ];
                    setSelectedBranches(initial);
                }
            } catch (err) {
                console.error('Failed to load branches:', err);
                setError('브랜치 목록을 불러오는데 실패했습니다.');
            }
        };

        loadBranches();
    }, [team?.teamId, isGithubConnected]);

    // Task 목록 로드 (PR 연결용)
    useEffect(() => {
        if (!team?.teamId) return;

        const loadTasks = async () => {
            try {
                const taskList = await tasklistByTeam(team.teamId);
                // 진행 중인 태스크만 필터링 (DONE, archived 제외)
                const activeTasks = taskList.filter(t =>
                    t.workflowStatus !== 'DONE' && !t.archived
                );
                setTasks(activeTasks);
            } catch (err) {
                console.error('Failed to load tasks:', err);
            }
        };

        loadTasks();
    }, [team?.teamId]);

    // 선택된 브랜치가 변경되면 localStorage에 저장
    useEffect(() => {
        if (!team?.teamId || selectedBranches.length === 0) return;
        const storageKey = getStorageKey(team.teamId);
        localStorage.setItem(storageKey, JSON.stringify(selectedBranches));
    }, [team?.teamId, selectedBranches]);

    // 커밋 그래프 로드
    useEffect(() => {
        if (!isGithubConnected || !team?.teamId || selectedBranches.length === 0) {
            setLoading(false);
            return;
        }

        const loadGraph = async () => {
            setLoading(true);
            setError(null);
            try {
                if (selectedBranches.length === 0) {
                    setCommitsByBranch({});
                    setLoading(false);
                    return;
                }

                const graphData = await getCommitsGraph(team.teamId, selectedBranches, depth);
                setCommitsByBranch(graphData.commitsByBranch || {});
            } catch (err) {
                console.error('Failed to load graph:', err);
                setError('커밋 그래프를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadGraph();
    }, [team?.teamId, selectedBranches, depth, isGithubConnected]);

    // 날짜 확장 기본값 설정 (커밋 로드 시 모든 날짜 확장)
    useEffect(() => {
        if (datesInitialized) return;

        const allCommits = Object.values(commitsByBranch).flat();
        if (allCommits.length > 0) {
            const allDateKeys = new Set();
            allCommits.forEach(commit => {
                if (commit.date) {
                    const d = new Date(commit.date);
                    allDateKeys.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
                }
            });
            if (allDateKeys.size > 0) {
                setExpandedDates(allDateKeys);
                setDatesInitialized(true);
            }
        }
    }, [commitsByBranch, datesInitialized]);

    // 브랜치 토글
    const toggleBranch = (branchName) => {
        setSelectedBranches(prev => {
            if (prev.includes(branchName)) {
                if (prev.length === 1) return prev;
                return prev.filter(b => b !== branchName);
            }
            return [...prev, branchName];
        });
    };

    // 커밋 클릭
    const handleCommitClick = (node, e) => {
        e.stopPropagation();
        setSelectedCommit(node);
        setContextMenu(null);
    };

    // 드래그 시작
    const handleDragStart = (node, e) => {
        if (e.button !== 0) return; // 좌클릭만
        e.preventDefault();
        const rect = viewportRef.current?.getBoundingClientRect();
        setDragState({
            node,
            startX: e.clientX - (rect?.left || 0),
            startY: e.clientY - (rect?.top || 0),
            currentX: e.clientX - (rect?.left || 0),
            currentY: e.clientY - (rect?.top || 0)
        });
    };

    // 드래그 중 (document level에서 처리)
    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e) => {
            const rect = viewportRef.current?.getBoundingClientRect();
            if (!rect) return;

            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            setDragState(prev => prev ? { ...prev, currentX, currentY } : null);
        };

        const handleMouseUp = (e) => {
            if (dropTarget && dragState.node.branch !== dropTarget.branch) {
                // 다른 브랜치에 드롭 -> 머지 다이얼로그 열기
                setMergeCommitDialog({
                    sha: dragState.node.commit.sha,
                    shortSha: dragState.node.commit.shortSha,
                    message: dragState.node.commit.message,
                    branch: dragState.node.branch,
                    targetBranch: dropTarget.branch,
                    mergeType: 'direct'
                });
                setDialogError(null);
            }
            setDragState(null);
            setDropTarget(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, dropTarget]);

    // 우클릭 컨텍스트 메뉴
    const handleContextMenu = (node, e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = viewportRef.current?.getBoundingClientRect();
        setContextMenu({
            x: e.clientX - (rect?.left || 0),
            y: e.clientY - (rect?.top || 0),
            commit: node.commit,
            branch: node.branch
        });
    };

    // 컨텍스트 메뉴 액션
    const contextMenuActions = [
        {
            label: '여기서 브랜치 생성',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>,
            action: (c) => {
                setCreateBranchDialog({ sha: c.sha, shortSha: c.shortSha, message: c.message });
                setDialogError(null);
            }
        },
        { type: 'divider' },
        {
            label: '이 커밋까지 머지',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" /></svg>,
            action: (c, branch) => {
                setMergeCommitDialog({
                    sha: c.sha,
                    shortSha: c.shortSha,
                    message: c.message,
                    branch: branch,
                    mergeType: 'direct'
                });
                setDialogError(null);
            },
            hideIf: (c, branch) => branch === defaultBranch
        },
        { type: 'divider' },
        {
            label: '이 커밋 되돌리기',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>,
            action: (c, branch) => {
                setRevertDialog({
                    sha: c.sha,
                    shortSha: c.shortSha,
                    message: c.message,
                    branch: branch
                });
                setDialogError(null);
            }
        },
    ];

    // 브랜치 컨텍스트 메뉴 핸들러
    const handleBranchContextMenu = (branch, e) => {
        e.preventDefault();
        e.stopPropagation();
        setBranchContextMenu({
            x: e.clientX,
            y: e.clientY,
            branch
        });
    };

    // 브랜치 작업 핸들러
    const handleCreateBranch = async (branchName) => {
        if (!branchName?.trim() || !createBranchDialog?.sha) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);
        try {
            await createBranch(team.teamId, branchName.trim(), createBranchDialog.sha, loginMember?.no);
            setCreateBranchDialog(null);
            // 브랜치 목록 새로고침
            const branchList = await getBranches(team.teamId, loginMember?.no);
            setBranches(branchList);
            // 새 브랜치를 선택된 브랜치에 추가
            if (!selectedBranches.includes(branchName.trim())) {
                const newSelected = [...selectedBranches, branchName.trim()];
                setSelectedBranches(newSelected);
                localStorage.setItem(getStorageKey(team.teamId), JSON.stringify(newSelected));
            }
            alert(`브랜치 '${branchName}'가 생성되었습니다.`);
        } catch (err) {
            setDialogError(err.response?.data || err.message || '브랜치 생성에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    const handleMergeBranch = async (base, commitMessage) => {
        if (!base || !mergeDialog?.head) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);
        try {
            const result = await mergeBranchesApi(team.teamId, base, mergeDialog.head, commitMessage || null, loginMember?.no);
            setMergeDialog(null);
            if (result.success) {
                alert(result.message || '머지가 완료되었습니다.');
                // 그래프 새로고침
                loadCommitsGraph();
            } else {
                alert(result.message || '머지에 실패했습니다.');
            }
        } catch (err) {
            setDialogError(err.response?.data || err.message || '머지에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    // PR 생성 핸들러
    const handleCreatePR = async (base, title, body, taskId) => {
        if (!base || !mergeDialog?.head || !title?.trim()) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);
        try {
            let finalBody = body || '';

            // Task가 선택된 경우 본문에 참조 추가
            if (taskId) {
                const selectedTask = tasks.find(t => t.taskId === parseInt(taskId));
                if (selectedTask) {
                    const taskRef = selectedTask.issueNumber
                        ? `Closes #${selectedTask.issueNumber}`
                        : `Related to Task #${taskId}`;
                    finalBody = finalBody
                        ? `${finalBody}\n\n---\n${taskRef}`
                        : taskRef;
                }
            }

            // Task가 연결된 경우 task PR API 사용, 아니면 일반 PR API 사용
            let response;
            if (taskId) {
                response = await axiosInstance.post(`/api/github/task/${taskId}/pr?teamId=${team.teamId}&memberNo=${loginMember?.no}`, {
                    head: mergeDialog.head,
                    base: base,
                    title: title.trim(),
                    body: finalBody
                });
            } else {
                response = await axiosInstance.post(`/api/github/pr/${team.teamId}`, {
                    head: mergeDialog.head,
                    base: base,
                    title: title.trim(),
                    body: finalBody,
                    memberNo: loginMember?.no
                });
            }

            setMergeDialog(null);
            setSelectedTaskId('');
            if (response.data.success !== false) {
                const prNumber = response.data.number || response.data.pr?.number;
                const prUrl = response.data.htmlUrl || response.data.pr?.htmlUrl;
                const taskInfo = taskId ? ` (Task #${taskId} 연결됨)` : '';
                alert(`PR #${prNumber}이(가) 생성되었습니다.${taskInfo}`);
                if (prUrl && window.confirm('GitHub에서 PR을 확인하시겠습니까?')) {
                    window.open(prUrl, '_blank');
                }
            } else {
                alert(response.data.message || 'PR 생성에 실패했습니다.');
            }
        } catch (err) {
            setDialogError(err.response?.data || err.message || 'PR 생성에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    // 특정 커밋까지만 머지 (임시 브랜치 생성 → 머지 → 삭제)
    const handleMergeCommit = async (base) => {
        if (!base || !mergeCommitDialog?.sha) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);

        const tempBranchName = `temp-merge-${Date.now()}`;
        let tempBranchCreated = false;

        try {
            // 1. 해당 커밋에서 임시 브랜치 생성
            await createBranch(team.teamId, tempBranchName, mergeCommitDialog.sha, loginMember?.no);
            tempBranchCreated = true;

            // 2. 임시 브랜치를 대상 브랜치에 머지
            const result = await mergeBranchesApi(team.teamId, base, tempBranchName,
                `Merge commit ${mergeCommitDialog.shortSha} into ${base}`, loginMember?.no);

            // 3. 임시 브랜치 삭제
            try {
                await deleteBranch(team.teamId, tempBranchName, loginMember?.no);
            } catch (deleteErr) {
                console.warn('임시 브랜치 삭제 실패:', deleteErr);
            }

            setMergeCommitDialog(null);

            if (result.success) {
                alert(`커밋 ${mergeCommitDialog.shortSha}까지 ${base}에 머지되었습니다.`);
                loadCommitsGraph();
            } else {
                alert(result.message || '머지에 실패했습니다.');
            }
        } catch (err) {
            // 실패 시 임시 브랜치 정리 시도
            if (tempBranchCreated) {
                try {
                    await deleteBranch(team.teamId, tempBranchName, loginMember?.no);
                } catch (deleteErr) {
                    console.warn('임시 브랜치 정리 실패:', deleteErr);
                }
            }
            setDialogError(err.response?.data || err.message || '머지에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    // 특정 커밋에서 PR 생성 (임시 브랜치 생성 → PR 생성)
    const handleCreatePRFromCommit = async (base, title, body, taskId) => {
        if (!base || !mergeCommitDialog?.sha || !title?.trim()) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);

        // 고유한 브랜치 이름 생성
        const branchName = `pr/${mergeCommitDialog.shortSha}-${Date.now()}`;

        try {
            // 1. 해당 커밋에서 브랜치 생성
            await createBranch(team.teamId, branchName, mergeCommitDialog.sha, loginMember?.no);

            let finalBody = body || '';

            // Task가 선택된 경우 본문에 참조 추가
            if (taskId) {
                const selectedTask = tasks.find(t => t.taskId === parseInt(taskId));
                if (selectedTask) {
                    const taskRef = selectedTask.issueNumber
                        ? `Closes #${selectedTask.issueNumber}`
                        : `Related to Task #${taskId}`;
                    finalBody = finalBody
                        ? `${finalBody}\n\n---\n${taskRef}`
                        : taskRef;
                }
            }

            // 커밋 정보 추가
            finalBody = finalBody
                ? `${finalBody}\n\nMerge up to commit ${mergeCommitDialog.shortSha}`
                : `Merge up to commit ${mergeCommitDialog.shortSha}`;

            // 2. PR 생성
            let response;
            if (taskId) {
                response = await axiosInstance.post(`/api/github/task/${taskId}/pr?teamId=${team.teamId}&memberNo=${loginMember?.no}`, {
                    head: branchName,
                    base: base,
                    title: title.trim(),
                    body: finalBody
                });
            } else {
                response = await axiosInstance.post(`/api/github/pr/${team.teamId}`, {
                    head: branchName,
                    base: base,
                    title: title.trim(),
                    body: finalBody,
                    memberNo: loginMember?.no
                });
            }

            setMergeCommitDialog(null);
            setSelectedTaskId('');

            if (response.data.success !== false) {
                const prNumber = response.data.number || response.data.pr?.number;
                const prUrl = response.data.htmlUrl || response.data.pr?.htmlUrl;
                const taskInfo = taskId ? ` (Task #${taskId} 연결됨)` : '';
                alert(`PR #${prNumber}이(가) 생성되었습니다.${taskInfo}\n\n브랜치: ${branchName}`);

                // 브랜치 목록 새로고침
                const branchList = await getBranches(team.teamId, loginMember?.no);
                setBranches(branchList);

                if (prUrl && window.confirm('GitHub에서 PR을 확인하시겠습니까?')) {
                    window.open(prUrl, '_blank');
                }
            } else {
                // 실패 시 생성된 브랜치 정리
                try {
                    await deleteBranch(team.teamId, branchName, loginMember?.no);
                } catch (deleteErr) {
                    console.warn('브랜치 정리 실패:', deleteErr);
                }
                alert(response.data.message || 'PR 생성에 실패했습니다.');
            }
        } catch (err) {
            // 실패 시 브랜치 정리 시도
            try {
                await deleteBranch(team.teamId, branchName, loginMember?.no);
            } catch (deleteErr) {
                console.warn('브랜치 정리 실패:', deleteErr);
            }
            setDialogError(err.response?.data || err.message || 'PR 생성에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    // 커밋 되돌리기 핸들러
    const handleRevertCommit = async () => {
        if (!revertDialog?.sha || !revertDialog?.branch) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);

        try {
            const result = await revertCommit(team.teamId, revertDialog.branch, revertDialog.sha, loginMember?.no);
            setRevertDialog(null);

            if (result.success) {
                alert(result.message || `커밋 ${revertDialog.shortSha}이(가) 되돌려졌습니다.`);
                loadCommitsGraph();
            } else {
                alert(result.message || '커밋 되돌리기에 실패했습니다.');
            }
        } catch (err) {
            setDialogError(err.response?.data || err.message || '커밋 되돌리기에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    const handleDeleteBranch = async () => {
        if (!deleteConfirmDialog?.branchName) return;

        if (!isUserGithubConnected) {
            showGithubWarning();
            return;
        }

        setDialogLoading(true);
        setDialogError(null);
        try {
            await deleteBranch(team.teamId, deleteConfirmDialog.branchName, loginMember?.no);
            const deletedBranch = deleteConfirmDialog.branchName;
            setDeleteConfirmDialog(null);
            // 브랜치 목록에서 제거
            setBranches(prev => prev.filter(b => b.name !== deletedBranch));
            // 선택된 브랜치에서도 제거
            const newSelected = selectedBranches.filter(b => b !== deletedBranch);
            setSelectedBranches(newSelected);
            localStorage.setItem(getStorageKey(team.teamId), JSON.stringify(newSelected));
            alert(`브랜치 '${deletedBranch}'가 삭제되었습니다.`);
        } catch (err) {
            setDialogError(err.response?.data || err.message || '브랜치 삭제에 실패했습니다.');
        } finally {
            setDialogLoading(false);
        }
    };

    // 그래프 데이터 로드 함수 (별도로 분리)
    const loadCommitsGraph = useCallback(async () => {
        if (!isGithubConnected || selectedBranches.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getCommitsGraph(team.teamId, selectedBranches, depth, loginMember?.no);
            setCommitsByBranch(data.commitsByBranch || {});
        } catch (err) {
            console.error('Failed to load commits graph:', err);
            setError('커밋 그래프를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [isGithubConnected, team?.teamId, selectedBranches, depth, loginMember?.no]);

    // 검색 필터링 (filters.searchQuery 사용)
    const filterCommits = (commits) => {
        const searchQuery = filters?.searchQuery || '';
        if (!searchQuery.trim()) return commits;
        const query = searchQuery.toLowerCase();
        return commits.filter(c =>
            c.message?.toLowerCase().includes(query) ||
            c.authorName?.toLowerCase().includes(query) ||
            c.authorLogin?.toLowerCase().includes(query) ||
            c.sha?.toLowerCase().includes(query)
        );
    };

    // 그래프 데이터 계산 (시간순 배치)
    const renderGraphData = () => {
        const nodes = [];
        const edges = [];
        const branchRows = {};

        // 기본 브랜치를 최상단(0)에 배치하고, 다른 브랜치들을 아래로 순서대로 배치
        if (selectedBranches.includes(defaultBranch)) {
            branchRows[defaultBranch] = 0;
        }

        const otherBranches = selectedBranches.filter(b => b !== defaultBranch);
        otherBranches.forEach((branch, idx) => {
            branchRows[branch] = idx + 1;
        });

        // 기본 브랜치의 "원래" 커밋 SHA 목록 수집 (머지로 들어온 커밋 제외)
        // 첫 번째 parent만 따라가면서 master의 원래 히스토리만 추적
        const defaultBranchShas = new Set();
        if (commitsByBranch[defaultBranch]) {
            const mainCommits = commitsByBranch[defaultBranch];
            const commitMap = new Map(mainCommits.map(c => [c.sha, c]));

            let current = mainCommits[0]; // HEAD부터 시작
            while (current) {
                defaultBranchShas.add(current.sha);
                // 첫 번째 parent만 따라감 (머지 커밋의 두 번째 parent는 다른 브랜치에서 온 것)
                if (current.parents && current.parents.length > 0) {
                    current = commitMap.get(current.parents[0]);
                } else {
                    break;
                }
            }
        }

        // 하이브리드 모드: 확장된 브랜치만 상세 표시, 나머지는 overview
        return renderHybridGraph(branchRows, defaultBranchShas);
    };

    // 하이브리드 모드: 확장된 브랜치만 상세, 나머지는 overview
    const renderHybridGraph = (branchRows, defaultBranchShas) => {
        const nodes = [];
        const edges = [];
        const commitPositions = {};

        // Y 위치 계산 (상단 배치)
        const rowValues = Object.values(branchRows);
        const maxRow = Math.max(...rowValues, 0);
        const totalRows = maxRow + 1;
        const contentHeight = GRAPH_CONFIG.topPadding + totalRows * GRAPH_CONFIG.rowHeight + GRAPH_CONFIG.topPadding;

        // 상단에서 시작 (row 0 = main이 최상단)
        const svgHeight = Math.max(contentHeight, containerSize.height);
        const baseY = GRAPH_CONFIG.topPadding;

        // 날짜 키 생성 함수
        const getDateKey = (dateStr) => {
            if (!dateStr) return 'unknown';
            const d = new Date(dateStr);
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        };

        // 모든 표시할 커밋 수집
        const allDisplayCommits = [];

        // 브랜치의 "진짜" 고유 커밋 찾기: HEAD에서 parent를 따라가다 master 커밋을 만나면 멈춤
        // 이렇게 하면 다른 브랜치가 머지된 후 분기해도 그 브랜치의 커밋이 포함되지 않음
        const findBranchOwnCommits = (commits) => {
            if (commits.length === 0) return [];

            const commitMap = new Map(commits.map(c => [c.sha, c]));
            const ownCommits = [];

            let current = commits[0]; // HEAD부터 시작
            while (current) {
                // master의 원래 커밋이면 멈춤
                if (defaultBranchShas.has(current.sha)) break;

                ownCommits.push(current);

                // 첫 번째 parent 따라감
                if (current.parents && current.parents.length > 0) {
                    current = commitMap.get(current.parents[0]);
                } else {
                    break;
                }
            }

            return ownCommits;
        };

        // 브랜치의 가장 오래된 고유 커밋 찾기
        const findOldestUniqueCommit = (commits) => {
            const ownCommits = findBranchOwnCommits(commits);
            if (ownCommits.length === 0) return null;
            return ownCommits[ownCommits.length - 1];
        };

        // 분기점 커밋 찾기: 가장 오래된 고유 커밋의 parent를 master에서 찾기
        const findBranchPointCommit = (commits) => {
            const mainCommits = commitsByBranch[defaultBranch] || [];
            const oldestUnique = findOldestUniqueCommit(commits);

            if (oldestUnique && oldestUnique.parents?.length) {
                // 고유 커밋이 있으면: parent SHA로 찾기
                const parentSha = oldestUnique.parents[0];
                return mainCommits.find(c => c.sha === parentSha) || null;
            }

            // 고유 커밋이 없으면: HEAD가 master의 어떤 커밋과 같은 SHA인지 찾기
            if (commits.length > 0) {
                const headSha = commits[0].sha;
                return mainCommits.find(c => c.sha === headSha) || null;
            }

            return null;
        };

        // 각 브랜치별 처리
        Object.entries(commitsByBranch).forEach(([branch, commits]) => {
            if (commits.length === 0) return;

            const isExpanded = expandedBranches.has(branch);
            const isDefaultBranch = branch === defaultBranch;

            if (isExpanded) {
                // 확장된 브랜치: 모든 커밋 표시
                const filteredCommits = filterCommits(commits);
                let addedCount = 0;

                // 고유 커밋 목록: HEAD에서 master까지 parent chain 따라가며 찾음
                const ownCommits = findBranchOwnCommits(commits);

                // 분기점 찾기
                const branchPointCommit = !isDefaultBranch ? findBranchPointCommit(commits) : null;

                // 고유 커밋의 SHA 목록
                const ownShas = new Set(ownCommits.map(c => c.sha));

                filteredCommits.forEach(commit => {
                    if (isDefaultBranch) {
                        // master 브랜치: 원래 master 커밋만 표시 (머지로 들어온 커밋 제외)
                        if (!defaultBranchShas.has(commit.sha)) return;
                    } else {
                        // 이 브랜치의 고유 커밋만 표시
                        if (!ownShas.has(commit.sha)) return;
                    }
                    allDisplayCommits.push({ ...commit, branch, type: 'detail' });
                    addedCount++;
                });

                // 고유 커밋이 없어도 HEAD는 표시 (브랜치 라벨용)
                if (!isDefaultBranch && addedCount === 0 && commits.length > 0) {
                    allDisplayCommits.push({ ...commits[0], branch, type: 'head' });
                }

                // 분기점 커밋 추가 (기본 브랜치가 아닌 경우)
                if (!isDefaultBranch && branchPointCommit) {
                    allDisplayCommits.push({
                        ...branchPointCommit,
                        branch: defaultBranch,
                        type: 'branchpoint',
                        forBranch: branch
                    });
                }
            } else {
                // Overview: HEAD와 시작점만
                if (isDefaultBranch) {
                    // 기본 브랜치: HEAD와 가장 오래된 "원래" 커밋 + 머지 커밋들
                    if (commits.length > 0) {
                        allDisplayCommits.push({ ...commits[0], branch, type: 'head' });
                        // 원래 master 커밋 중 가장 오래된 것 찾기
                        const originalCommits = commits.filter(c => defaultBranchShas.has(c.sha));
                        if (originalCommits.length > 1) {
                            allDisplayCommits.push({ ...originalCommits[originalCommits.length - 1], branch, type: 'start' });
                        }

                        // 머지 커밋 추가 (다른 브랜치를 머지한 커밋) - 점선 연결용
                        const mergeCommits = originalCommits.filter(c =>
                            c.parents?.length >= 2 && c.sha !== commits[0].sha
                        );
                        mergeCommits.forEach(mergeCommit => {
                            // 이미 추가된 커밋인지 확인
                            const alreadyAdded = allDisplayCommits.some(
                                dc => dc.sha === mergeCommit.sha && dc.branch === branch
                            );
                            if (!alreadyAdded) {
                                allDisplayCommits.push({ ...mergeCommit, branch, type: 'merge' });
                            }
                        });
                    }
                } else {
                    // 다른 브랜치: 고유 커밋의 HEAD, 시작
                    const ownCommits = findBranchOwnCommits(commits);

                    if (ownCommits.length > 0) {
                        // 고유 커밋이 있는 경우: HEAD와 시작점 표시
                        allDisplayCommits.push({ ...ownCommits[0], branch, type: 'head' });
                        if (ownCommits.length > 1) {
                            allDisplayCommits.push({ ...ownCommits[ownCommits.length - 1], branch, type: 'start' });
                        }

                        // 분기점 커밋 추가
                        const branchPointCommit = findBranchPointCommit(commits);
                        if (branchPointCommit) {
                            allDisplayCommits.push({
                                ...branchPointCommit,
                                branch: defaultBranch,
                                type: 'branchpoint',
                                forBranch: branch
                            });
                        }
                    } else if (commits.length > 0) {
                        // 머지된 브랜치: HEAD만 표시 (전체 히스토리 표시 X)
                        allDisplayCommits.push({ ...commits[0], branch, type: 'head' });

                        // 분기점 커밋 추가 (머지된 브랜치에서도 분기선 표시)
                        const branchPointCommit = findBranchPointCommit(commits);
                        if (branchPointCommit) {
                            allDisplayCommits.push({
                                ...branchPointCommit,
                                branch: defaultBranch,
                                type: 'branchpoint',
                                forBranch: branch
                            });
                        }
                    }
                }
            }
        });

        // 날짜순 정렬
        allDisplayCommits.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 중복 제거: 같은 브랜치 내에서만 중복 제거 (다른 브랜치는 같은 커밋도 허용)
        const seenKeys = new Set();
        const uniqueCommits = [];
        allDisplayCommits.forEach(commit => {
            const key = `${commit.sha}-${commit.branch}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueCommits.push(commit);
            }
        });

        // X 위치 계산: 날짜 펼침 여부에 따라 배치
        const commitXPositions = {};

        // 날짜별로 커밋 그룹화
        const commitsByDate = {};
        const seenShasForDate = new Set();
        uniqueCommits.forEach(commit => {
            if (seenShasForDate.has(commit.sha)) return;
            seenShasForDate.add(commit.sha);

            const dateKey = getDateKey(commit.date);
            if (!commitsByDate[dateKey]) {
                commitsByDate[dateKey] = [];
            }
            commitsByDate[dateKey].push(commit);
        });

        // 고유 날짜 목록 (정렬 순서 유지)
        const uniqueDates = [];
        const seenDates = new Set();
        uniqueCommits.forEach(commit => {
            const dateKey = getDateKey(commit.date);
            if (!seenDates.has(dateKey)) {
                seenDates.add(dateKey);
                uniqueDates.push(dateKey);
            }
        });

        // X 위치 할당
        let xIndex = 0;
        uniqueDates.forEach(dateKey => {
            const commitsOnDate = commitsByDate[dateKey] || [];
            const isDateExpanded = expandedDates.has(dateKey);

            if (isDateExpanded && commitsOnDate.length > 1) {
                // 펼쳐진 날짜: 각 커밋마다 다른 X 위치
                commitsOnDate.forEach(commit => {
                    commitXPositions[commit.sha] = GRAPH_CONFIG.leftPadding + xIndex * GRAPH_CONFIG.horizontalSpacing;
                    xIndex++;
                });
            } else {
                // 접힌 날짜: 같은 X 위치
                const x = GRAPH_CONFIG.leftPadding + xIndex * GRAPH_CONFIG.horizontalSpacing;
                commitsOnDate.forEach(commit => {
                    commitXPositions[commit.sha] = x;
                });
                xIndex++;
            }
        });

        // 노드 생성 (같은 SHA도 다른 브랜치면 다른 노드)
        uniqueCommits.forEach(commit => {
            const row = branchRows[commit.branch] ?? 0;
            const colorIndex = Math.abs(row) % GRAPH_CONFIG.branchColors.length;
            const color = GRAPH_CONFIG.branchColors[colorIndex];
            const x = commitXPositions[commit.sha] ?? GRAPH_CONFIG.leftPadding;
            const y = baseY + row * GRAPH_CONFIG.rowHeight;

            // 복합 키: sha-branch (같은 커밋도 브랜치별로 다른 위치)
            const posKey = `${commit.sha}-${commit.branch}`;
            commitPositions[posKey] = { x, y, branch: commit.branch };
            nodes.push({
                id: posKey,  // 복합 키로 유니크하게
                x, y, color,
                commit,
                branch: commit.branch,
                row,
                type: commit.type
            });
        });

        // 엣지 생성
        // 1. 확장된 브랜치들: 같은 브랜치 내 parent 연결 + master로 수직 분기선
        expandedBranches.forEach(expBranch => {
            if (commitsByBranch[expBranch]) {
                const commits = filterCommits(commitsByBranch[expBranch]);
                const row = branchRows[expBranch] ?? 0;
                const color = GRAPH_CONFIG.branchColors[Math.abs(row) % GRAPH_CONFIG.branchColors.length];

                // 같은 브랜치 내에서만 parent 연결 (다른 브랜치로의 연결은 수직선으로만)
                const branchCommitShas = new Set(commits.map(c => c.sha));
                commits.forEach(commit => {
                    if (commit.parents?.length > 0) {
                        const isMergeCommit = commit.parents.length >= 2;
                        commit.parents.forEach((parentSha, parentIdx) => {
                            // 같은 브랜치 내의 parent만 연결
                            if (!branchCommitShas.has(parentSha)) return;

                            // 복합 키로 조회
                            const fromPos = commitPositions[`${commit.sha}-${expBranch}`];
                            const toPos = commitPositions[`${parentSha}-${expBranch}`];
                            if (fromPos && toPos) {
                                edges.push({
                                    from: `${commit.sha}-${expBranch}`,
                                    to: `${parentSha}-${expBranch}`,
                                    fromX: fromPos.x,
                                    fromY: fromPos.y,
                                    toX: toPos.x,
                                    toY: toPos.y,
                                    color,
                                    crossBranch: false,
                                    isMerge: isMergeCommit && parentIdx > 0 // 두 번째 parent 이상은 머지 연결
                                });
                            }
                        });
                    }
                });

                // 머지 연결: 이 브랜치에서 다른 브랜치로 머지된 경우 (다른 브랜치의 머지 커밋에서 이 브랜치의 커밋으로)
                // 기본 브랜치의 머지 커밋 확인
                if (expBranch !== defaultBranch && commitsByBranch[defaultBranch]) {
                    // 이 브랜치의 고유 커밋만 확인 (다른 브랜치 커밋 제외)
                    const ownCommits = findBranchOwnCommits(commitsByBranch[expBranch]);
                    const ownCommitShas = new Set(ownCommits.map(c => c.sha));
                    const mainCommits = commitsByBranch[defaultBranch];
                    mainCommits.forEach(mainCommit => {
                        if (mainCommit.parents?.length >= 2) {
                            // 머지 커밋의 두 번째 parent 이후가 이 브랜치의 고유 커밋인지 확인
                            mainCommit.parents.slice(1).forEach(mergedParentSha => {
                                if (ownCommitShas.has(mergedParentSha)) {
                                    const mainRow = branchRows[defaultBranch] ?? 0;
                                    const mainColor = GRAPH_CONFIG.branchColors[Math.abs(mainRow) % GRAPH_CONFIG.branchColors.length];
                                    const fromPos = commitPositions[`${mainCommit.sha}-${defaultBranch}`];
                                    const toPos = commitPositions[`${mergedParentSha}-${expBranch}`];
                                    if (fromPos && toPos) {
                                        edges.push({
                                            from: `${mainCommit.sha}-${defaultBranch}`,
                                            to: `${mergedParentSha}-${expBranch}`,
                                            fromX: fromPos.x,
                                            fromY: fromPos.y,
                                            toX: toPos.x,
                                            toY: toPos.y,
                                            color: mainColor,
                                            crossBranch: true,
                                            isMerge: true // 머지 연결 표시
                                        });
                                    }
                                }
                            });
                        }
                    });
                }

                // master로 분기선 (기본 브랜치가 아닌 경우)
                if (expBranch !== defaultBranch) {
                    // 고유 커밋이 있으면 가장 오래된 것, 없으면 HEAD 사용
                    const oldestUnique = findOldestUniqueCommit(commits);
                    const startCommit = oldestUnique || commits[0];

                    if (startCommit) {
                        // 이 브랜치에서 시작 커밋의 노드 찾기
                        const startNode = nodes.find(n =>
                            n.commit.sha === startCommit.sha && n.branch === expBranch
                        );

                        if (startNode) {
                            const branchPointCommit = findBranchPointCommit(commits);
                            // branchpoint는 master 브랜치에 있음 - nodes에서 직접 찾기
                            let branchPointNode = null;
                            if (branchPointCommit) {
                                branchPointNode = nodes.find(n =>
                                    n.commit.sha === branchPointCommit.sha && n.branch === defaultBranch
                                );
                                // 못 찾으면 같은 SHA를 가진 아무 노드나 찾기
                                if (!branchPointNode) {
                                    branchPointNode = nodes.find(n => n.commit.sha === branchPointCommit.sha);
                                }
                            }

                            // 분기점 노드가 없으면, 시간상 가장 가까운 이전 master 노드 찾기
                            if (!branchPointNode && startCommit.date) {
                                const startDate = new Date(startCommit.date);
                                const masterNodes = nodes
                                    .filter(n => n.branch === defaultBranch && n.commit.date)
                                    .filter(n => new Date(n.commit.date) <= startDate)
                                    .sort((a, b) => new Date(b.commit.date) - new Date(a.commit.date));
                                if (masterNodes.length > 0) {
                                    branchPointNode = masterNodes[0];
                                }
                            }

                            // 분기점 노드가 있으면 그 노드에, 없으면 master 라인에 연결
                            edges.push({
                                from: startNode.id,
                                to: branchPointNode?.id || 'master-line',
                                fromX: startNode.x,
                                fromY: startNode.y,
                                toX: branchPointNode?.x ?? startNode.x,
                                toY: branchPointNode?.y ?? baseY,
                                color,
                                crossBranch: true,
                                isVertical: !branchPointNode || branchPointNode.x === startNode.x,
                                hasBranchPoint: !!branchPointNode
                            });
                        }
                    }
                }
            }
        });

        // 2. Overview 브랜치들: HEAD-시작 연결 + master로 수직선
        const branchHeads = {};
        const branchStarts = {};
        nodes.forEach(node => {
            if (expandedBranches.has(node.branch)) return; // 확장된 브랜치는 위에서 처리
            if (node.type === 'head') {
                branchHeads[node.branch] = node;
            }
            if (node.type === 'start') {
                if (!branchStarts[node.branch] || new Date(node.commit.date) < new Date(branchStarts[node.branch].commit.date)) {
                    branchStarts[node.branch] = node;
                }
            }
        });

        // 기본 브랜치 라인 (확장되지 않은 경우)
        if (!expandedBranches.has(defaultBranch)) {
            const row = branchRows[defaultBranch] ?? 0;
            const color = GRAPH_CONFIG.branchColors[Math.abs(row) % GRAPH_CONFIG.branchColors.length];

            // 기본 브랜치의 모든 노드를 찾아서 X 순서대로 정렬
            const defaultBranchNodes = nodes
                .filter(n => n.branch === defaultBranch)
                .sort((a, b) => b.x - a.x); // X 내림차순 (HEAD가 앞, START가 뒤)

            // 연속된 노드들 사이에 엣지 생성
            for (let i = 0; i < defaultBranchNodes.length - 1; i++) {
                const fromNode = defaultBranchNodes[i];
                const toNode = defaultBranchNodes[i + 1];
                edges.push({
                    from: fromNode.id,
                    to: toNode.id,
                    fromX: fromNode.x,
                    fromY: fromNode.y,
                    toX: toNode.x,
                    toY: toNode.y,
                    color,
                    crossBranch: false
                });
            }
        }

        // 다른 브랜치 라인 (확장되지 않은 경우)
        Object.keys(branchRows).forEach(branch => {
            if (branch === defaultBranch || expandedBranches.has(branch)) return;

            // branchHeads에 없으면 nodes에서 직접 찾기
            let head = branchHeads[branch];
            if (!head) {
                head = nodes.find(n => n.branch === branch && n.type === 'head');
            }
            if (!head) {
                head = nodes.find(n => n.branch === branch);
            }
            const start = branchStarts[branch];
            if (!head) return;

            const row = branchRows[branch] ?? 0;
            const color = GRAPH_CONFIG.branchColors[Math.abs(row) % GRAPH_CONFIG.branchColors.length];

            // HEAD와 시작점 연결
            if (start && start.id !== head.id) {
                edges.push({
                    from: head.id,
                    to: start.id,
                    fromX: head.x,
                    fromY: head.y,
                    toX: start.x,
                    toY: start.y,
                    color,
                    crossBranch: false
                });
            }

            // master로 분기선: feature의 시작점에서 분기점 커밋까지
            const startNode = start || head;
            const commits = commitsByBranch[branch] || [];
            const branchPointCommit = findBranchPointCommit(commits);

            // branchpoint 노드를 nodes에서 직접 찾기
            let branchPointNode = null;
            if (branchPointCommit) {
                branchPointNode = nodes.find(n =>
                    n.commit.sha === branchPointCommit.sha && n.branch === defaultBranch
                );
                // 못 찾으면 같은 SHA를 가진 아무 노드나 찾기
                if (!branchPointNode) {
                    branchPointNode = nodes.find(n => n.commit.sha === branchPointCommit.sha);
                }
            }

            // 분기점 노드가 없으면, 시간상 가장 가까운 이전 master 노드 찾기
            if (!branchPointNode && startNode.commit?.date) {
                const startDate = new Date(startNode.commit.date);
                const masterNodes = nodes
                    .filter(n => n.branch === defaultBranch && n.commit.date)
                    .filter(n => new Date(n.commit.date) <= startDate)
                    .sort((a, b) => new Date(b.commit.date) - new Date(a.commit.date));
                if (masterNodes.length > 0) {
                    branchPointNode = masterNodes[0];
                }
            }

            // 분기점 노드가 있으면 그 노드에, 없으면 master 라인에 연결
            edges.push({
                from: startNode.id,
                to: branchPointNode?.id || 'master-line',
                fromX: startNode.x,
                fromY: startNode.y,
                toX: branchPointNode?.x ?? startNode.x,
                toY: branchPointNode?.y ?? baseY,
                color,
                crossBranch: true,
                isVertical: !branchPointNode || branchPointNode.x === startNode.x,
                hasBranchPoint: !!branchPointNode
            });

            // 머지 연결: master의 머지 커밋에서 이 브랜치의 HEAD로 점선 연결
            // 이 브랜치의 고유 커밋만 확인 (다른 브랜치 커밋 제외)
            const ownCommits = findBranchOwnCommits(commits);
            const ownCommitShas = new Set(ownCommits.map(c => c.sha));
            const mainCommits = commitsByBranch[defaultBranch] || [];
            mainCommits.forEach(mainCommit => {
                if (mainCommit.parents?.length >= 2) {
                    // 머지 커밋의 두 번째 parent 이후가 이 브랜치의 고유 커밋인지 확인
                    mainCommit.parents.slice(1).forEach(mergedParentSha => {
                        if (ownCommitShas.has(mergedParentSha)) {
                            const mainRow = branchRows[defaultBranch] ?? 0;
                            const mainColor = GRAPH_CONFIG.branchColors[Math.abs(mainRow) % GRAPH_CONFIG.branchColors.length];
                            // master의 머지 커밋 노드 찾기
                            const mergeCommitNode = nodes.find(n =>
                                n.commit.sha === mainCommit.sha && n.branch === defaultBranch
                            );
                            // 이 브랜치의 HEAD 노드 사용
                            if (mergeCommitNode && head) {
                                edges.push({
                                    from: mergeCommitNode.id,
                                    to: head.id,
                                    fromX: mergeCommitNode.x,
                                    fromY: mergeCommitNode.y,
                                    toX: head.x,
                                    toY: head.y,
                                    color: mainColor,
                                    crossBranch: true,
                                    isMerge: true
                                });
                            }
                        }
                    });
                }
            });
        });

        // 실제 노드 위치 기반으로 bounds 계산
        const bounds = (() => {
            if (nodes.length === 0) {
                return { width: containerSize.width, height: containerSize.height };
            }
            const maxX = Math.max(...nodes.map(n => n.x)) + 150;
            const maxY = Math.max(...nodes.map(n => n.y)) + 100;
            return {
                width: Math.max(maxX, containerSize.width),
                height: Math.max(maxY, containerSize.height)
            };
        })();

        return { nodes, edges, branchRows, baseY, bounds };
    };

    // 배경 클릭 시 선택 해제
    const handleBackgroundClick = () => {
        setSelectedCommit(null);
        setContextMenu(null);
        setBranchContextMenu(null);
    };

    if (!isGithubConnected) {
        return (
            <div className="branch-view dark">
                <div className="branch-view-empty">
                    <div className="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                    </div>
                    <h3>GitHub 저장소 연결 필요</h3>
                    <p>브랜치 시각화를 위해 GitHub 저장소를 연결해주세요.</p>
                </div>
            </div>
        );
    }

    const { nodes, edges, branchRows, baseY, bounds } = renderGraphData();

    return (
        <div className="branch-view dark" onClick={handleBackgroundClick}>
            {/* GitHub 미연결 경고 배너 */}
            {!isUserGithubConnected && (
                <div className="github-warning-banner">
                    <i className="fa-brands fa-github"></i>
                    <span>GitHub 계정이 연결되지 않았습니다. 브랜치 작업(생성, 머지, 삭제 등)을 하려면 </span>
                    <a href="/mypage" onClick={(e) => { e.stopPropagation(); }}>마이페이지</a>
                    <span>에서 GitHub를 연결해주세요.</span>
                </div>
            )}
            {/* 메인 콘텐츠 영역 */}
            <div className="branch-view-content">
            {/* 좌측 브랜치 패널 */}
            <div className="branch-panel">
                <div className="panel-header">
                    <span className="panel-title">BRANCHES</span>
                    <span className="branch-count">{branches.length}</span>
                </div>
                <div className="branch-list">
                    {[...branches].sort((a, b) => {
                        // 기본 브랜치가 항상 맨 위에
                        if (a.name === defaultBranch) return -1;
                        if (b.name === defaultBranch) return 1;
                        return a.name.localeCompare(b.name);
                    }).map((branch, idx) => {
                        const isSelected = selectedBranches.includes(branch.name);
                        // 선택된 브랜치의 row를 기반으로 색상 할당
                        const row = branchRows[branch.name] ?? 0;
                        const colorIndex = Math.abs(row) % GRAPH_CONFIG.branchColors.length;
                        const color = isSelected
                            ? GRAPH_CONFIG.branchColors[colorIndex]
                            : '#6e7681';

                        return (
                            <div
                                key={branch.name}
                                className={`branch-item ${isSelected ? 'selected' : ''}`}
                                onContextMenu={(e) => handleBranchContextMenu(branch.name, e)}
                            >
                                <div
                                    className="branch-color-bar"
                                    style={{ background: color }}
                                />
                                <span
                                    className="branch-name"
                                    onClick={() => toggleBranch(branch.name)}
                                >
                                    {branch.name}
                                    {branch.name === defaultBranch && (
                                        <span className="default-badge">default</span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 메인 그래프 영역 */}
            <div className="graph-main">
                {/* 상단 툴바 */}
                <div className="graph-toolbar">
                    <div className="toolbar-right">
                        {expandedBranches.size === selectedBranches.length ? (
                            <button
                                className="toolbar-icon-btn"
                                onClick={() => setExpandedBranches(new Set())}
                                title="브랜치 전부 축소"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="4 14 10 14 10 20" />
                                    <polyline points="20 10 14 10 14 4" />
                                    <line x1="14" y1="10" x2="21" y2="3" />
                                    <line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                className="toolbar-icon-btn"
                                onClick={() => setExpandedBranches(new Set(selectedBranches))}
                                title="브랜치 전부 확장"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 3 21 3 21 9" />
                                    <polyline points="9 21 3 21 3 15" />
                                    <line x1="21" y1="3" x2="14" y2="10" />
                                    <line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                            </button>
                        )}
                        {(() => {
                            // 모든 날짜 키 수집
                            const allDateKeys = new Set();
                            nodes.forEach(n => {
                                if (n.commit.date) {
                                    const d = new Date(n.commit.date);
                                    allDateKeys.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
                                }
                            });
                            const allExpanded = allDateKeys.size > 0 && expandedDates.size === allDateKeys.size;

                            return allExpanded ? (
                                <button
                                    className="toolbar-icon-btn"
                                    onClick={() => setExpandedDates(new Set())}
                                    title="날짜 전부 축소"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    className="toolbar-icon-btn"
                                    onClick={() => setExpandedDates(allDateKeys)}
                                    title="날짜 전부 확장"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                        <line x1="9" y1="14" x2="15" y2="14" />
                                    </svg>
                                </button>
                            );
                        })()}
                    </div>
                </div>

                {/* 그래프 */}
                <div className="graph-content" ref={graphContainerRef}>
                    {loading ? (
                        <div className="graph-loading">
                            <div className="spinner" />
                            <span>Loading graph...</span>
                        </div>
                    ) : error ? (
                        <div className="graph-error">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    ) : (
                        <div className="graph-viewport">
                            <div className="graph-viewport-inner" ref={viewportRef}>
                                <svg
                                    className="git-graph-svg"
                                    width={bounds.width}
                                    height={bounds.height}
                                >
                                <defs>
                                    {/* 드롭 쉐도우 필터 */}
                                    {GRAPH_CONFIG.branchColors.map((color, i) => (
                                        <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                                            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={color} floodOpacity="0.3" />
                                        </filter>
                                    ))}
                                </defs>

                                <g>
                                    {/* 타임라인 */}
                                    {(() => {
                                        // 날짜 키 생성 함수
                                        const getDateKeyLocal = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

                                        // 먼저 날짜별 고유 SHA 수를 계산 (hasMultiple 판단용)
                                        const dateShaCounts = {};
                                        const seenShas = new Set();
                                        nodes.forEach(n => {
                                            if (n.commit.date && !seenShas.has(n.commit.sha)) {
                                                seenShas.add(n.commit.sha);
                                                const dateKey = getDateKeyLocal(new Date(n.commit.date));
                                                dateShaCounts[dateKey] = (dateShaCounts[dateKey] || 0) + 1;
                                            }
                                        });

                                        // 고유 X 위치별로 날짜 마커 생성
                                        const xPositionMap = new Map();
                                        nodes.forEach(n => {
                                            if (n.commit.date && !xPositionMap.has(n.x)) {
                                                xPositionMap.set(n.x, new Date(n.commit.date));
                                            }
                                        });

                                        if (xPositionMap.size === 0) return null;

                                        // X 위치 순서대로 정렬
                                        const sortedEntries = Array.from(xPositionMap.entries())
                                            .sort((a, b) => a[0] - b[0]);

                                        // 마커 생성
                                        const processedDates = new Set();
                                        const dateMarkers = sortedEntries.map(([x, date]) => {
                                            const dateKey = getDateKeyLocal(date);
                                            const isExpanded = expandedDates.has(dateKey);
                                            const hasMultiple = dateShaCounts[dateKey] > 1;
                                            const isFirst = !processedDates.has(dateKey);
                                            processedDates.add(dateKey);

                                            let dateStr;
                                            if (isExpanded) {
                                                // 펼쳐진 날짜: 시간 표시
                                                dateStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                            } else {
                                                // 접힌 날짜: 날짜만 표시
                                                dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                                            }

                                            return { x, date, dateStr, dateKey, hasMultiple, isExpanded, isFirst };
                                        });

                                        const timelineY = 20;
                                        const minX = Math.min(...nodes.map(n => n.x)) - 10;
                                        const maxX = Math.max(...nodes.map(n => n.x)) + 10;

                                        const toggleDate = (dateKey) => {
                                            setExpandedDates(prev => {
                                                const next = new Set(prev);
                                                if (next.has(dateKey)) {
                                                    next.delete(dateKey);
                                                } else {
                                                    next.add(dateKey);
                                                }
                                                return next;
                                            });
                                        };

                                        return (
                                            <g className="timeline">
                                                {/* 타임라인 축 */}
                                                <line
                                                    x1={minX}
                                                    y1={timelineY}
                                                    x2={maxX}
                                                    y2={timelineY}
                                                    stroke="#cbd5e1"
                                                    strokeWidth={1}
                                                />
                                                {/* 날짜 마커 */}
                                                {dateMarkers.map((marker, idx) => (
                                                    <g key={idx}>
                                                        {/* 눈금선 */}
                                                        <line
                                                            x1={marker.x}
                                                            y1={timelineY - 4}
                                                            x2={marker.x}
                                                            y2={timelineY + 4}
                                                            stroke="#94a3b8"
                                                            strokeWidth={1}
                                                        />
                                                        {/* 펼침 아이콘 (같은 날짜 여러 커밋 있을 때 첫 번째에만) */}
                                                        {marker.hasMultiple && marker.isFirst && (
                                                            <text
                                                                x={marker.x - 25}
                                                                y={timelineY - 10}
                                                                textAnchor="middle"
                                                                fill="#667eea"
                                                                fontSize="10"
                                                                fontWeight="500"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleDate(marker.dateKey);
                                                                }}
                                                            >
                                                                {marker.isExpanded ? '▼' : '▶'}
                                                            </text>
                                                        )}
                                                        {/* 날짜/시간 텍스트 */}
                                                        <text
                                                            x={marker.x}
                                                            y={timelineY - 10}
                                                            textAnchor="middle"
                                                            fill={marker.hasMultiple ? '#667eea' : '#64748b'}
                                                            fontSize={marker.isExpanded ? "9" : "10"}
                                                            fontWeight="500"
                                                            style={{ cursor: marker.hasMultiple ? 'pointer' : 'default' }}
                                                            onClick={(e) => {
                                                                if (marker.hasMultiple) {
                                                                    e.stopPropagation();
                                                                    toggleDate(marker.dateKey);
                                                                }
                                                            }}
                                                        >
                                                            {marker.dateStr}
                                                        </text>
                                                    </g>
                                                ))}
                                            </g>
                                        );
                                    })()}

                                    {/* 브랜치 라인 배경 */}
                                    {Object.entries(branchRows).map(([branch, row]) => {
                                        // 해당 브랜치의 노드들에서 X 범위 찾기
                                        const branchNodes = nodes.filter(n => n.branch === branch);
                                        if (branchNodes.length === 0) return null;

                                        const xPositions = branchNodes.map(n => n.x);
                                        const minX = Math.min(...xPositions);
                                        const maxX = Math.max(...xPositions);

                                        const y = baseY + row * GRAPH_CONFIG.rowHeight;
                                        const startX = minX - 10;
                                        const endX = maxX;
                                        const colorIndex = Math.abs(row) % GRAPH_CONFIG.branchColors.length;
                                        const color = GRAPH_CONFIG.branchColors[colorIndex];

                                        const isExpanded = expandedBranches.has(branch);

                                        return (
                                            <g key={`branch-bg-${branch}`}>
                                                <line
                                                    x1={startX}
                                                    y1={y}
                                                    x2={endX}
                                                    y2={y}
                                                    stroke={color}
                                                    strokeWidth={2}
                                                    strokeOpacity={0.2}
                                                />
                                                {/* 브랜치 이름 (클릭하여 확장) */}
                                                <text
                                                    x={10}
                                                    y={y + 4}
                                                    className="branch-label-text"
                                                    fill={color}
                                                    style={{ cursor: 'pointer', fontWeight: isExpanded ? 700 : 600 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedBranches(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(branch)) {
                                                                next.delete(branch);
                                                            } else {
                                                                next.add(branch);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {isExpanded
                                                        ? <tspan fontSize="14" dy="-4">⌄</tspan>
                                                        : <tspan fontSize="14" dy="0">›</tspan>
                                                    }
                                                    <tspan dx="4" dy={isExpanded ? "4" : "0"}>{branch.length > 16 ? branch.substring(0, 16) + '...' : branch}</tspan>
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* 연결선 */}
                                    {edges.map((edge, index) => {
                                        const branch = nodes.find(n => n.id === edge.from)?.branch;
                                        const row = branchRows[branch] ?? 0;
                                        const colorIndex = Math.abs(row) % GRAPH_CONFIG.branchColors.length;
                                        // 머지 연결은 점선으로 표시
                                        const dashArray = edge.isMerge ? "6 4" : undefined;

                                        if (edge.fromY === edge.toY) {
                                            // 같은 행: 수평 직선
                                            return (
                                                <line
                                                    key={`edge-${index}`}
                                                    x1={edge.fromX}
                                                    y1={edge.fromY}
                                                    x2={edge.toX}
                                                    y2={edge.toY}
                                                    stroke={edge.color}
                                                    strokeWidth={3}
                                                    strokeDasharray={dashArray}
                                                    filter={`url(#glow-${colorIndex})`}
                                                />
                                            );
                                        } else if (edge.isVertical || edge.fromX === edge.toX) {
                                            // 수직선: feature에서 master로 직접 연결
                                            return (
                                                <g key={`edge-${index}`}>
                                                    <line
                                                        x1={edge.fromX}
                                                        y1={edge.fromY}
                                                        x2={edge.toX}
                                                        y2={edge.toY}
                                                        stroke={edge.color}
                                                        strokeWidth={3}
                                                        strokeOpacity={0.7}
                                                        strokeDasharray={dashArray}
                                                    />
                                                </g>
                                            );
                                        } else {
                                            // 다른 행: 계단식 (step) - feature에서 master의 분기점 커밋으로 연결
                                            // 머지인 경우: V(수직) 먼저 → H(수평) 나중에 (main에서 feature로 내려감)
                                            // 분기인 경우: H(수평) 먼저 → V(수직) 나중에 (feature에서 main으로 올라감)
                                            const pathD = edge.isMerge
                                                ? `M ${edge.fromX} ${edge.fromY} V ${edge.toY} H ${edge.toX}`
                                                : `M ${edge.fromX} ${edge.fromY} H ${edge.toX} V ${edge.toY}`;
                                            return (
                                                <g key={`edge-${index}`}>
                                                    <path
                                                        d={pathD}
                                                        stroke={edge.color}
                                                        strokeWidth={3}
                                                        fill="none"
                                                        strokeOpacity={0.7}
                                                        strokeDasharray={dashArray}
                                                    />
                                                </g>
                                            );
                                        }
                                    })}

                                    {/* 커밋 노드 */}
                                    {nodes.map(node => {
                                        const isSelected = selectedCommit?.id === node.id;
                                        const isDragging = dragState?.node?.id === node.id;
                                        const isDropTarget = dropTarget?.id === node.id;
                                        const initial = (node.commit.authorLogin || node.commit.authorName || '?')[0].toUpperCase();

                                        return (
                                            <g
                                                key={node.id}
                                                className={`commit-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                                                onClick={(e) => !dragState && handleCommitClick(node, e)}
                                                onContextMenu={(e) => handleContextMenu(node, e)}
                                                onMouseDown={(e) => handleDragStart(node, e)}
                                                onMouseEnter={() => {
                                                    if (dragState && dragState.node.branch !== node.branch) {
                                                        setDropTarget(node);
                                                    } else if (!dragState) {
                                                        setHoveredCommit(node);
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    setDropTarget(null);
                                                    if (!dragState) setHoveredCommit(null);
                                                }}
                                                style={{ cursor: dragState ? 'grabbing' : 'grab' }}
                                            >
                                                {/* 드롭 타겟 표시 */}
                                                {isDropTarget && (
                                                    <circle
                                                        cx={node.x}
                                                        cy={node.y}
                                                        r={GRAPH_CONFIG.nodeRadius + 10}
                                                        fill="none"
                                                        stroke="#22c55e"
                                                        strokeWidth={3}
                                                        strokeDasharray="5 3"
                                                        opacity={0.8}
                                                    />
                                                )}
                                                {/* 선택 링 */}
                                                {isSelected && (
                                                    <circle
                                                        cx={node.x}
                                                        cy={node.y}
                                                        r={GRAPH_CONFIG.nodeRadius + 6}
                                                        fill="none"
                                                        stroke={node.color}
                                                        strokeWidth={3}
                                                        opacity={0.5}
                                                    />
                                                )}
                                                {/* 노드 */}
                                                <circle
                                                    cx={node.x}
                                                    cy={node.y}
                                                    r={GRAPH_CONFIG.nodeRadius}
                                                    fill={isDragging ? '#94a3b8' : node.color}
                                                    stroke="white"
                                                    strokeWidth={3}
                                                    filter={`url(#glow-${Math.abs(node.row) % GRAPH_CONFIG.branchColors.length})`}
                                                    className="node-circle"
                                                    opacity={isDragging ? 0.5 : 1}
                                                />
                                                {/* 이니셜 */}
                                                <text
                                                    x={node.x}
                                                    y={node.y + 5}
                                                    className="node-initial"
                                                    textAnchor="middle"
                                                    fill="#fff"
                                                    fontSize="11"
                                                    fontWeight="bold"
                                                    opacity={isDragging ? 0.5 : 1}
                                                >
                                                    {initial}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* 드래그 중인 노드 (고스트) */}
                                    {dragState && (
                                        <g style={{ pointerEvents: 'none' }}>
                                            <circle
                                                cx={dragState.currentX}
                                                cy={dragState.currentY}
                                                r={GRAPH_CONFIG.nodeRadius}
                                                fill={dragState.node.color}
                                                stroke="white"
                                                strokeWidth={3}
                                                opacity={0.8}
                                            />
                                            <text
                                                x={dragState.currentX}
                                                y={dragState.currentY + 5}
                                                textAnchor="middle"
                                                fill="#fff"
                                                fontSize="11"
                                                fontWeight="bold"
                                            >
                                                {(dragState.node.commit.authorLogin || dragState.node.commit.authorName || '?')[0].toUpperCase()}
                                            </text>
                                        </g>
                                    )}
                                </g>
                                </svg>

                                {/* 호버 툴팁 */}
                                {hoveredCommit && !selectedCommit && (
                                    <div
                                        className="commit-tooltip"
                                        style={{
                                            left: hoveredCommit.x + 20,
                                            top: hoveredCommit.y - 10
                                        }}
                                    >
                                        <div className="tooltip-message">{hoveredCommit.commit.message}</div>
                                        <div className="tooltip-author">
                                            {hoveredCommit.commit.authorLogin || hoveredCommit.commit.authorName}
                                        </div>
                                    </div>
                                )}

                                {/* 컨텍스트 메뉴 (커밋) */}
                                {contextMenu && (
                                    <div
                                        className="context-menu"
                                        style={{ left: contextMenu.x, top: contextMenu.y }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {contextMenuActions.map((action, i) => {
                                            // hideIf 조건 확인
                                            if (action.hideIf && action.hideIf(contextMenu.commit, contextMenu.branch)) {
                                                return null;
                                            }
                                            return action.type === 'divider' ? (
                                                <div key={i} className="context-menu-divider" />
                                            ) : (
                                                <button
                                                    key={i}
                                                    className="context-menu-item"
                                                    onClick={() => {
                                                        action.action(contextMenu.commit, contextMenu.branch);
                                                        setContextMenu(null);
                                                    }}
                                                >
                                                    <span className="menu-icon">{action.icon}</span>
                                                    {action.label}
                                                    {action.label.includes('커밋까지') && contextMenu.commit?.shortSha && (
                                                        <span className="menu-branch-hint"> ({contextMenu.commit.shortSha})</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 우측 상세 패널 */}
            {selectedCommit && (
                <div className="detail-panel">
                    <div className="detail-header">
                        <span className="detail-title">Commit Details</span>
                        <button className="close-btn" onClick={() => setSelectedCommit(null)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <div className="detail-content">
                        <div className="detail-section">
                            <div className="detail-sha">
                                <span className="sha-badge" style={{ background: selectedCommit.color }}>
                                    {selectedCommit.commit.shortSha}
                                </span>
                                <button
                                    className="copy-btn"
                                    onClick={() => navigator.clipboard.writeText(selectedCommit.commit.sha)}
                                    title="Copy SHA"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="detail-section">
                            <div className="detail-label">Message</div>
                            <div className="detail-message">{selectedCommit.commit.message}</div>
                        </div>
                        <div className="detail-section">
                            <div className="detail-label">Author</div>
                            <div className="detail-author">
                                <div className="author-avatar" style={{ background: selectedCommit.color }}>
                                    {(selectedCommit.commit.authorLogin || selectedCommit.commit.authorName || '?')[0].toUpperCase()}
                                </div>
                                <span>{selectedCommit.commit.authorLogin || selectedCommit.commit.authorName}</span>
                            </div>
                        </div>
                        {selectedCommit.commit.date && (
                            <div className="detail-section">
                                <div className="detail-label">Date</div>
                                <div className="detail-date">
                                    {new Date(selectedCommit.commit.date).toLocaleString('ko-KR')}
                                </div>
                            </div>
                        )}
                        <div className="detail-section">
                            <div className="detail-label">Branch</div>
                            <div className="detail-branch" style={{ color: selectedCommit.color }}>
                                {selectedCommit.branch}
                            </div>
                        </div>
                        <div className="detail-actions">
                            <button
                                className="action-button primary"
                                onClick={() => window.open(selectedCommit.commit.htmlUrl, '_blank')}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                GitHub에서 보기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* 브랜치 생성 다이얼로그 */}
            {createBranchDialog && (
                <div className="dialog-overlay" onClick={() => !dialogLoading && setCreateBranchDialog(null)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>새 브랜치 생성</h3>
                            <button className="dialog-close" onClick={() => !dialogLoading && setCreateBranchDialog(null)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="dialog-body">
                            <div className="dialog-info">
                                <span className="info-label">기준 커밋:</span>
                                <span className="info-value">{createBranchDialog.shortSha}</span>
                            </div>
                            <div className="dialog-info">
                                <span className="info-label">메시지:</span>
                                <span className="info-value">{createBranchDialog.message}</span>
                            </div>
                            <div className="dialog-field">
                                <label>브랜치 이름</label>
                                <input
                                    type="text"
                                    id="new-branch-name"
                                    placeholder="feature/new-feature"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !dialogLoading) {
                                            handleCreateBranch(e.target.value);
                                        }
                                    }}
                                />
                            </div>
                            {dialogError && <div className="dialog-error">{dialogError}</div>}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => setCreateBranchDialog(null)} disabled={dialogLoading}>
                                취소
                            </button>
                            <button
                                className="dialog-btn primary"
                                onClick={() => handleCreateBranch(document.getElementById('new-branch-name').value)}
                                disabled={dialogLoading}
                            >
                                {dialogLoading ? '생성 중...' : '생성'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 머지 다이얼로그 */}
            {mergeDialog && (
                <div className="dialog-overlay" onClick={() => { if (!dialogLoading) { setMergeDialog(null); setSelectedTaskId(''); } }}>
                    <div className="dialog dialog-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>브랜치 머지</h3>
                            <button className="dialog-close" onClick={() => { if (!dialogLoading) { setMergeDialog(null); setSelectedTaskId(''); } }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="dialog-body">
                            {/* 머지 타입 선택 */}
                            <div className="merge-type-selector">
                                <button
                                    className={`merge-type-btn ${mergeDialog.mergeType !== 'pr' ? 'active' : ''}`}
                                    onClick={() => setMergeDialog({ ...mergeDialog, mergeType: 'direct' })}
                                    disabled={dialogLoading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                                        <path d="M6 21V9a9 9 0 0 0 9 9" />
                                    </svg>
                                    <span>직접 머지</span>
                                    <small>바로 머지합니다</small>
                                </button>
                                <button
                                    className={`merge-type-btn ${mergeDialog.mergeType === 'pr' ? 'active' : ''}`}
                                    onClick={() => setMergeDialog({ ...mergeDialog, mergeType: 'pr' })}
                                    disabled={dialogLoading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                                        <path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
                                    </svg>
                                    <span>Pull Request</span>
                                    <small>리뷰 후 머지합니다</small>
                                </button>
                            </div>

                            <div className="dialog-info">
                                <span className="info-label">머지할 브랜치:</span>
                                <span className="info-value">{mergeDialog.head}</span>
                            </div>
                            <div className="dialog-field">
                                <label>대상 브랜치 (base)</label>
                                {mergeDialog.base ? (
                                    <input type="text" value={mergeDialog.base} readOnly />
                                ) : (
                                    <select id="merge-base-branch" defaultValue={defaultBranch}>
                                        {branches.filter(b => b.name !== mergeDialog.head).map(b => (
                                            <option key={b.name} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {mergeDialog.mergeType === 'pr' ? (
                                <>
                                    <div className="dialog-field">
                                        <label>연결할 Task (선택)</label>
                                        <select
                                            id="pr-task"
                                            value={selectedTaskId}
                                            onChange={(e) => setSelectedTaskId(e.target.value)}
                                        >
                                            <option value="">Task 연결 없음</option>
                                            {tasks.map(task => (
                                                <option key={task.taskId} value={task.taskId}>
                                                    #{task.taskId} - {task.title?.substring(0, 40)}{task.title?.length > 40 ? '...' : ''}
                                                    {task.issueNumber ? ` (Issue #${task.issueNumber})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="dialog-field">
                                        <label>PR 제목 *</label>
                                        <input
                                            type="text"
                                            id="pr-title"
                                            placeholder={`Merge ${mergeDialog.head} into ${mergeDialog.base || defaultBranch}`}
                                            defaultValue={`Merge ${mergeDialog.head}`}
                                        />
                                    </div>
                                    <div className="dialog-field">
                                        <label>PR 설명 (선택)</label>
                                        <textarea
                                            id="pr-body"
                                            rows="3"
                                            placeholder="변경 사항에 대한 설명을 입력하세요..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="dialog-field">
                                    <label>커밋 메시지 (선택)</label>
                                    <input
                                        type="text"
                                        id="merge-commit-message"
                                        placeholder={`Merge ${mergeDialog.head} into ${mergeDialog.base || defaultBranch}`}
                                    />
                                </div>
                            )}

                            {dialogError && <div className="dialog-error">{dialogError}</div>}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => { setMergeDialog(null); setSelectedTaskId(''); }} disabled={dialogLoading}>
                                취소
                            </button>
                            {mergeDialog.mergeType === 'pr' ? (
                                <button
                                    className="dialog-btn primary"
                                    onClick={() => {
                                        const base = mergeDialog.base || document.getElementById('merge-base-branch')?.value || defaultBranch;
                                        const title = document.getElementById('pr-title')?.value;
                                        const body = document.getElementById('pr-body')?.value;
                                        if (!title?.trim()) {
                                            setDialogError('PR 제목을 입력해주세요.');
                                            return;
                                        }
                                        handleCreatePR(base, title, body, selectedTaskId);
                                    }}
                                    disabled={dialogLoading}
                                >
                                    {dialogLoading ? 'PR 생성 중...' : 'PR 생성'}
                                </button>
                            ) : (
                                <button
                                    className="dialog-btn primary"
                                    onClick={() => {
                                        const base = mergeDialog.base || document.getElementById('merge-base-branch')?.value || defaultBranch;
                                        const commitMessage = document.getElementById('merge-commit-message')?.value;
                                        handleMergeBranch(base, commitMessage);
                                    }}
                                    disabled={dialogLoading}
                                >
                                    {dialogLoading ? '머지 중...' : '머지'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 커밋 머지 다이얼로그 */}
            {mergeCommitDialog && (
                <div className="dialog-overlay" onClick={() => { if (!dialogLoading) { setMergeCommitDialog(null); setSelectedTaskId(''); } }}>
                    <div className="dialog dialog-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>커밋까지 머지</h3>
                            <button className="dialog-close" onClick={() => { if (!dialogLoading) { setMergeCommitDialog(null); setSelectedTaskId(''); } }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="dialog-body">
                            {/* 머지 타입 선택 */}
                            <div className="merge-type-selector">
                                <button
                                    className={`merge-type-btn ${mergeCommitDialog.mergeType !== 'pr' ? 'active' : ''}`}
                                    onClick={() => setMergeCommitDialog({ ...mergeCommitDialog, mergeType: 'direct' })}
                                    disabled={dialogLoading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                                        <path d="M6 21V9a9 9 0 0 0 9 9" />
                                    </svg>
                                    <span>직접 머지</span>
                                    <small>바로 머지합니다</small>
                                </button>
                                <button
                                    className={`merge-type-btn ${mergeCommitDialog.mergeType === 'pr' ? 'active' : ''}`}
                                    onClick={() => setMergeCommitDialog({ ...mergeCommitDialog, mergeType: 'pr' })}
                                    disabled={dialogLoading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                                        <path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
                                    </svg>
                                    <span>Pull Request</span>
                                    <small>리뷰 후 머지합니다</small>
                                </button>
                            </div>

                            <div className="dialog-info">
                                <span className="info-label">커밋:</span>
                                <span className="info-value">{mergeCommitDialog.shortSha}</span>
                            </div>
                            <div className="dialog-info">
                                <span className="info-label">메시지:</span>
                                <span className="info-value">{mergeCommitDialog.message}</span>
                            </div>
                            {mergeCommitDialog.branch && (
                                <div className="dialog-info">
                                    <span className="info-label">브랜치:</span>
                                    <span className="info-value">{mergeCommitDialog.branch}</span>
                                </div>
                            )}
                            <div className="dialog-field">
                                <label>대상 브랜치 (머지할 곳)</label>
                                <select id="merge-commit-base-branch" defaultValue={mergeCommitDialog.targetBranch || defaultBranch}>
                                    {branches.filter(b => b.name !== mergeCommitDialog.branch).map(b => (
                                        <option key={b.name} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            {mergeCommitDialog.mergeType === 'pr' ? (
                                <>
                                    <div className="dialog-field">
                                        <label>연결할 Task (선택)</label>
                                        <select
                                            id="commit-pr-task"
                                            value={selectedTaskId}
                                            onChange={(e) => setSelectedTaskId(e.target.value)}
                                        >
                                            <option value="">Task 연결 없음</option>
                                            {tasks.map(task => (
                                                <option key={task.taskId} value={task.taskId}>
                                                    #{task.taskId} - {task.title?.substring(0, 40)}{task.title?.length > 40 ? '...' : ''}
                                                    {task.issueNumber ? ` (Issue #${task.issueNumber})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="dialog-field">
                                        <label>PR 제목 *</label>
                                        <input
                                            type="text"
                                            id="commit-pr-title"
                                            placeholder={`Merge commit ${mergeCommitDialog.shortSha}`}
                                            defaultValue={`Merge commit ${mergeCommitDialog.shortSha}: ${mergeCommitDialog.message?.substring(0, 30) || ''}`}
                                        />
                                    </div>
                                    <div className="dialog-field">
                                        <label>PR 설명 (선택)</label>
                                        <textarea
                                            id="commit-pr-body"
                                            rows="3"
                                            placeholder="변경 사항에 대한 설명을 입력하세요..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="dialog-note">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    <span>이 커밋까지의 변경사항만 머지됩니다. 이후 커밋은 포함되지 않습니다.</span>
                                </div>
                            )}

                            {dialogError && <div className="dialog-error">{dialogError}</div>}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => { setMergeCommitDialog(null); setSelectedTaskId(''); }} disabled={dialogLoading}>
                                취소
                            </button>
                            {mergeCommitDialog.mergeType === 'pr' ? (
                                <button
                                    className="dialog-btn primary"
                                    onClick={() => {
                                        const base = document.getElementById('merge-commit-base-branch').value;
                                        const title = document.getElementById('commit-pr-title')?.value;
                                        const body = document.getElementById('commit-pr-body')?.value;
                                        if (!title?.trim()) {
                                            setDialogError('PR 제목을 입력해주세요.');
                                            return;
                                        }
                                        handleCreatePRFromCommit(base, title, body, selectedTaskId);
                                    }}
                                    disabled={dialogLoading}
                                >
                                    {dialogLoading ? 'PR 생성 중...' : 'PR 생성'}
                                </button>
                            ) : (
                                <button
                                    className="dialog-btn primary"
                                    onClick={() => {
                                        const base = document.getElementById('merge-commit-base-branch').value;
                                        handleMergeCommit(base);
                                    }}
                                    disabled={dialogLoading}
                                >
                                    {dialogLoading ? '머지 중...' : '머지'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 삭제 확인 다이얼로그 */}
            {deleteConfirmDialog && (
                <div className="dialog-overlay" onClick={() => !dialogLoading && setDeleteConfirmDialog(null)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>브랜치 삭제</h3>
                            <button className="dialog-close" onClick={() => !dialogLoading && setDeleteConfirmDialog(null)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="dialog-body">
                            <div className="dialog-warning">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <p>
                                    <strong>{deleteConfirmDialog.branchName}</strong> 브랜치를 삭제하시겠습니까?<br />
                                    이 작업은 되돌릴 수 없습니다.
                                </p>
                            </div>
                            {dialogError && <div className="dialog-error">{dialogError}</div>}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => setDeleteConfirmDialog(null)} disabled={dialogLoading}>
                                취소
                            </button>
                            <button
                                className="dialog-btn danger"
                                onClick={handleDeleteBranch}
                                disabled={dialogLoading}
                            >
                                {dialogLoading ? '삭제 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revert 확인 다이얼로그 */}
            {revertDialog && (
                <div className="dialog-overlay" onClick={() => !dialogLoading && setRevertDialog(null)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>커밋 되돌리기 (Revert)</h3>
                            <button className="dialog-close" onClick={() => !dialogLoading && setRevertDialog(null)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="dialog-body">
                            <div className="dialog-info">
                                <p>
                                    다음 커밋의 변경사항을 되돌리시겠습니까?
                                </p>
                                <div className="commit-info-box">
                                    <code>{revertDialog.shortSha}</code>
                                    <span className="commit-message">{revertDialog.message}</span>
                                </div>
                                <p className="dialog-hint">
                                    Revert는 해당 커밋의 변경사항을 되돌리는 <strong>새 커밋</strong>을 생성합니다.
                                    기존 히스토리는 유지됩니다.
                                </p>
                            </div>
                            {dialogError && <div className="dialog-error">{dialogError}</div>}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => setRevertDialog(null)} disabled={dialogLoading}>
                                취소
                            </button>
                            <button
                                className="dialog-btn primary"
                                onClick={handleRevertCommit}
                                disabled={dialogLoading}
                            >
                                {dialogLoading ? '되돌리는 중...' : 'Revert'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 브랜치 컨텍스트 메뉴 (최상위 레벨) */}
            {branchContextMenu && (
                <div
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        left: branchContextMenu.x,
                        top: branchContextMenu.y,
                        zIndex: 1000
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            setMergeDialog({ head: branchContextMenu.branch, base: defaultBranch, mergeType: 'direct' });
                            setBranchContextMenu(null);
                            setDialogError(null);
                        }}
                    >
                        <span className="menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                                <path d="M6 21V9a9 9 0 0 0 9 9" />
                            </svg>
                        </span>
                        {defaultBranch}에 머지
                    </button>
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            setMergeDialog({ head: branchContextMenu.branch, base: null, mergeType: 'direct' });
                            setBranchContextMenu(null);
                            setDialogError(null);
                        }}
                    >
                        <span className="menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                                <path d="M6 21V9a9 9 0 0 0 9 9" />
                            </svg>
                        </span>
                        다른 브랜치에 머지...
                    </button>
                    {branchContextMenu.branch !== defaultBranch && (
                        <>
                            <div className="context-menu-divider" />
                            <button
                                className="context-menu-item danger"
                                onClick={() => {
                                    setDeleteConfirmDialog({ branchName: branchContextMenu.branch });
                                    setBranchContextMenu(null);
                                    setDialogError(null);
                                }}
                            >
                                <span className="menu-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </span>
                                브랜치 삭제
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default BranchView;
