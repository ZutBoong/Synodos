package com.example.demo.service;

import java.sql.Timestamp;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TaskCommitDao;
import com.example.demo.model.TaskCommit;

@Service
public class TaskCommitService {

    @Autowired
    private TaskCommitDao dao;

    /**
     * 태스크에 커밋을 연결합니다.
     */
    public TaskCommit linkCommit(int taskId, String commitSha, String commitMessage,
                                  String commitAuthor, String commitDate, String githubUrl, int linkedBy) {
        // 중복 체크
        if (dao.countByTaskAndSha(taskId, commitSha) > 0) {
            throw new RuntimeException("이미 연결된 커밋입니다.");
        }

        TaskCommit taskCommit = new TaskCommit();
        taskCommit.setTaskId(taskId);
        taskCommit.setCommitSha(commitSha);
        taskCommit.setCommitMessage(commitMessage);
        taskCommit.setCommitAuthor(commitAuthor);
        taskCommit.setGithubUrl(githubUrl);
        taskCommit.setLinkedBy(linkedBy);

        // ISO 8601 날짜 문자열을 Timestamp로 변환
        if (commitDate != null && !commitDate.isEmpty()) {
            try {
                java.time.Instant instant = java.time.Instant.parse(commitDate);
                taskCommit.setCommitDate(Timestamp.from(instant));
            } catch (Exception e) {
                // 파싱 실패 시 무시
            }
        }

        dao.insert(taskCommit);
        return dao.findById(taskCommit.getId());
    }

    /**
     * 커밋 연결을 해제합니다.
     */
    public void unlinkCommit(int id) {
        dao.delete(id);
    }

    /**
     * 태스크에 연결된 커밋 목록을 조회합니다.
     */
    public List<TaskCommit> listByTask(int taskId) {
        return dao.listByTask(taskId);
    }

    /**
     * 커밋 연결 정보를 조회합니다.
     */
    public TaskCommit findById(int id) {
        return dao.findById(id);
    }
}
