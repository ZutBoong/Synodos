package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.SynodosColumnDao;
import com.example.demo.model.SynodosColumn;

@Service
public class SynodosColumnService {

	@Autowired
	private SynodosColumnDao dao;

	@Autowired
	private BoardNotificationService notificationService;

	public int insert(SynodosColumn column) {
		int result = dao.insert(column);
		if (result == 1) {
			// Fetch latest columns to get the created one with generated ID
			List<SynodosColumn> columns = dao.listByTeam(column.getTeamId());
			if (!columns.isEmpty()) {
				SynodosColumn created = columns.get(columns.size() - 1);
				notificationService.notifyColumnCreated(created);
			}
		}
		return result;
	}

	public List<SynodosColumn> list() {
		return dao.list();
	}

	public List<SynodosColumn> listByTeam(int teamId) {
		return dao.listByTeam(teamId);
	}

	public List<SynodosColumn> listByProject(int projectId) {
		return dao.listByProject(projectId);
	}

	public SynodosColumn content(int columnId) {
		return dao.content(columnId);
	}

	public int update(SynodosColumn column) {
		int result = dao.update(column);
		if (result == 1) {
			SynodosColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnUpdated(updated);
			}
		}
		return result;
	}

	public int delete(int columnId) {
		SynodosColumn column = dao.content(columnId);
		int result = dao.delete(columnId);
		if (result == 1 && column != null) {
			notificationService.notifyColumnDeleted(column.getTeamId(), columnId);
		}
		return result;
	}

	public int updatePosition(SynodosColumn column) {
		int result = dao.updatePosition(column);
		if (result == 1) {
			SynodosColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnMoved(updated);
			}
		}
		return result;
	}
}
