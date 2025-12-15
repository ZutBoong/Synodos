package com.example.demo.controller;

import java.util.Map;
import java.util.HashMap;
import org.springframework.web.bind.annotation.*;
import com.example.demo.dto.AuthResponse;
import com.example.demo.model.Member;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.service.MemberService;

@RestController
public class MemberController {

	private final MemberService service;
	private final JwtTokenProvider jwtTokenProvider;

	public MemberController(MemberService service, JwtTokenProvider jwtTokenProvider) {
		this.service = service;
		this.jwtTokenProvider = jwtTokenProvider;
	}

	// 회원가입
	@PostMapping("member/register")
	public Map<String, Object> register(@RequestBody Member member) {
		System.out.println("회원가입 요청: " + member);
		Map<String, Object> result = new HashMap<>();

		int insertResult = service.insert(member);
		if (insertResult == 1) {
			System.out.println("회원가입 성공");
			result.put("success", true);
			result.put("message", "회원가입이 완료되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "회원가입에 실패했습니다.");
		}

		return result;
	}

	// 아이디 중복 체크
	@GetMapping("member/check-userid")
	public Map<String, Object> checkUserid(@RequestParam String userid) {
		System.out.println("아이디 중복 체크: " + userid);
		Map<String, Object> result = new HashMap<>();

		int count = service.checkUserid(userid);
		result.put("available", count == 0);
		result.put("message", count == 0 ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다.");

		return result;
	}

	// 이메일 중복 체크
	@GetMapping("member/check-email")
	public Map<String, Object> checkEmail(@RequestParam String email) {
		System.out.println("이메일 중복 체크: " + email);
		Map<String, Object> result = new HashMap<>();

		int count = service.checkEmail(email);
		result.put("available", count == 0);
		result.put("message", count == 0 ? "사용 가능한 이메일입니다." : "이미 사용 중인 이메일입니다.");

		return result;
	}

	// 로그인 (JWT 토큰 반환)
	@PostMapping("member/login")
	public AuthResponse login(@RequestBody Member member) {
		System.out.println("로그인 요청: " + member.getUserid());

		Member authenticatedMember = service.authenticate(member.getUserid(), member.getPassword());
		if (authenticatedMember != null) {
			System.out.println("로그인 성공: " + authenticatedMember.getName());
			String token = jwtTokenProvider.generateToken(
					authenticatedMember.getUserid(),
					authenticatedMember.getNo(),
					authenticatedMember.getName()
			);
			return AuthResponse.success(
					token,
					authenticatedMember.getNo(),
					authenticatedMember.getUserid(),
					authenticatedMember.getName(),
					authenticatedMember.getEmail()
			);
		} else {
			return AuthResponse.fail("아이디 또는 비밀번호가 일치하지 않습니다.");
		}
	}

	// 아이디 찾기
	@PostMapping("member/find-userid")
	public Map<String, Object> findUserid(@RequestBody Member member) {
		System.out.println("아이디 찾기 요청 - 이름: " + member.getName() + ", 이메일: " + member.getEmail());
		Map<String, Object> result = new HashMap<>();

		String userid = service.findUserid(member);
		if (userid != null) {
			result.put("success", true);
			result.put("userid", userid);
			result.put("message", "아이디를 찾았습니다.");
		} else {
			result.put("success", false);
			result.put("message", "일치하는 회원 정보가 없습니다.");
		}

		return result;
	}

	// 비밀번호 찾기 (회원 확인)
	@PostMapping("member/find-password")
	public Map<String, Object> findPassword(@RequestBody Member member) {
		System.out.println("비밀번호 찾기 요청 - 아이디: " + member.getUserid() + ", 이메일: " + member.getEmail());
		Map<String, Object> result = new HashMap<>();

		Member foundMember = service.findMemberForPassword(member);
		if (foundMember != null) {
			result.put("success", true);
			result.put("message", "회원 확인 완료. 새 비밀번호를 설정해주세요.");
			result.put("memberNo", foundMember.getNo());
		} else {
			result.put("success", false);
			result.put("message", "일치하는 회원 정보가 없습니다.");
		}

		return result;
	}

	// 비밀번호 변경
	@PutMapping("member/reset-password")
	public Map<String, Object> resetPassword(@RequestBody Member member) {
		System.out.println("비밀번호 변경 요청 - no: " + member.getNo());
		Map<String, Object> result = new HashMap<>();

		int updateResult = service.updatePassword(member);
		if (updateResult == 1) {
			result.put("success", true);
			result.put("message", "비밀번호가 변경되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "비밀번호 변경에 실패했습니다.");
		}

		return result;
	}
}
