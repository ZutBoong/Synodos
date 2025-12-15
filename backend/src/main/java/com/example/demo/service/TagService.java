package com.example.demo.service;

import com.example.demo.dao.TagDao;
import com.example.demo.model.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TagService {

    @Autowired
    private TagDao tagDao;

    @Transactional
    public Tag create(Tag tag) {
        if (tag.getColor() == null || tag.getColor().isEmpty()) {
            tag.setColor("#6c757d");
        }
        tagDao.insert(tag);
        return tag;
    }

    public List<Tag> listByTeam(int teamId) {
        return tagDao.listByTeam(teamId);
    }

    public List<Tag> listByTask(int taskId) {
        return tagDao.listByTask(taskId);
    }

    public Tag getById(int tagId) {
        return tagDao.getById(tagId);
    }

    @Transactional
    public int update(Tag tag) {
        return tagDao.update(tag);
    }

    @Transactional
    public int delete(int tagId) {
        return tagDao.delete(tagId);
    }

    @Transactional
    public int addTagToTask(int taskId, int tagId) {
        try {
            return tagDao.addTagToTask(taskId, tagId);
        } catch (Exception e) {
            // Duplicate entry - tag already added
            return 0;
        }
    }

    @Transactional
    public int removeTagFromTask(int taskId, int tagId) {
        return tagDao.removeTagFromTask(taskId, tagId);
    }

    @Transactional
    public void updateTaskTags(int taskId, List<Integer> tagIds) {
        // Remove all existing tags
        tagDao.removeAllTagsFromTask(taskId);
        // Add new tags
        if (tagIds != null) {
            for (Integer tagId : tagIds) {
                tagDao.addTagToTask(taskId, tagId);
            }
        }
    }
}
