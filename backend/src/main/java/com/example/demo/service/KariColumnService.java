package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.KariColumnDao;
import com.example.demo.model.KariColumn;

@Service
public class KariColumnService {

	@Autowired
	private KariColumnDao dao;

	@Autowired
	private BoardNotificationService notificationService;

	public int insert(KariColumn column) {
		int result = dao.insert(column);
		if (result == 1) {
			// Fetch latest columns to get the created one with generated ID
			List<KariColumn> columns = dao.listByTeam(column.getTeamId());
			if (!columns.isEmpty()) {
				KariColumn created = columns.get(columns.size() - 1);
				notificationService.notifyColumnCreated(created);
			}
		}
		return result;
	}

	public List<KariColumn> list() {
		return dao.list();
	}

	public List<KariColumn> listByTeam(int teamId) {
		return dao.listByTeam(teamId);
	}

	public List<KariColumn> listByProject(int projectId) {
		return dao.listByProject(projectId);
	}

	public KariColumn content(int columnId) {
		return dao.content(columnId);
	}

	public int update(KariColumn column) {
		int result = dao.update(column);
		if (result == 1) {
			KariColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnUpdated(updated);
			}
		}
		return result;
	}

	public int delete(int columnId) {
		KariColumn column = dao.content(columnId);
		int result = dao.delete(columnId);
		if (result == 1 && column != null) {
			notificationService.notifyColumnDeleted(column.getTeamId(), columnId);
		}
		return result;
	}

	public int updatePosition(KariColumn column) {
		int result = dao.updatePosition(column);
		if (result == 1) {
			KariColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnMoved(updated);
			}
		}
		return result;
	}
}
