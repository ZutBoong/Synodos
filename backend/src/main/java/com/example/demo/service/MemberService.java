package com.example.demo.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.example.demo.dao.MemberDao;
import com.example.demo.model.Member;

@Service
public class MemberService {

	private final MemberDao dao;
	private final PasswordEncoder passwordEncoder;

	public MemberService(MemberDao dao, PasswordEncoder passwordEncoder) {
		this.dao = dao;
		this.passwordEncoder = passwordEncoder;
	}

	// 회원가입 (비밀번호 암호화)
	public int insert(Member member) {
		String encodedPassword = passwordEncoder.encode(member.getPassword());
		member.setPassword(encodedPassword);
		return dao.insert(member);
	}

	// 아이디 중복 체크
	public int checkUserid(String userid) {
		return dao.checkUserid(userid);
	}

	// 이메일 중복 체크
	public int checkEmail(String email) {
		return dao.checkEmail(email);
	}

	// 로그인 (기존 - 평문 비밀번호 비교)
	@Deprecated
	public Member login(Member member) {
		return dao.login(member);
	}

	// JWT 로그인 (BCrypt 비밀번호 검증)
	public Member authenticate(String userid, String rawPassword) {
		Member member = dao.findByUserid(userid);
		if (member != null && passwordEncoder.matches(rawPassword, member.getPassword())) {
			return member;
		}
		return null;
	}

	// userid로 회원 조회
	public Member findByUserid(String userid) {
		return dao.findByUserid(userid);
	}

	// 아이디 찾기
	public String findUserid(Member member) {
		return dao.findUserid(member);
	}

	// 비밀번호 찾기 전 회원 확인
	public Member findMemberForPassword(Member member) {
		return dao.findMemberForPassword(member);
	}

	// 비밀번호 변경 (암호화)
	public int updatePassword(Member member) {
		String encodedPassword = passwordEncoder.encode(member.getPassword());
		member.setPassword(encodedPassword);
		return dao.updatePassword(member);
	}
}
