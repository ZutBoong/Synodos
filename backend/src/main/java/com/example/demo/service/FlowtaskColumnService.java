package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.dao.ColumnAssigneeDao;
import com.example.demo.model.FlowtaskColumn;
import com.example.demo.model.ColumnAssignee;

@Service
public class FlowtaskColumnService {

	@Autowired
	private FlowtaskColumnDao dao;

	@Autowired
	private ColumnAssigneeDao assigneeDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	public int insert(FlowtaskColumn column) {
		int result = dao.insert(column);
		if (result == 1) {
			// Fetch latest columns to get the created one with generated ID
			List<FlowtaskColumn> columns = dao.listByTeam(column.getTeamId());
			if (!columns.isEmpty()) {
				FlowtaskColumn created = columns.get(columns.size() - 1);
				notificationService.notifyColumnCreated(created);
			}
		}
		return result;
	}

	public List<FlowtaskColumn> list() {
		return dao.list();
	}

	public List<FlowtaskColumn> listByTeam(int teamId) {
		return dao.listByTeam(teamId);
	}

	public List<FlowtaskColumn> listByProject(int projectId) {
		return dao.listByProject(projectId);
	}

	public FlowtaskColumn content(int columnId) {
		return dao.content(columnId);
	}

	public int update(FlowtaskColumn column) {
		int result = dao.update(column);
		if (result == 1) {
			FlowtaskColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnUpdated(updated);
			}
		}
		return result;
	}

	// 컬럼 업데이트 + 담당자들에게 알림 발송
	public int updateWithNotification(FlowtaskColumn column, int senderNo, String changeDescription) {
		int result = dao.update(column);
		if (result == 1) {
			FlowtaskColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				// WebSocket 알림
				notificationService.notifyColumnUpdated(updated);

				// 모든 담당자에게 영구 알림 발송 (본인 제외)
				List<ColumnAssignee> assignees = assigneeDao.listByColumn(column.getColumnId());
				for (ColumnAssignee assignee : assignees) {
					if (assignee.getMemberNo() != senderNo) {
						persistentNotificationService.notifyColumnUpdated(
							assignee.getMemberNo(),
							senderNo,
							updated.getColumnId(),
							updated.getTitle(),
							changeDescription
						);
					}
				}
			}
		}
		return result;
	}

	public int delete(int columnId) {
		FlowtaskColumn column = dao.content(columnId);
		int result = dao.delete(columnId);
		if (result == 1 && column != null) {
			notificationService.notifyColumnDeleted(column.getTeamId(), columnId);
		}
		return result;
	}

	public int updatePosition(FlowtaskColumn column) {
		int result = dao.updatePosition(column);
		if (result == 1) {
			FlowtaskColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnMoved(updated);
			}
		}
		return result;
	}
}
