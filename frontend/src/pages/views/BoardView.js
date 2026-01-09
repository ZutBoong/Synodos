import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    columnwrite, columnupdate, columndelete, columnposition,
    taskwrite, taskdelete, taskposition,
    tasklistByTeam, columnlistByTeam
} from '../../api/boardApi';
import { addTaskFavorite, removeTaskFavorite, checkTaskFavorite, getTaskFavorites, archiveTask, unarchiveTask, getTaskArchives } from '../../api/boardApi';
import TaskDetailView from '../../components/TaskDetailView';
import TaskCreateModal from '../../components/TaskCreateModal';
import { WORKFLOW_STATUSES } from '../../constants/workflowStatuses';
import ShaderBackground from '../../components/landing/shader-background';
import './BoardView.css';


function BoardView({
    team,
    columns: propColumns,
    tasks: propTasks,
    teamMembers,
    loginMember,
    filters,
    updateTask,
    addTask,
    removeTask,
    updateColumn,
    addColumn,
    removeColumn,
    refreshData,
    selectedTaskId,
    onSelectTask,
    lastCommentEvent
}) {
    // 로컬 상태 (드래그 등 즉각적인 UI 반응용)
    const [columns, setColumns] = useState(propColumns || []);
    const [tasks, setTasks] = useState(propTasks || []);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [columnTitleError, setColumnTitleError] = useState(''); // 칼럼 이름 에러 메시지
    const [newTaskTitle, setNewTaskTitle] = useState({});
    const [editingColumn, setEditingColumn] = useState(null);

    // URL의 selectedTaskId로부터 실제 task 객체 찾기
    const selectedTask = selectedTaskId ? propTasks?.find(t => t.taskId === selectedTaskId) : null;

    // Task 선택/해제 핸들러
    const setSelectedTask = (task) => {
        onSelectTask?.(task?.taskId || null);
    };

    // 컬럼 기능 관련 상태
    const [columnMenuOpen, setColumnMenuOpen] = useState(null);
    const [editingColumnPrefix, setEditingColumnPrefix] = useState(null); // GitHub 명령어 편집 중인 컬럼

    // 태스크 즐겨찾기 관련 상태
    const [taskFavorites, setTaskFavorites] = useState({});  // { taskId: boolean }
    const [taskArchives, setTaskArchives] = useState({});  // { taskId: boolean }
    const [createTaskModalColumnId, setCreateTaskModalColumnId] = useState(null);

    // 스크롤 관련
    const columnsContainerRef = useRef(null);

    // 드래그 스크롤 관련
    const [isDragging, setIsDragging] = useState(false);
    const [isDndActive, setIsDndActive] = useState(false); // DnD 라이브러리 활성 상태
    const dragStartX = useRef(0);
    const dragScrollLeft = useRef(0);

    // props 변경 시 컬럼만 동기화 (태스크는 로컬에서 관리)
    useEffect(() => {
        setColumns(propColumns || []);
    }, [propColumns]);

    // 주의: propTasks useEffect 제거 - DnD 상태 유지를 위해

    // 태스크 즐겨찾기/아카이브 로드
    useEffect(() => {
        if (loginMember) {
            loadTaskFavorites();
            loadTaskArchives();
        }
    }, [loginMember]);

    const loadTaskFavorites = async () => {
        if (!loginMember) return;

        try {
            const favorites = await getTaskFavorites(loginMember.no);
            const favoritesMap = {};
            favorites.forEach(task => {
                favoritesMap[task.taskId] = true;
            });
            setTaskFavorites(favoritesMap);
        } catch (error) {
            console.error('즐겨찾기 로드 실패:', error);
        }
    };

    const loadTaskArchives = async () => {
        if (!loginMember) return;

        try {
            const archives = await getTaskArchives(loginMember.no);
            const archivesMap = {};
            archives.forEach(archive => {
                archivesMap[archive.originalTaskId] = true;
            });
            setTaskArchives(archivesMap);
        } catch (error) {
            console.error('아카이브 로드 실패:', error);
        }
    };

    // 드래그 시작
    const handleMouseDown = (e) => {
        const container = columnsContainerRef.current;
        if (!container) return;

        // DnD 라이브러리가 활성화된 경우 수평 스크롤 드래그 비활성화
        if (isDndActive) return;

        // 태스크 카드나 버튼 등을 클릭한 경우는 드래그 하지 않음
        if (e.target.closest('.task-card') ||
            e.target.closest('.tasks-container') ||
            e.target.closest('.add-task-btn') ||
            e.target.closest('.add-column') ||
            e.target.closest('button') ||
            e.target.closest('input')) {
            return;
        }

        setIsDragging(true);
        dragStartX.current = e.pageX - container.offsetLeft;
        dragScrollLeft.current = container.scrollLeft;
        container.style.cursor = 'grabbing';
        container.style.userSelect = 'none';
    };

    // 드래그 중
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const container = columnsContainerRef.current;
        if (!container) return;

        const x = e.pageX - container.offsetLeft;
        const walk = (x - dragStartX.current) * 1.5; // 스크롤 속도 조절
        container.scrollLeft = dragScrollLeft.current - walk;
    };

    // 드래그 종료
    const handleMouseUpOrLeave = () => {
        if (!isDragging) return;
        setIsDragging(false);
        const container = columnsContainerRef.current;
        if (container) {
            container.style.cursor = 'grab';
            container.style.userSelect = 'auto';
        }
    };

    // 태스크 즐겨찾기 토글
    const handleToggleTaskFavorite = async (taskId, e) => {
        e.stopPropagation();
        if (!loginMember) return;

        try {
            const isFavorited = taskFavorites[taskId];
            if (isFavorited) {
                await removeTaskFavorite(taskId, loginMember.no);
            } else {
                await addTaskFavorite(taskId, loginMember.no);
            }

            setTaskFavorites(prev => ({
                ...prev,
                [taskId]: !isFavorited
            }));
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
        }
    };

    // 검색어 매칭 확인 (강조 표시용)
    const isSearchMatch = (task) => {
        if (!filters.searchQuery) return true; // 검색어 없으면 모두 매칭
        const query = filters.searchQuery.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchAssignee = task.assignees?.some(a =>
            a.memberName?.toLowerCase().includes(query)
        );
        return matchTitle || matchDesc || matchAssignee;
    };

    // 필터 적용 (검색어는 강조만, 필터링은 다른 조건만)
    const applyFilters = (taskList) => {
        return taskList.filter(task => {
            // 상태 필터
            if (filters.statuses?.length > 0) {
                if (!filters.statuses.includes(task.workflowStatus)) return false;
            }

            // 담당자 필터
            if (filters.assigneeNo) {
                const hasAssignee = task.assignees?.some(a => a.memberNo === filters.assigneeNo)
                    || task.assigneeNo === filters.assigneeNo;
                if (!hasAssignee) return false;
            }

            // 마감일 필터
            if (filters.dueDateFilter) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const taskDue = task.dueDate ? new Date(task.dueDate) : null;

                switch (filters.dueDateFilter) {
                    case 'overdue':
                        if (!taskDue || taskDue >= today) return false;
                        break;
                    case 'today':
                        if (!taskDue) return false;
                        const todayEnd = new Date(today);
                        todayEnd.setDate(todayEnd.getDate() + 1);
                        if (taskDue < today || taskDue >= todayEnd) return false;
                        break;
                    case 'week':
                        if (!taskDue) return false;
                        const weekEnd = new Date(today);
                        weekEnd.setDate(weekEnd.getDate() + 7);
                        if (taskDue < today || taskDue > weekEnd) return false;
                        break;
                    case 'nodate':
                        if (taskDue) return false;
                        break;
                    default:
                        break;
                }
            }

            return true;
        });
    };

    const getTasksByColumn = (columnId) => {
        const columnTasks = tasks.filter(task => task.columnId === columnId);
        const filteredTasks = applyFilters(columnTasks);

        // 정렬: position 기준 (드래그 앤 드롭 순서 유지)
        // Done 상태는 맨 아래, 그 외에는 position 순서
        return filteredTasks.sort((a, b) => {
            // Done 상태는 맨 아래
            const aDone = a.workflowStatus === 'DONE' ? 1 : 0;
            const bDone = b.workflowStatus === 'DONE' ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;

            // position 기준 정렬 (드래그 순서 유지)
            const aPos = a.position || 999;
            const bPos = b.position || 999;
            return aPos - bPos;
        });
    };

    // DnD 시작
    const onDragStart = () => {
        setIsDndActive(true);
        setIsDragging(false); // 수평 스크롤 드래그 중지
    };

    // 드래그 앤 드롭
    const onDragEnd = async (result) => {
        setIsDndActive(false); // DnD 종료
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'column') {
            const newColumns = Array.from(columns);
            const [removed] = newColumns.splice(source.index, 1);
            newColumns.splice(destination.index, 0, removed);

            const updatedColumns = newColumns.map((col, idx) => ({
                ...col,
                position: idx + 1
            }));

            setColumns(updatedColumns);

            try {
                for (const col of updatedColumns) {
                    await columnposition({ columnId: col.columnId, position: col.position });
                }
            } catch (error) {
                console.error('컬럼 위치 저장 실패:', error);
                if (refreshData) refreshData();
            }
            return;
        }

        if (type === 'task') {
            const taskId = parseInt(draggableId.replace('task-', ''));
            const destColumnId = parseInt(destination.droppableId.replace('column-', ''));

            // 로컬 상태 업데이트
            const newTasks = tasks.map(t => ({ ...t }));
            const taskIndex = newTasks.findIndex(t => t.taskId === taskId);
            if (taskIndex === -1) return;

            newTasks[taskIndex].columnId = destColumnId;
            newTasks[taskIndex].position = destination.index + 1;
            setTasks(newTasks);

            // API 호출
            try {
                await taskposition({
                    taskId: taskId,
                    columnId: destColumnId,
                    position: destination.index + 1
                });
            } catch (error) {
                console.error('태스크 위치 저장 실패:', error);
                if (refreshData) refreshData();
            }
        }
    };

    // 컬럼 추가
    const handleAddColumn = async () => {
        if (!newColumnTitle.trim()) {
            setColumnTitleError('칼럼 이름을 입력해주세요');
            return;
        }
        if (!team) return;

        setColumnTitleError('');
        try {
            await columnwrite({
                title: newColumnTitle,
                teamId: team.teamId
            });
            setNewColumnTitle('');
            const columnsData = await columnlistByTeam(team.teamId);
            setColumns(Array.isArray(columnsData) ? columnsData : []);
        } catch (error) {
            console.error('컬럼 추가 실패:', error);
        }
    };

    // 컬럼 수정
    const handleUpdateColumn = async (columnId, newTitle) => {
        try {
            await columnupdate({ columnId, title: newTitle });
            setColumns(prev => prev.map(col =>
                col.columnId === columnId ? { ...col, title: newTitle } : col
            ));
            setEditingColumn(null);
        } catch (error) {
            console.error('컬럼 수정 실패:', error);
        }
    };

    // GitHub 명령어 수정
    const handleUpdateColumnPrefix = async (columnId, newPrefix) => {
        try {
            const column = columns.find(col => col.columnId === columnId);
            await columnupdate({ columnId, title: column.title, githubPrefix: newPrefix });
            setColumns(prev => prev.map(col =>
                col.columnId === columnId ? { ...col, githubPrefix: newPrefix } : col
            ));
            setEditingColumnPrefix(null);
            setColumnMenuOpen(null);
        } catch (error) {
            console.error('GitHub 명령어 수정 실패:', error);
        }
    };

    // 컬럼 삭제
    const handleDeleteColumn = async (columnId) => {
        if (!window.confirm('이 컬럼과 모든 태스크를 삭제하시겠습니까?')) return;

        try {
            await columndelete(columnId);
            setColumns(prev => prev.filter(col => col.columnId !== columnId));
            setTasks(prev => prev.filter(task => task.columnId !== columnId));
        } catch (error) {
            console.error('컬럼 삭제 실패:', error);
        }
    };

    // 태스크 추가 (모달에서)
    const handleCreateTask = async (taskData) => {
        try {
            // 기본 태스크 생성
            await taskwrite({
                columnId: taskData.columnId,
                title: taskData.title,
                description: taskData.description,
                workflowStatus: taskData.status,
                priority: taskData.priority,
                dueDate: taskData.dueDate,
                assigneeNo: taskData.assignees?.length > 0 ? taskData.assignees[0] : null
            });

            // 태스크 목록 새로 가져오기
            const tasksData = await tasklistByTeam(team.teamId);
            setTasks(Array.isArray(tasksData) ? tasksData : []);

            // 생성된 태스크 찾기
            const newTask = tasksData.reduce((latest, task) => {
                if (task.columnId === taskData.columnId) {
                    if (!latest || task.taskId > latest.taskId) {
                        return task;
                    }
                }
                return latest;
            }, null);

            if (newTask) {
                // 담당자 저장 (복수)
                if (taskData.assignees?.length > 0) {
                    const { updateTaskAssignees } = await import('../../api/boardApi');
                    await updateTaskAssignees(newTask.taskId, taskData.assignees, loginMember?.no);
                }

                // 검증자 저장 (복수)
                if (taskData.verifiers?.length > 0) {
                    const { updateTaskVerifiers } = await import('../../api/boardApi');
                    await updateTaskVerifiers(newTask.taskId, taskData.verifiers, loginMember?.no);
                }

                // 최종 업데이트된 태스크 목록 가져오기
                const finalTasksData = await tasklistByTeam(team.teamId);
                setTasks(Array.isArray(finalTasksData) ? finalTasksData : []);
            }
        } catch (error) {
            console.error('태스크 추가 실패:', error);
            alert('태스크 생성에 실패했습니다.');
        }
    };

    // 태스크 아카이브 토글
    const handleArchiveTask = async (taskId, e) => {
        e.stopPropagation();
        if (!loginMember) return;

        try {
            if (taskArchives[taskId]) {
                // 아카이브 해제
                await unarchiveTask(taskId, loginMember.no);
                setTaskArchives(prev => ({
                    ...prev,
                    [taskId]: false
                }));
            } else {
                // 아카이브 설정
                await archiveTask(taskId, loginMember.no, '');
                setTaskArchives(prev => ({
                    ...prev,
                    [taskId]: true
                }));
            }
        } catch (error) {
            console.error('태스크 아카이브 토글 실패:', error);
        }
    };

    // 태스크 클릭 시 모달 열기
    const handleTaskClick = (task) => {
        setSelectedTask(task);
    };

    return (
        <ShaderBackground>
            <div className={`board-view ${selectedTask ? 'task-detail-open' : ''}`}>
            {/* 태스크 상세 패널 (전체화면) */}
            {selectedTask ? (
                <TaskDetailView
                    task={selectedTask}
                    teamId={team?.teamId}
                    loginMember={loginMember}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        if (refreshData) refreshData();
                    }}
                    lastCommentEvent={lastCommentEvent}
                />
            ) : columns.length === 0 ? (
                /* 칼럼이 없을 경우 - 빈 상태 UI */
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                    </div>
                    <h3>아직 칼럼이 없습니다</h3>
                    <p>새 칼럼을 추가하여 작업을 시작하세요</p>
                    <div className="add-column-inline">
                        <div className="column-input-wrapper">
                            <input
                                type="text"
                                placeholder="새 칼럼 이름 입력"
                                value={newColumnTitle}
                                onChange={(e) => {
                                    setNewColumnTitle(e.target.value);
                                    if (columnTitleError) setColumnTitleError('');
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddColumn();
                                    }
                                }}
                                className={columnTitleError ? 'error' : ''}
                            />
                            {columnTitleError && <span className="column-input-error">{columnTitleError}</span>}
                        </div>
                        <button onClick={handleAddColumn}>+ 칼럼 추가</button>
                    </div>
                </div>
            ) : (
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="columns-wrapper">
                    <Droppable droppableId="board" direction="horizontal" type="column">
                        {(provided) => (
                            <div
                                className="columns-container"
                                ref={(node) => {
                                    provided.innerRef(node);
                                    columnsContainerRef.current = node;
                                }}
                                {...provided.droppableProps}
                            >
                                {columns.map((column, index) => (
                                    <Draggable
                                        key={`column-${column.columnId}`}
                                        draggableId={`column-${column.columnId}`}
                                        index={index}
                                    >
                                        {(provided) => (
                                            <div
                                                className="column"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                            >
                                                <div className="column-header" {...provided.dragHandleProps}>
                                                    {editingColumn === column.columnId ? (
                                                        <input
                                                            type="text"
                                                            defaultValue={column.title}
                                                            onBlur={(e) => handleUpdateColumn(column.columnId, e.target.value)}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateColumn(column.columnId, e.target.value);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <div className="column-title-row">
                                                                <h3 onClick={() => setEditingColumn(column.columnId)}>
                                                                    {column.title}
                                                                </h3>
                                                                <div className="column-menu-wrapper">
                                                                    <button
                                                                        className="column-menu-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setColumnMenuOpen(columnMenuOpen === column.columnId ? null : column.columnId);
                                                                        }}
                                                                    >
                                                                        ⋮
                                                                    </button>
                                                                    {columnMenuOpen === column.columnId && (
                                                                        <div className="column-menu-dropdown">
                                                                            <div className="menu-item github-prefix-item">
                                                                                <label>GitHub 명령어</label>
                                                                                {editingColumnPrefix === column.columnId ? (
                                                                                    <input
                                                                                        type="text"
                                                                                        defaultValue={column.githubPrefix || `[${column.title}]`}
                                                                                        placeholder={`[${column.title}]`}
                                                                                        onBlur={(e) => handleUpdateColumnPrefix(column.columnId, e.target.value)}
                                                                                        onKeyPress={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                handleUpdateColumnPrefix(column.columnId, e.target.value);
                                                                                            }
                                                                                        }}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        autoFocus
                                                                                    />
                                                                                ) : (
                                                                                    <span
                                                                                        className="prefix-value"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setEditingColumnPrefix(column.columnId);
                                                                                        }}
                                                                                    >
                                                                                        {column.githubPrefix || `[${column.title}]`}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                className="menu-delete-btn"
                                                                                onClick={() => {
                                                                                    handleDeleteColumn(column.columnId);
                                                                                    setColumnMenuOpen(null);
                                                                                }}
                                                                            >
                                                                                삭제
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <Droppable droppableId={`column-${column.columnId}`} type="task">
                                                    {(provided, snapshot) => (
                                                        <div
                                                            className={`tasks-container ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                        >
                                                            {getTasksByColumn(column.columnId).map((task, taskIndex) => (
                                                                <Draggable
                                                                    key={`task-${task.taskId}`}
                                                                    draggableId={`task-${task.taskId}`}
                                                                    index={taskIndex}
                                                                >
                                                                    {(provided, snapshot) => {
                                                                        const matchesSearch = isSearchMatch(task);
                                                                        const hasSearchQuery = !!filters.searchQuery;
                                                                        return (
                                                                        <div
                                                                            className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${task.workflowStatus === 'DONE' ? 'done' : ''} status-${task.workflowStatus?.toLowerCase().replace('_', '-') || 'waiting'} ${hasSearchQuery ? (matchesSearch ? 'search-match' : 'search-dim') : ''}`}
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            data-task-id={task.taskId}
                                                                            onClick={() => handleTaskClick(task)}
                                                                        >
                                                                            <div className="task-card-actions">
                                                                                <button
                                                                                    className={`task-favorite-btn ${taskFavorites[task.taskId] ? 'active' : ''}`}
                                                                                    onClick={(e) => handleToggleTaskFavorite(task.taskId, e)}
                                                                                    title={taskFavorites[task.taskId] ? '즐겨찾기 해제' : '즐겨찾기'}
                                                                                >
                                                                                    <i className={taskFavorites[task.taskId] ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                                                                                </button>
                                                                                <button
                                                                                    className={`archive-btn ${taskArchives[task.taskId] ? 'active' : ''}`}
                                                                                    onClick={(e) => handleArchiveTask(task.taskId, e)}
                                                                                    title={taskArchives[task.taskId] ? '아카이브 해제' : '아카이브'}
                                                                                >
                                                                                    <i className={taskArchives[task.taskId] ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>
                                                                                </button>
                                                                            </div>
                                                                            {task.workflowStatus && WORKFLOW_STATUSES[task.workflowStatus] && (
                                                                                <div className="task-card-workflow">
                                                                                    <span
                                                                                        className={`workflow-status-badge status-${task.workflowStatus?.toLowerCase().replace('_', '-')}`}
                                                                                    >
                                                                                        {WORKFLOW_STATUSES[task.workflowStatus].label}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="task-card-title">
                                                                                <span className="task-id">#{task.taskId}</span>
                                                                                {task.title}
                                                                            </div>
                                                                            <div className="task-card-meta">
                                                                                {task.dueDate && (
                                                                                    <span className={`due-date ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                                                                        {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                                                    </span>
                                                                                )}
                                                                                {task.priority === 'URGENT' && (
                                                                                    <span className="urgent-badge">
                                                                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>

                                                <div className="add-task">
                                                    <button
                                                        className="add-task-btn"
                                                        onClick={() => setCreateTaskModalColumnId(column.columnId)}
                                                    >
                                                        + 새 태스크 추가
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                <div className="add-column">
                                    <div className="column-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="새 칼럼 추가..."
                                            value={newColumnTitle}
                                            onChange={(e) => {
                                                setNewColumnTitle(e.target.value);
                                                if (columnTitleError) setColumnTitleError('');
                                            }}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddColumn();
                                                }
                                            }}
                                            className={columnTitleError ? 'error' : ''}
                                        />
                                        {columnTitleError && <span className="column-input-error">{columnTitleError}</span>}
                                    </div>
                                    <button onClick={handleAddColumn}>+ 칼럼 추가</button>
                                </div>
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>
            )}

            {/* 태스크 생성 모달 */}
            {createTaskModalColumnId && (
                <TaskCreateModal
                    columnId={createTaskModalColumnId}
                    teamId={team?.teamId}
                    teamMembers={teamMembers}
                    onClose={() => setCreateTaskModalColumnId(null)}
                    onCreate={handleCreateTask}
                />
            )}
            </div>
        </ShaderBackground>
    );
}

export default BoardView;
