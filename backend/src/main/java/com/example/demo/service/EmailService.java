package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Random;

@Slf4j
@Service
public class EmailService {

	@Autowired
	private JavaMailSender mailSender;

	@Value("${email.environment:dev}")
	private String environment;

	@Value("${spring.mail.username:}")
	private String sender;

	/**
	 * 6자리 인증 코드 생성
	 */
	public String generateVerificationCode() {
		Random random = new Random();
		int code = 100000 + random.nextInt(900000);
		return String.valueOf(code);
	}

	/**
	 * 인증 이메일 발송
	 * @param to 수신자 이메일
	 * @param code 인증 코드
	 * @param type REGISTER, PASSWORD_RESET, PASSWORD_CHANGE, EMAIL_CHANGE
	 */
	public void sendVerificationEmail(String to, String code, String type) {
		log.info("sendVerificationEmail 호출 - to: {}, type: {}, environment: {}", to, type, environment);

		String subject;
		String body;

		switch (type) {
			case "REGISTER":
				subject = "[Synodos] 회원가입 이메일 인증";
				body = buildRegisterEmailBody(code);
				break;
			case "PASSWORD_CHANGE":
				subject = "[Synodos] 비밀번호 변경 인증";
				body = buildPasswordChangeEmailBody(code);
				break;
			case "EMAIL_CHANGE":
				subject = "[Synodos] 이메일 변경 인증";
				body = buildEmailChangeEmailBody(code);
				break;
			default:
				subject = "[Synodos] 비밀번호 재설정 인증";
				body = buildPasswordResetEmailBody(code);
		}

		if ("dev".equals(environment)) {
			// 개발 환경: 콘솔에 출력
			log.info("========================================");
			log.info("EMAIL VERIFICATION CODE");
			log.info("To: {}", to);
			log.info("Type: {}", type);
			log.info("Code: {}", code);
			log.info("========================================");
		} else {
			// 프로덕션 환경: SMTP로 발송
			log.info("SMTP 발송 시도 - sender: {}", sender);
			sendEmailViaSMTP(to, subject, body);
		}
	}

	/**
	 * SMTP를 통한 이메일 발송
	 */
	private void sendEmailViaSMTP(String to, String subject, String body) {
		try {
			log.info("SMTP 메일 생성 시작 - from: {}, to: {}", sender, to);
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

			helper.setFrom(sender);
			helper.setTo(to);
			helper.setSubject(subject);
			helper.setText(body, true); // true = HTML

			log.info("SMTP 메일 전송 시작...");
			mailSender.send(message);
			log.info("Email sent successfully to: {}", to);
		} catch (MessagingException e) {
			log.error("MessagingException - Failed to send email to {}: {}", to, e.getMessage(), e);
			throw new RuntimeException("이메일 발송에 실패했습니다.", e);
		} catch (Exception e) {
			log.error("Exception - Failed to send email to {}: {}", to, e.getMessage(), e);
			throw new RuntimeException("이메일 발송에 실패했습니다.", e);
		}
	}

	/**
	 * 공통 이메일 템플릿 생성
	 * @param code 인증 코드
	 * @param purpose 목적 설명 (예: "회원가입을 위한")
	 * @param requestType 요청 유형 (예: "회원가입")
	 * @param warningMessage 경고 메시지 (예: "이 메일을 무시해주세요")
	 */
	private String buildEmailTemplate(String code, String purpose, String requestType, String warningMessage) {
		return """
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: 'Malgun Gothic', sans-serif; background-color: #f8fafc; padding: 20px; }
					.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
					.header { text-align: center; margin-bottom: 30px; }
					.logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
					.code-box { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
					.message { color: #64748b; text-align: center; line-height: 1.6; }
					.footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="logo">Synodos</div>
					</div>
					<p class="message">%s 이메일 인증 코드입니다.<br>아래 코드를 입력해주세요.</p>
					<div class="code-box">%s</div>
					<p class="message">이 코드는 5분간 유효합니다.</p>
					<div class="footer">
						본 메일은 Synodos %s 요청에 의해 발송되었습니다.<br>
						본인이 요청하지 않았다면 %s.
					</div>
				</div>
			</body>
			</html>
			""".formatted(purpose, code, requestType, warningMessage);
	}

	private String buildRegisterEmailBody(String code) {
		return buildEmailTemplate(code, "회원가입을 위한", "회원가입", "이 메일을 무시해주세요");
	}

	private String buildPasswordResetEmailBody(String code) {
		return buildEmailTemplate(code, "비밀번호 재설정을 위한", "비밀번호 재설정", "이 메일을 무시해주세요");
	}

	private String buildPasswordChangeEmailBody(String code) {
		return buildEmailTemplate(code, "비밀번호 변경을 위한", "비밀번호 변경", "즉시 비밀번호를 변경해주세요");
	}

	private String buildEmailChangeEmailBody(String code) {
		return buildEmailTemplate(code, "이메일 변경을 위한", "이메일 변경", "이 메일을 무시해주세요");
	}
}
