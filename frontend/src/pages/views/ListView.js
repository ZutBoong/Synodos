import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { taskwrite, taskupdate, taskdelete, taskposition, columnposition, tasklistByTeam, columnwrite, columnlistByTeam, columndelete } from '../../api/boardApi';
import TaskDetailView from '../../components/TaskDetailView';
import TaskCreateModal from '../../components/TaskCreateModal';
import { WORKFLOW_STATUSES } from '../../constants/workflowStatuses';
import ShaderBackground from '../../components/landing/shader-background';
import './ListView.css';


function ListView({
    team,
    tasks: propTasks,
    columns: propColumns,
    teamMembers,
    loginMember,
    filters,
    addTask,
    updateTask,
    removeTask,
    refreshData,
    selectedTaskId,
    onSelectTask,
    lastCommentEvent
}) {
    const [tasks, setTasks] = useState(propTasks || []);
    const [columns, setColumns] = useState(propColumns || []);
    const [expandedColumns, setExpandedColumns] = useState({});
    const [newTaskTitle, setNewTaskTitle] = useState({});
    const [addingColumnTask, setAddingColumnTask] = useState(null);
    const [createTaskModalColumnId, setCreateTaskModalColumnId] = useState(null);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [columnTitleError, setColumnTitleError] = useState('');
    const [columnMenuOpen, setColumnMenuOpen] = useState(null);

    // URL의 selectedTaskId로부터 실제 task 객체 찾기
    const selectedTask = selectedTaskId ? propTasks?.find(t => t.taskId === selectedTaskId) : null;

    // Task 선택/해제 핸들러
    const setSelectedTask = (task) => {
        onSelectTask?.(task?.taskId || null);
    };

    // props 동기화
    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    useEffect(() => {
        setColumns(propColumns || []);
        const expanded = {};
        (propColumns || []).forEach(c => {
            expanded[c.columnId] = true;
        });
        setExpandedColumns(expanded);
    }, [propColumns]);

    // 칼럼 토글
    const toggleColumn = (columnId) => {
        setExpandedColumns(prev => ({
            ...prev,
            [columnId]: !prev[columnId]
        }));
    };

    // 칼럼 추가
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
            const columnsArray = Array.isArray(columnsData) ? columnsData : [];
            setColumns(columnsArray);
            const newColumn = columnsArray.find(c => c.title === newColumnTitle.trim());
            if (newColumn) {
                setExpandedColumns(prev => ({ ...prev, [newColumn.columnId]: true }));
            }
            if (refreshData) refreshData();
        } catch (error) {
            console.error('컬럼 추가 실패:', error);
        }
    };

    // 컬럼 삭제
    const handleDeleteColumn = async (columnId) => {
        if (!window.confirm('이 컬럼과 모든 태스크를 삭제하시겠습니까?')) return;

        try {
            await columndelete(columnId);
            setColumns(prev => prev.filter(col => col.columnId !== columnId));
            setTasks(prev => prev.filter(task => task.columnId !== columnId));
            if (refreshData) refreshData();
        } catch (error) {
            console.error('컬럼 삭제 실패:', error);
        }
    };

    // 검색어 매칭 확인
    const isSearchMatch = (task) => {
        if (!filters?.searchQuery) return true;
        const query = filters.searchQuery.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchAssignee = task.assignees?.some(a =>
            a.memberName?.toLowerCase().includes(query)
        );
        return matchTitle || matchDesc || matchAssignee;
    };

    // 필터 적용
    const applyFilters = (taskList) => {
        if (!filters) return taskList;

        return taskList.filter(task => {
            if (filters.statuses?.length > 0) {
                if (!filters.statuses.includes(task.workflowStatus)) return false;
            }

            if (filters.assigneeNo) {
                const hasAssignee = task.assignees?.some(a => a.memberNo === filters.assigneeNo)
                    || task.assigneeNo === filters.assigneeNo;
                if (!hasAssignee) return false;
            }

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

    // 칼럼별 태스크 가져오기
    const getTasksByColumn = (columnId) => {
        const columnTasks = tasks.filter(t => t.columnId === columnId);
        const filteredTasks = applyFilters(columnTasks);

        return filteredTasks.sort((a, b) => {
            const aDone = a.workflowStatus === 'DONE' ? 1 : 0;
            const bDone = b.workflowStatus === 'DONE' ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;

            const aUrgent = a.priority === 'URGENT' ? 0 : 1;
            const bUrgent = b.priority === 'URGENT' ? 0 : 1;
            if (aUrgent !== bUrgent) return aUrgent - bUrgent;

            const aDate = a.dueDate ? new Date(a.dueDate) : null;
            const bDate = b.dueDate ? new Date(b.dueDate) : null;

            if (aDate && bDate) return aDate - bDate;
            if (aDate && !bDate) return -1;
            if (!aDate && bDate) return 1;
            return 0;
        });
    };

    // 태스크 추가
    const handleCreateTask = async (taskData) => {
        try {
            await taskwrite({
                columnId: taskData.columnId,
                title: taskData.title,
                description: taskData.description,
                workflowStatus: taskData.status,
                priority: taskData.priority,
                dueDate: taskData.dueDate,
                assigneeNo: taskData.assignees?.length > 0 ? taskData.assignees[0] : null
            });

            const tasksData = await tasklistByTeam(team.teamId);
            const tasksArray = Array.isArray(tasksData) ? tasksData : [];
            setTasks(tasksArray);

            const newTask = tasksArray.reduce((latest, task) => {
                if (task.columnId === taskData.columnId) {
                    if (!latest || task.taskId > latest.taskId) {
                        return task;
                    }
                }
                return latest;
            }, null);

            if (newTask) {
                if (taskData.assignees?.length > 0) {
                    const { updateTaskAssignees } = await import('../../api/boardApi');
                    await updateTaskAssignees(newTask.taskId, taskData.assignees, loginMember?.no);
                }

                if (taskData.verifiers?.length > 0) {
                    const { updateTaskVerifiers } = await import('../../api/boardApi');
                    await updateTaskVerifiers(newTask.taskId, taskData.verifiers, loginMember?.no);
                }

                const finalTasksData = await tasklistByTeam(team.teamId);
                setTasks(Array.isArray(finalTasksData) ? finalTasksData : []);
            }

            if (refreshData) refreshData();
        } catch (error) {
            console.error('태스크 추가 실패:', error);
            alert('태스크 생성에 실패했습니다.');
        }
    };

    const isTaskDone = (task) => {
        return task.workflowStatus === 'DONE';
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('이 태스크를 삭제하시겠습니까?')) return;

        try {
            await taskdelete(taskId);
            setTasks(prev => prev.filter(t => t.taskId !== taskId));
            if (removeTask) removeTask(taskId);
        } catch (error) {
            console.error('태스크 삭제 실패:', error);
        }
    };

    // 드래그 앤 드롭 핸들러
    const onDragEnd = async (result) => {
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

            const newTasks = [...tasks];
            const taskIndex = newTasks.findIndex(t => t.taskId === taskId);
            const [movedTask] = newTasks.splice(taskIndex, 1);

            movedTask.columnId = destColumnId;

            const destColumnTasks = newTasks.filter(t => t.columnId === destColumnId);
            destColumnTasks.splice(destination.index, 0, movedTask);

            destColumnTasks.forEach((t, idx) => {
                t.position = idx + 1;
            });

            const otherTasks = newTasks.filter(t => t.columnId !== destColumnId);
            setTasks([...otherTasks, ...destColumnTasks]);

            try {
                for (const t of destColumnTasks) {
                    await taskposition({ taskId: t.taskId, columnId: t.columnId, position: t.position });
                }
            } catch (error) {
                console.error('태스크 위치 저장 실패:', error);
                if (refreshData) refreshData();
            }
        }
    };

    // 담당자 아바타 렌더링
    const renderAssigneeAvatars = (task) => {
        let assignees = [];

        if (task.assignees?.length > 0) {
            assignees = task.assignees;
        } else if (task.assigneeNo) {
            const member = teamMembers.find(m => m.memberNo === task.assigneeNo);
            if (member) {
                assignees = [{ memberNo: member.memberNo, memberName: member.memberName, profileImage: member.profileImage }];
            }
        }

        if (assignees.length === 0) {
            return <span className="no-assignee">-</span>;
        }

        const maxDisplay = 3;
        const displayAssignees = assignees.slice(0, maxDisplay);
        const remaining = assignees.length - maxDisplay;

        return (
            <div className="assignee-avatars">
                {displayAssignees.map((assignee, index) => (
                    <div
                        key={assignee.memberNo}
                        className="assignee-avatar"
                        title={assignee.memberName}
                        style={{ zIndex: displayAssignees.length - index }}
                    >
                        {assignee.profileImage ? (
                            <img src={assignee.profileImage} alt={assignee.memberName} />
                        ) : (
                            <span className="avatar-initial">
                                {assignee.memberName?.charAt(0) || '?'}
                            </span>
                        )}
                    </div>
                ))}
                {remaining > 0 && (
                    <div className="assignee-avatar more" title={`외 ${remaining}명`}>
                        +{remaining}
                    </div>
                )}
            </div>
        );
    };

    const formatDueDate = (dueDate) => {
        if (!dueDate) return '-';
        const date = new Date(dueDate);
        const today = new Date();
        const isOverdue = date < today && date.toDateString() !== today.toDateString();

        return (
            <span className={isOverdue ? 'overdue' : ''}>
                {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
        );
    };

    // 칼럼 렌더링 - table 구조 사용
    const renderColumn = (column, index) => {
        const columnTasks = getTasksByColumn(column.columnId);
        const isExpanded = expandedColumns[column.columnId];

        return (
            <Draggable
                key={`column-${column.columnId}`}
                draggableId={`column-${column.columnId}`}
                index={index}
            >
                {(provided, snapshot) => (
                    <div
                        className={`list-column ${snapshot.isDragging ? 'dragging' : ''}`}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                    >
                        <div className="column-header">
                            <span className="column-drag-handle" {...provided.dragHandleProps}>⋮⋮</span>
                            <span
                                className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleColumn(column.columnId)}
                            >
                                ▶
                            </span>
                            <span className="column-name" onClick={() => toggleColumn(column.columnId)}>{column.title}</span>
                            <span className="task-count">{columnTasks.length}</span>

                            <div className="column-menu-wrapper">
                                <button
                                    className="column-menu-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setColumnMenuOpen(columnMenuOpen === column.columnId ? null : column.columnId);
                                    }}
                                >
                                    ⋯
                                </button>
                                {columnMenuOpen === column.columnId && (
                                    <div className="column-menu-dropdown">
                                        <button
                                            className="column-menu-item danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteColumn(column.columnId);
                                                setColumnMenuOpen(null);
                                            }}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                            컬럼 삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="column-content">
                                {/* 헤더 (드래그 영역 밖) */}
                                <div className="task-list-header">
                                    <div className="col-drag"></div>
                                    <div className="col-check"></div>
                                    <div className="col-title">제목</div>
                                    <div className="col-assignee">담당자</div>
                                    <div className="col-due">마감일</div>
                                    <div className="col-status">상태</div>
                                    <div className="col-priority">긴급</div>
                                </div>

                                {/* 태스크 목록 (Droppable) */}
                                <Droppable droppableId={`column-${column.columnId}`} type="task">
                                    {(taskProvided, taskSnapshot) => (
                                        <div
                                            ref={taskProvided.innerRef}
                                            {...taskProvided.droppableProps}
                                            className={`task-list-body ${taskSnapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                        >
                                            {columnTasks.map((task, taskIndex) => {
                                                const matchesSearch = isSearchMatch(task);
                                                const hasSearchQuery = !!filters?.searchQuery;
                                                return (
                                                    <Draggable
                                                        key={`task-${task.taskId}`}
                                                        draggableId={`task-${task.taskId}`}
                                                        index={taskIndex}
                                                    >
                                                        {(taskDragProvided, taskDragSnapshot) => (
                                                            <div
                                                                ref={taskDragProvided.innerRef}
                                                                {...taskDragProvided.draggableProps}
                                                                className={`task-item ${isTaskDone(task) ? 'completed' : ''} ${taskDragSnapshot.isDragging ? 'dragging' : ''} ${hasSearchQuery ? (matchesSearch ? 'search-match' : 'search-dim') : ''}`}
                                                            >
                                                                <div className="col-drag" {...taskDragProvided.dragHandleProps}>
                                                                    <span className="drag-handle">⋮⋮</span>
                                                                </div>
                                                                <div className="col-check">
                                                                    <span className={`status-indicator ${isTaskDone(task) ? 'done' : ''}`}>
                                                                        {isTaskDone(task) ? '✓' : '○'}
                                                                    </span>
                                                                </div>
                                                                <div className="col-title">
                                                                    <span
                                                                        className="task-title-link"
                                                                        onClick={() => setSelectedTask(task)}
                                                                    >
                                                                        {task.title}
                                                                    </span>
                                                                </div>
                                                                <div className="col-assignee">{renderAssigneeAvatars(task)}</div>
                                                                <div className="col-due">{formatDueDate(task.dueDate)}</div>
                                                                <div className="col-status">
                                                                    <span
                                                                        className="status-badge"
                                                                        style={{ backgroundColor: WORKFLOW_STATUSES[task.workflowStatus]?.color || '#94a3b8' }}
                                                                    >
                                                                        {WORKFLOW_STATUSES[task.workflowStatus]?.label || '대기'}
                                                                    </span>
                                                                </div>
                                                                <div className="col-priority">
                                                                    {task.priority === 'URGENT' && (
                                                                        <span className="urgent-badge">
                                                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {taskProvided.placeholder}
                                        </div>
                                    )}
                                </Droppable>

                                <button
                                    className="add-task-btn"
                                    onClick={() => setCreateTaskModalColumnId(column.columnId)}
                                >
                                    + 새 태스크 추가
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Draggable>
        );
    };

    return (
        <ShaderBackground>
            <DragDropContext onDragEnd={onDragEnd}>
                <div
                    className={`list-view ${selectedTask ? 'task-detail-open' : ''}`}
                    onClick={() => columnMenuOpen && setColumnMenuOpen(null)}
                >
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
                ) : (
                    <>
                        {columns.length === 0 ? (
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
                            <>
                                <Droppable droppableId="columns" type="column">
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`columns-droppable ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                        >
                                            {columns.map((column, index) => renderColumn(column, index))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>

                                <div className="add-column-section">
                                    <div className="column-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="새 칼럼 이름"
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
                            </>
                        )}
                    </>
                )}

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
            </DragDropContext>
        </ShaderBackground>
    );
}

export default ListView;
