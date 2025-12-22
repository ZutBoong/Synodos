package com.example.demo.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.EmailVerification;

@Mapper
public interface EmailVerificationDao {

	// 인증 코드 저장
	void insert(EmailVerification verification);

	// 이메일과 타입으로 가장 최근 인증 정보 조회
	EmailVerification findLatestByEmailAndType(@Param("email") String email, @Param("type") String type);

	// 인증 완료 처리
	void updateVerified(@Param("id") int id);

	// 이메일과 타입으로 미인증 레코드 삭제 (재발송 시)
	void deleteByEmailAndType(@Param("email") String email, @Param("type") String type);

	// 만료된 인증 코드 삭제 (배치용)
	void deleteExpired();
}
