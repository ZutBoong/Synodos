package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Comment;
import com.example.demo.service.CommentService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api")
public class CommentController {

	@Autowired
	private CommentService service;

	// 댓글 생성
	@PostMapping("comment")
	public Comment commentWrite(@RequestBody Comment comment) {
		System.out.println("comment insert: " + comment);
		Comment created = service.insert(comment);
		if (created != null) {
			System.out.println("댓글 생성 성공: " + created.getCommentId());
		}
		return created;
	}

	// 태스크별 댓글 목록
	@GetMapping("comment/task/{taskId}")
	public List<Comment> commentListByTask(@PathVariable("taskId") int taskId) {
		List<Comment> list = service.listByTask(taskId);
		System.out.println("comment list by task " + taskId + ": " + list.size() + "개");
		return list;
	}

	// 댓글 상세
	@GetMapping("comment/{commentId}")
	public Comment commentContent(@PathVariable("commentId") int commentId) {
		Comment result = service.content(commentId);
		System.out.println("comment content: " + result);
		return result;
	}

	// 댓글 수정
	@PutMapping("comment/{commentId}")
	public Integer commentUpdate(
			@PathVariable("commentId") int commentId,
			@RequestBody Comment comment) {
		comment.setCommentId(commentId);
		System.out.println("comment update: " + comment);
		int result = service.update(comment);
		if (result == 1) {
			System.out.println("댓글 수정 성공");
		}
		return result;
	}

	// 댓글 삭제
	@DeleteMapping("comment/{commentId}")
	public Integer commentDelete(@PathVariable("commentId") int commentId) {
		System.out.println("comment delete: " + commentId);
		int result = service.delete(commentId);
		if (result == 1) {
			System.out.println("댓글 삭제 성공");
		}
		return result;
	}

	// 태스크별 댓글 수
	@GetMapping("comment/count/{taskId}")
	public Integer commentCountByTask(@PathVariable("taskId") int taskId) {
		return service.countByTask(taskId);
	}
}
