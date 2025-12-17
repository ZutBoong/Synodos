package com.example.demo.service;

import java.util.List;
import java.util.Set;
import java.util.HashSet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.ColumnAssigneeDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.model.ColumnAssignee;
import com.example.demo.model.FlowtaskColumn;

@Service
public class ColumnAssigneeService {

    @Autowired
    private ColumnAssigneeDao dao;

    @Autowired
    private FlowtaskColumnDao columnDao;

    @Autowired
    private NotificationService notificationService;

    public int addAssignee(int columnId, int memberNo) {
        ColumnAssignee assignee = new ColumnAssignee();
        assignee.setColumnId(columnId);
        assignee.setMemberNo(memberNo);
        return dao.insert(assignee);
    }

    public int removeAssignee(int columnId, int memberNo) {
        return dao.delete(columnId, memberNo);
    }

    public int removeAllAssignees(int columnId) {
        return dao.deleteByColumn(columnId);
    }

    public List<ColumnAssignee> getAssigneesByColumn(int columnId) {
        return dao.listByColumn(columnId);
    }

    public List<ColumnAssignee> getColumnsByMember(int memberNo) {
        return dao.listByMember(memberNo);
    }

    public int countAssignees(int columnId) {
        return dao.countByColumn(columnId);
    }

    // 복수 담당자 일괄 설정
    public void setAssignees(int columnId, List<Integer> memberNos) {
        dao.deleteByColumn(columnId);
        for (Integer memberNo : memberNos) {
            ColumnAssignee assignee = new ColumnAssignee();
            assignee.setColumnId(columnId);
            assignee.setMemberNo(memberNo);
            dao.insert(assignee);
        }
    }

    // 복수 담당자 일괄 설정 + 알림 발송
    public void setAssigneesWithNotification(int columnId, List<Integer> memberNos, int senderNo) {
        // 기존 담당자 목록
        List<ColumnAssignee> existingAssignees = dao.listByColumn(columnId);
        Set<Integer> existingSet = new HashSet<>();
        for (ColumnAssignee a : existingAssignees) {
            existingSet.add(a.getMemberNo());
        }

        // 컬럼 정보
        FlowtaskColumn column = columnDao.content(columnId);

        // 기존 담당자 삭제 후 새로 추가
        dao.deleteByColumn(columnId);
        for (Integer memberNo : memberNos) {
            ColumnAssignee assignee = new ColumnAssignee();
            assignee.setColumnId(columnId);
            assignee.setMemberNo(memberNo);
            dao.insert(assignee);

            // 새로 추가된 담당자에게만 알림 (본인 제외)
            if (!existingSet.contains(memberNo) && memberNo != senderNo && column != null) {
                notificationService.notifyColumnAssignee(
                    memberNo,
                    senderNo,
                    columnId,
                    column.getTitle(),
                    column.getTeamId()
                );
            }
        }
    }
}
