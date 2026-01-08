package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Comment;
import com.example.demo.service.CommentService;

@RestController
@RequestMapping("/api")
public class CommentController {

	@Autowired
	private CommentService service;

	// 댓글 생성
	@PostMapping("comment")
	public Comment commentWrite(@RequestBody Comment comment) {
		Comment created = service.insert(comment);
		return created;
	}

	// 태스크별 댓글 목록
	@GetMapping("comment/task/{taskId}")
	public List<Comment> commentListByTask(@PathVariable("taskId") int taskId) {
		List<Comment> list = service.listByTask(taskId);
		return list;
	}

	// 댓글 상세
	@GetMapping("comment/{commentId}")
	public Comment commentContent(@PathVariable("commentId") int commentId) {
		Comment result = service.content(commentId);
		return result;
	}

	// 댓글 수정
	@PutMapping("comment/{commentId}")
	public Integer commentUpdate(
			@PathVariable("commentId") int commentId,
			@RequestBody Comment comment) {
		comment.setCommentId(commentId);
		int result = service.update(comment);
		return result;
	}

	// 댓글 삭제
	@DeleteMapping("comment/{commentId}")
	public Integer commentDelete(@PathVariable("commentId") int commentId) {
		int result = service.delete(commentId);
		return result;
	}

	// 태스크별 댓글 수
	@GetMapping("comment/count/{taskId}")
	public Integer commentCountByTask(@PathVariable("taskId") int taskId) {
		return service.countByTask(taskId);
	}
}
