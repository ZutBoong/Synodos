import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBranches, getCommitsGraph, getDefaultBranch, createBranch, mergeBranches as mergeBranchesApi, deleteBranch } from '../../api/githubApi';
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

function BranchView({ team, loginMember }) {
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [defaultBranch, setDefaultBranch] = useState('main');
    const [commitsByBranch, setCommitsByBranch] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [depth, setDepth] = useState(100);
    const [expandedBranches, setExpandedBranches] = useState(new Set()); // 확장된 브랜치들
    const [expandedDates, setExpandedDates] = useState(new Set()); // 펼쳐진 날짜들

    // 선택된 커밋 (상세 패널용)
    const [selectedCommit, setSelectedCommit] = useState(null);
    const [hoveredCommit, setHoveredCommit] = useState(null);

    // 검색
    const [searchQuery, setSearchQuery] = useState('');

    // 컨텍스트 메뉴
    const [contextMenu, setContextMenu] = useState(null);
    const [branchContextMenu, setBranchContextMenu] = useState(null); // 브랜치 패널용

    // 다이얼로그 상태
    const [createBranchDialog, setCreateBranchDialog] = useState(null); // { sha, shortSha, message }
    const [mergeDialog, setMergeDialog] = useState(null); // { head }
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null); // { branchName }
    const [dialogLoading, setDialogLoading] = useState(false);
    const [dialogError, setDialogError] = useState(null);

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

    // localStorage 키 생성
    const getStorageKey = (teamId) => `branchView_selectedBranches_${teamId}`;

    // 브랜치 목록 로드
    useEffect(() => {
        if (!isGithubConnected || !team?.teamId) return;

        const loadBranches = async () => {
            try {
                const [branchList, defaultBranchData] = await Promise.all([
                    getBranches(team.teamId),
                    getDefaultBranch(team.teamId)
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

    // 그래프 크기 계산 (상단 배치 기준)
    const getGraphBounds = useCallback(() => {
        // 모든 브랜치의 고유 커밋 수 계산
        const allShas = new Set();
        Object.values(commitsByBranch).forEach(commits => {
            commits.forEach(c => allShas.add(c.sha));
        });
        const totalUniqueCommits = Math.max(allShas.size, 1);

        // 브랜치 수 = 행 수 (main이 0, 나머지가 1, 2, 3...)
        const totalRows = Math.max(selectedBranches.length, 1);

        const contentWidth = GRAPH_CONFIG.leftPadding + totalUniqueCommits * GRAPH_CONFIG.horizontalSpacing + 100;
        const contentHeight = GRAPH_CONFIG.topPadding + totalRows * GRAPH_CONFIG.rowHeight + GRAPH_CONFIG.topPadding;

        // 컨테이너보다 작으면 컨테이너 크기 사용
        return {
            width: Math.max(contentWidth, containerSize.width),
            height: Math.max(contentHeight, containerSize.height)
        };
    }, [commitsByBranch, selectedBranches.length, containerSize]);

    // 커밋 클릭
    const handleCommitClick = (node, e) => {
        e.stopPropagation();
        setSelectedCommit(node);
        setContextMenu(null);
    };

    // 우클릭 컨텍스트 메뉴
    const handleContextMenu = (node, e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = viewportRef.current?.getBoundingClientRect();
        setContextMenu({
            x: e.clientX - (rect?.left || 0),
            y: e.clientY - (rect?.top || 0),
            commit: node.commit
        });
    };

    // 컨텍스트 메뉴 액션
    const contextMenuActions = [
        {
            label: 'GitHub에서 보기',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
            action: (c) => window.open(c.htmlUrl, '_blank')
        },
        {
            label: 'SHA 복사',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
            action: (c) => navigator.clipboard.writeText(c.sha)
        },
        {
            label: '메시지 복사',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
            action: (c) => navigator.clipboard.writeText(c.message)
        },
        { type: 'divider' },
        {
            label: '여기서 브랜치 생성',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>,
            action: (c) => {
                setCreateBranchDialog({ sha: c.sha, shortSha: c.shortSha, message: c.message });
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

        setDialogLoading(true);
        setDialogError(null);
        try {
            await createBranch(team.teamId, branchName.trim(), createBranchDialog.sha);
            setCreateBranchDialog(null);
            // 브랜치 목록 새로고침
            const branchList = await getBranches(team.teamId);
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

        setDialogLoading(true);
        setDialogError(null);
        try {
            const result = await mergeBranchesApi(team.teamId, base, mergeDialog.head, commitMessage || null);
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

    const handleDeleteBranch = async () => {
        if (!deleteConfirmDialog?.branchName) return;

        setDialogLoading(true);
        setDialogError(null);
        try {
            await deleteBranch(team.teamId, deleteConfirmDialog.branchName);
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
            const data = await getCommitsGraph(team.teamId, selectedBranches, depth);
            setCommitsByBranch(data.commitsByBranch || {});
        } catch (err) {
            console.error('Failed to load commits graph:', err);
            setError('커밋 그래프를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [isGithubConnected, team?.teamId, selectedBranches, depth]);

    // 검색 필터링
    const filterCommits = (commits) => {
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

        // 기본 브랜치의 커밋 SHA 목록 수집
        const defaultBranchShas = new Set();
        if (commitsByBranch[defaultBranch]) {
            commitsByBranch[defaultBranch].forEach(commit => {
                defaultBranchShas.add(commit.sha);
            });
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

        // 브랜치의 가장 오래된 고유 커밋 찾기
        const findOldestUniqueCommit = (commits) => {
            const uniqueCommits = commits.filter(c => !defaultBranchShas.has(c.sha));
            if (uniqueCommits.length === 0) return null;
            return uniqueCommits[uniqueCommits.length - 1];
        };

        // 분기점 커밋 찾기: 가장 오래된 고유 커밋의 parent를 master에서 찾기
        const findBranchPointCommit = (commits) => {
            const oldestUnique = findOldestUniqueCommit(commits);
            if (!oldestUnique || !oldestUnique.parents?.length) return null;

            const parentSha = oldestUnique.parents[0];
            const mainCommits = commitsByBranch[defaultBranch] || [];
            return mainCommits.find(c => c.sha === parentSha) || null;
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

                filteredCommits.forEach(commit => {
                    // 기본 브랜치가 아니면 기본 브랜치에 없는 커밋만
                    if (!isDefaultBranch && defaultBranchShas.has(commit.sha)) return;
                    allDisplayCommits.push({ ...commit, branch, type: 'detail' });
                    addedCount++;
                });

                // 고유 커밋이 없어도 HEAD는 표시 (브랜치 라벨용)
                if (!isDefaultBranch && addedCount === 0 && commits.length > 0) {
                    allDisplayCommits.push({ ...commits[0], branch, type: 'head' });
                }

                // 분기점 커밋 추가 (기본 브랜치가 아닌 경우)
                if (!isDefaultBranch) {
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
            } else {
                // Overview: HEAD와 시작점만
                if (isDefaultBranch) {
                    // 기본 브랜치: HEAD와 가장 오래된 커밋
                    if (commits.length > 0) {
                        allDisplayCommits.push({ ...commits[0], branch, type: 'head' });
                        if (commits.length > 1) {
                            allDisplayCommits.push({ ...commits[commits.length - 1], branch, type: 'start' });
                        }
                    }
                } else {
                    // 다른 브랜치: 고유 커밋의 HEAD, 시작
                    const uniqueCommits = commits.filter(c => !defaultBranchShas.has(c.sha));

                    if (uniqueCommits.length > 0) {
                        allDisplayCommits.push({ ...uniqueCommits[0], branch, type: 'head' });
                        if (uniqueCommits.length > 1) {
                            allDisplayCommits.push({ ...uniqueCommits[uniqueCommits.length - 1], branch, type: 'start' });
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
                        // 고유 커밋이 없어도 HEAD는 표시 (브랜치 라벨용)
                        allDisplayCommits.push({ ...commits[0], branch, type: 'head' });
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

        // X 위치 계산: 펼쳐진 날짜는 개별 표시, 나머지는 그룹화
        const commitXPositions = {};

        // 날짜별로 커밋 그룹화
        const commitsByDate = {};
        uniqueCommits.forEach(commit => {
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
            const isExpanded = expandedDates.has(dateKey);

            if (isExpanded && commitsOnDate.length > 1) {
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
                        commit.parents.forEach(parentSha => {
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
                                    crossBranch: false
                                });
                            }
                        });
                    }
                });

                // master로 분기선 (기본 브랜치가 아닌 경우)
                if (expBranch !== defaultBranch) {
                    const oldestUnique = findOldestUniqueCommit(commits);
                    if (oldestUnique) {
                        // 복합 키로 조회
                        const oldestPos = commitPositions[`${oldestUnique.sha}-${expBranch}`];
                        if (oldestPos) {
                            const branchPointCommit = findBranchPointCommit(commits);
                            // branchpoint는 master 브랜치에 있음
                            const branchPointPos = branchPointCommit
                                ? commitPositions[`${branchPointCommit.sha}-${defaultBranch}`]
                                : null;

                            edges.push({
                                from: `${oldestUnique.sha}-${expBranch}`,
                                to: branchPointCommit ? `${branchPointCommit.sha}-${defaultBranch}` : 'master-line',
                                fromX: oldestPos.x,
                                fromY: oldestPos.y,
                                toX: branchPointPos?.x ?? oldestPos.x,
                                toY: branchPointPos?.y ?? baseY,
                                color,
                                crossBranch: true,
                                isVertical: !branchPointPos || branchPointPos.x === oldestPos.x,
                                hasBranchPoint: !!branchPointPos
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
        if (!expandedBranches.has(defaultBranch) && branchHeads[defaultBranch] && branchStarts[defaultBranch]) {
            const row = branchRows[defaultBranch] ?? 0;
            edges.push({
                from: branchHeads[defaultBranch].id,
                to: branchStarts[defaultBranch].id,
                fromX: branchHeads[defaultBranch].x,
                fromY: branchHeads[defaultBranch].y,
                toX: branchStarts[defaultBranch].x,
                toY: branchStarts[defaultBranch].y,
                color: GRAPH_CONFIG.branchColors[Math.abs(row) % GRAPH_CONFIG.branchColors.length],
                crossBranch: false
            });
        }

        // 다른 브랜치 라인 (확장되지 않은 경우)
        Object.keys(branchRows).forEach(branch => {
            if (branch === defaultBranch || expandedBranches.has(branch)) return;

            const head = branchHeads[branch];
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
            // branchpoint는 master(defaultBranch)에 있으므로 복합 키로 조회
            const branchPointPos = branchPointCommit
                ? commitPositions[`${branchPointCommit.sha}-${defaultBranch}`]
                : null;

            edges.push({
                from: startNode.id,
                to: branchPointCommit ? `${branchPointCommit.sha}-${defaultBranch}` : 'master-line',
                fromX: startNode.x,
                fromY: startNode.y,
                toX: branchPointPos?.x ?? startNode.x,
                toY: branchPointPos?.y ?? baseY,
                color,
                crossBranch: true,
                isVertical: !branchPointPos || branchPointPos.x === startNode.x,
                hasBranchPoint: !!branchPointPos
            });
        });

        return { nodes, edges, branchRows, baseY };
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

    const { nodes, edges, branchRows, baseY } = renderGraphData();

    return (
        <div className="branch-view dark" onClick={handleBackgroundClick}>
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
                    <div className="toolbar-left">
                        <div className="search-box">
                            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="커밋 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')} title="검색 초기화">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="toolbar-right">
                        {expandedBranches.size > 0 && (
                            <span className="expanded-info">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                                {[...expandedBranches].join(', ')}
                            </span>
                        )}
                        <button
                            className="toolbar-icon-btn"
                            onClick={() => setExpandedBranches(new Set(selectedBranches))}
                            title="전부 확장"
                            disabled={expandedBranches.size === selectedBranches.length}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 3 21 3 21 9" />
                                <polyline points="9 21 3 21 3 15" />
                                <line x1="21" y1="3" x2="14" y2="10" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                        </button>
                        <button
                            className="toolbar-icon-btn"
                            onClick={() => setExpandedBranches(new Set())}
                            title="전부 축소"
                            disabled={expandedBranches.size === 0}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="4 14 10 14 10 20" />
                                <polyline points="20 10 14 10 14 4" />
                                <line x1="14" y1="10" x2="21" y2="3" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                        </button>
                        <select
                            value={depth}
                            onChange={(e) => setDepth(Number(e.target.value))}
                            className="depth-select"
                        >
                            <option value={30}>30 commits</option>
                            <option value={50}>50 commits</option>
                            <option value={100}>100 commits</option>
                            <option value={200}>200 commits</option>
                        </select>
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
                                    width={getGraphBounds().width}
                                    height={getGraphBounds().height}
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
                                        // 노드들의 날짜와 X 위치를 수집
                                        const datePositions = nodes
                                            .filter(n => n.commit.date)
                                            .map(n => ({
                                                date: new Date(n.commit.date),
                                                x: n.x,
                                                sha: n.id
                                            }))
                                            .sort((a, b) => a.x - b.x);

                                        if (datePositions.length === 0) return null;

                                        // 날짜별로 그룹화
                                        const getDateKeyLocal = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                                        const dateGroups = {};
                                        datePositions.forEach(dp => {
                                            const dateKey = getDateKeyLocal(dp.date);
                                            if (!dateGroups[dateKey]) {
                                                dateGroups[dateKey] = [];
                                            }
                                            dateGroups[dateKey].push(dp);
                                        });

                                        // 마커 생성
                                        const dateMarkers = [];
                                        const processedDates = new Set();

                                        datePositions.forEach(dp => {
                                            const dateKey = getDateKeyLocal(dp.date);
                                            const isExpanded = expandedDates.has(dateKey);
                                            const commitsOnDate = dateGroups[dateKey] || [];
                                            const hasMultiple = commitsOnDate.length > 1;

                                            if (isExpanded && hasMultiple) {
                                                // 펼쳐진 날짜: 각 커밋마다 시간 표시
                                                const timeStr = `${dp.date.getHours()}:${String(dp.date.getMinutes()).padStart(2, '0')}`;
                                                const isFirstTime = !processedDates.has(dateKey);
                                                dateMarkers.push({
                                                    dateStr: timeStr,
                                                    x: dp.x,
                                                    date: dp.date,
                                                    dateKey,
                                                    isTime: true,
                                                    hasMultiple,
                                                    isFirstTime
                                                });
                                                if (isFirstTime) processedDates.add(dateKey);
                                            } else if (!processedDates.has(dateKey)) {
                                                // 접힌 날짜: 날짜만 표시 (한 번만)
                                                const dateStr = `${dp.date.getMonth() + 1}/${dp.date.getDate()}`;
                                                dateMarkers.push({
                                                    dateStr,
                                                    x: dp.x,
                                                    date: dp.date,
                                                    dateKey,
                                                    isTime: false,
                                                    hasMultiple,
                                                    isExpanded: false
                                                });
                                                processedDates.add(dateKey);
                                            }
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
                                                {dateMarkers.map((marker, idx) => {
                                                    const isDateExpanded = expandedDates.has(marker.dateKey);

                                                    return (
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
                                                            {/* 날짜/시간 텍스트 */}
                                                            <text
                                                                x={marker.x}
                                                                y={timelineY - 10}
                                                                textAnchor="middle"
                                                                fill={marker.hasMultiple ? '#667eea' : '#64748b'}
                                                                fontSize={marker.isTime ? "9" : "10"}
                                                                fontWeight="500"
                                                                style={{ cursor: marker.hasMultiple ? 'pointer' : 'default' }}
                                                                onClick={(e) => {
                                                                    if (marker.hasMultiple) {
                                                                        e.stopPropagation();
                                                                        toggleDate(marker.dateKey);
                                                                    }
                                                                }}
                                                            >
                                                                {marker.hasMultiple && (!marker.isTime || marker.isFirstTime) && (
                                                                    isDateExpanded
                                                                        ? <tspan fontSize="12" dy="-4">⌄</tspan>
                                                                        : <tspan fontSize="12" dy="0">›</tspan>
                                                                )}
                                                                <tspan dx={marker.hasMultiple && (!marker.isTime || marker.isFirstTime) ? "3" : "0"} dy={marker.hasMultiple && isDateExpanded && (!marker.isTime || marker.isFirstTime) ? "4" : "0"}>
                                                                    {marker.dateStr}
                                                                </tspan>
                                                            </text>
                                                        </g>
                                                    );
                                                })}
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
                                                    />
                                                    {/* 분기점 커밋이 없으면 마커 표시 (있으면 노드로 표시됨) */}
                                                    {!edge.hasBranchPoint && (
                                                        <circle
                                                            cx={edge.toX}
                                                            cy={edge.toY}
                                                            r={6}
                                                            fill={edge.color}
                                                            stroke="white"
                                                            strokeWidth={2}
                                                        />
                                                    )}
                                                </g>
                                            );
                                        } else {
                                            // 다른 행: 계단식 (step) - feature에서 master의 분기점 커밋으로 연결
                                            // H(수평) 먼저 → V(수직) 나중에: 분기점 X 위치에서 master로 연결
                                            return (
                                                <g key={`edge-${index}`}>
                                                    <path
                                                        d={`M ${edge.fromX} ${edge.fromY}
                                                            H ${edge.toX}
                                                            V ${edge.toY}`}
                                                        stroke={edge.color}
                                                        strokeWidth={3}
                                                        fill="none"
                                                        strokeOpacity={0.7}
                                                    />
                                                    {/* 분기점 커밋이 없으면 마커 표시 */}
                                                    {!edge.hasBranchPoint && (
                                                        <circle
                                                            cx={edge.toX}
                                                            cy={edge.toY}
                                                            r={6}
                                                            fill={edge.color}
                                                            stroke="white"
                                                            strokeWidth={2}
                                                        />
                                                    )}
                                                </g>
                                            );
                                        }
                                    })}

                                    {/* 커밋 노드 */}
                                    {nodes.map(node => {
                                        const isSelected = selectedCommit?.id === node.id;
                                        const isHovered = hoveredCommit?.id === node.id;
                                        const initial = (node.commit.authorLogin || node.commit.authorName || '?')[0].toUpperCase();

                                        return (
                                            <g
                                                key={node.id}
                                                className={`commit-node ${isSelected ? 'selected' : ''}`}
                                                onClick={(e) => handleCommitClick(node, e)}
                                                onContextMenu={(e) => handleContextMenu(node, e)}
                                                onMouseEnter={() => setHoveredCommit(node)}
                                                onMouseLeave={() => setHoveredCommit(null)}
                                            >
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
                                                    fill={node.color}
                                                    stroke="white"
                                                    strokeWidth={3}
                                                    filter={`url(#glow-${Math.abs(node.row) % GRAPH_CONFIG.branchColors.length})`}
                                                    className="node-circle"
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
                                                >
                                                    {initial}
                                                </text>
                                            </g>
                                        );
                                    })}
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
                                        <div className="tooltip-sha">{hoveredCommit.commit.shortSha}</div>
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
                                        {contextMenuActions.map((action, i) => (
                                            action.type === 'divider' ? (
                                                <div key={i} className="context-menu-divider" />
                                            ) : (
                                                <button
                                                    key={i}
                                                    className="context-menu-item"
                                                    onClick={() => {
                                                        action.action(contextMenu.commit);
                                                        setContextMenu(null);
                                                    }}
                                                >
                                                    <span className="menu-icon">{action.icon}</span>
                                                    {action.label}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                )}

                                {/* 브랜치 컨텍스트 메뉴 */}
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
                                                setMergeDialog({ head: branchContextMenu.branch, base: defaultBranch });
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
                                                setMergeDialog({ head: branchContextMenu.branch, base: null });
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
                <div className="dialog-overlay" onClick={() => !dialogLoading && setMergeDialog(null)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>브랜치 머지</h3>
                            <button className="dialog-close" onClick={() => !dialogLoading && setMergeDialog(null)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="dialog-body">
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
                            <div className="dialog-field">
                                <label>커밋 메시지 (선택)</label>
                                <input
                                    type="text"
                                    id="merge-commit-message"
                                    placeholder={`Merge ${mergeDialog.head} into ${mergeDialog.base || defaultBranch}`}
                                />
                            </div>
                            {dialogError && <div className="dialog-error">{dialogError}</div>}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => setMergeDialog(null)} disabled={dialogLoading}>
                                취소
                            </button>
                            <button
                                className="dialog-btn primary"
                                onClick={() => {
                                    const base = mergeDialog.base || document.getElementById('merge-base-branch')?.value || defaultBranch;
                                    const commitMessage = document.getElementById('merge-commit-message').value;
                                    handleMergeBranch(base, commitMessage);
                                }}
                                disabled={dialogLoading}
                            >
                                {dialogLoading ? '머지 중...' : '머지'}
                            </button>
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
        </div>
    );
}

export default BranchView;
