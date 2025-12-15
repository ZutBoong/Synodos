package com.example.demo.dao;

import com.example.demo.model.Tag;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface TagDao {
    int insert(Tag tag);
    List<Tag> listByTeam(int teamId);
    List<Tag> listByTask(int taskId);
    Tag getById(int tagId);
    int update(Tag tag);
    int delete(int tagId);

    // Task-Tag mapping
    int addTagToTask(int taskId, int tagId);
    int removeTagFromTask(int taskId, int tagId);
    int removeAllTagsFromTask(int taskId);
}
