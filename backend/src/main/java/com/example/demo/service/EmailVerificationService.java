package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dao.EmailVerificationDao;
import com.example.demo.dao.MemberDao;
import com.example.demo.model.EmailVerification;
import com.example.demo.model.Member;

import java.time.LocalDateTime;

@Service
public class EmailVerificationService {

	@Autowired
	private EmailVerificationDao emailVerificationDao;

	@Autowired
	private MemberDao memberDao;

	@Autowired
	private EmailService emailService;

	@Value("${email.verification.code.expiry:300000}")
	private long codeExpiryMs;

	/**
	 * 인증 코드 생성 및 이메일 발송
	 * @param email 이메일 주소
	 * @param type REGISTER 또는 PASSWORD_RESET
	 */
	@Transactional
	public void sendVerificationCode(String email, String type) {
		// 기존 미인증 레코드 삭제
		emailVerificationDao.deleteByEmailAndType(email, type);

		// 새 인증 코드 생성
		String code = emailService.generateVerificationCode();

		// DB에 저장
		EmailVerification verification = new EmailVerification();
		verification.setEmail(email);
		verification.setCode(code);
		verification.setType(type);
		verification.setExpiresAt(LocalDateTime.now().plusSeconds(codeExpiryMs / 1000));
		verification.setVerified(false);

		emailVerificationDao.insert(verification);

		// 이메일 발송
		emailService.sendVerificationEmail(email, code, type);
	}

	/**
	 * 인증 코드 확인
	 * @param email 이메일 주소
	 * @param code 인증 코드
	 * @param type REGISTER 또는 PASSWORD_RESET
	 * @return 인증 성공 여부
	 */
	@Transactional
	public boolean verifyCode(String email, String code, String type) {
		EmailVerification verification = emailVerificationDao.findLatestByEmailAndType(email, type);

		if (verification == null) {
			return false;
		}

		// 만료 확인
		if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
			return false;
		}

		// 코드 일치 확인
		if (!verification.getCode().equals(code)) {
			return false;
		}

		// 인증 완료 처리
		emailVerificationDao.updateVerified(verification.getId());

		// 회원가입 인증인 경우 회원의 emailVerified 업데이트
		if ("REGISTER".equals(type)) {
			Member member = memberDao.findByEmail(email);
			if (member != null) {
				memberDao.updateEmailVerified(member.getNo());
			}
		}

		return true;
	}

	/**
	 * 이메일 인증 여부 확인 (회원가입용)
	 * @param email 이메일 주소
	 * @return 인증 완료 여부
	 */
	public boolean isEmailVerified(String email) {
		EmailVerification verification = emailVerificationDao.findLatestByEmailAndType(email, "REGISTER");
		return verification != null && verification.isVerified();
	}

	/**
	 * 비밀번호 재설정 인증 여부 확인
	 * @param email 이메일 주소
	 * @return 인증 완료 여부
	 */
	public boolean isPasswordResetVerified(String email) {
		EmailVerification verification = emailVerificationDao.findLatestByEmailAndType(email, "PASSWORD_RESET");
		return verification != null && verification.isVerified();
	}

	/**
	 * 재발송 쿨다운 확인
	 * @param email 이메일 주소
	 * @param type 인증 타입
	 * @param cooldownMs 쿨다운 시간 (밀리초)
	 * @return 재발송 가능 여부
	 */
	public boolean canResend(String email, String type, long cooldownMs) {
		EmailVerification verification = emailVerificationDao.findLatestByEmailAndType(email, type);
		if (verification == null) {
			return true;
		}
		LocalDateTime cooldownEnd = verification.getCreatedAt().plusSeconds(cooldownMs / 1000);
		return LocalDateTime.now().isAfter(cooldownEnd);
	}
}
