package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.ColumnArchiveDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.dao.ProjectDao;
import com.example.demo.model.ColumnArchive;
import com.example.demo.model.FlowtaskColumn;
import com.example.demo.model.Task;
import com.example.demo.model.Team;
import com.example.demo.model.Project;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ColumnArchiveService {

    @Autowired
    private ColumnArchiveDao archiveDao;

    @Autowired
    private FlowtaskColumnDao columnDao;

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private TeamDao teamDao;

    @Autowired
    private ProjectDao projectDao;

    private ObjectMapper objectMapper = new ObjectMapper();

    // 컬럼 아카이브 생성
    public int archiveColumn(int columnId, int memberNo, String archiveNote) {
        FlowtaskColumn column = columnDao.content(columnId);
        if (column == null) {
            return 0;
        }

        // 팀/프로젝트 정보 조회
        Team team = null;
        Project project = null;
        if (column.getTeamId() > 0) {
            team = teamDao.findById(column.getTeamId());
        }
        if (column.getProjectId() > 0) {
            project = projectDao.content(column.getProjectId());
        }

        // 컬럼 내 태스크들 조회
        List<Task> tasks = taskDao.listByColumn(columnId);
        String tasksJson = "[]";
        try {
            tasksJson = objectMapper.writeValueAsString(tasks);
        } catch (Exception e) {
            e.printStackTrace();
        }

        ColumnArchive archive = new ColumnArchive();
        archive.setMemberNo(memberNo);
        archive.setOriginalColumnId(columnId);
        archive.setTeamId(column.getTeamId());
        archive.setTeamName(team != null ? team.getTeamName() : null);
        archive.setProjectId(column.getProjectId());
        archive.setProjectName(project != null ? project.getProjectName() : null);
        archive.setColumnTitle(column.getTitle());
        archive.setColumnPosition(column.getPosition());
        archive.setTasksSnapshot(tasksJson);
        archive.setArchiveNote(archiveNote);

        return archiveDao.insert(archive);
    }

    // 아카이브 삭제
    public int deleteArchive(int archiveId) {
        return archiveDao.delete(archiveId);
    }

    // 아카이브 상세 조회
    public ColumnArchive getArchive(int archiveId) {
        return archiveDao.findById(archiveId);
    }

    // 멤버별 아카이브 목록
    public List<ColumnArchive> getArchivesByMember(int memberNo) {
        return archiveDao.listByMember(memberNo);
    }

    // 멤버의 아카이브 수
    public int countArchives(int memberNo) {
        return archiveDao.countByMember(memberNo);
    }
}
