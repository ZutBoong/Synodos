package com.example.demo.model;

import java.time.LocalDateTime;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("emailVerification")
public class EmailVerification {
	private int id;
	private String email;
	private String code;
	private String type;  // REGISTER, PASSWORD_RESET
	private LocalDateTime expiresAt;
	private boolean verified;
	private LocalDateTime createdAt;
}
