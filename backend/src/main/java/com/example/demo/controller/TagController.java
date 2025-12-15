package com.example.demo.controller;

import com.example.demo.model.Tag;
import com.example.demo.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tag")
@CrossOrigin("*")
public class TagController {

    @Autowired
    private TagService tagService;

    @PostMapping
    public ResponseEntity<Tag> create(@RequestBody Tag tag) {
        Tag created = tagService.create(tag);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<Tag>> listByTeam(@PathVariable int teamId) {
        List<Tag> tags = tagService.listByTeam(teamId);
        return ResponseEntity.ok(tags);
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<Tag>> listByTask(@PathVariable int taskId) {
        List<Tag> tags = tagService.listByTask(taskId);
        return ResponseEntity.ok(tags);
    }

    @GetMapping("/{tagId}")
    public ResponseEntity<Tag> getById(@PathVariable int tagId) {
        Tag tag = tagService.getById(tagId);
        if (tag == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(tag);
    }

    @PutMapping("/{tagId}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable int tagId, @RequestBody Tag tag) {
        tag.setTagId(tagId);
        int result = tagService.update(tag);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{tagId}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable int tagId) {
        int result = tagService.delete(tagId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/task/{taskId}/tags")
    public ResponseEntity<Map<String, Object>> addTagToTask(
            @PathVariable int taskId,
            @RequestBody Map<String, Integer> request) {
        int tagId = request.get("tagId");
        int result = tagService.addTagToTask(taskId, tagId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/task/{taskId}/tags/{tagId}")
    public ResponseEntity<Map<String, Object>> removeTagFromTask(
            @PathVariable int taskId,
            @PathVariable int tagId) {
        int result = tagService.removeTagFromTask(taskId, tagId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/task/{taskId}/tags")
    public ResponseEntity<Map<String, Object>> updateTaskTags(
            @PathVariable int taskId,
            @RequestBody List<Integer> tagIds) {
        tagService.updateTaskTags(taskId, tagIds);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return ResponseEntity.ok(response);
    }
}
