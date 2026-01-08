package com.example.demo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

	@Value("${jwt.secret}")
	private String jwtSecret;

	@Value("${jwt.expiration}")
	private long jwtExpiration;

	private SecretKey getSigningKey() {
		byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
		return Keys.hmacShaKeyFor(keyBytes);
	}

	public String generateToken(String userid, int memberNo, String name) {
		Date now = new Date();
		Date expiryDate = new Date(now.getTime() + jwtExpiration);

		return Jwts.builder()
				.subject(userid)
				.claim("memberNo", memberNo)
				.claim("name", name)
				.issuedAt(now)
				.expiration(expiryDate)
				.signWith(getSigningKey())
				.compact();
	}

	public String getUseridFromToken(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(getSigningKey())
				.build()
				.parseSignedClaims(token)
				.getPayload();

		return claims.getSubject();
	}

	public int getMemberNoFromToken(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(getSigningKey())
				.build()
				.parseSignedClaims(token)
				.getPayload();

		return claims.get("memberNo", Integer.class);
	}

	public boolean validateToken(String token) {
		try {
			Jwts.parser()
					.verifyWith(getSigningKey())
					.build()
					.parseSignedClaims(token);
			return true;
		} catch (JwtException | IllegalArgumentException e) {
			return false;
		}
	}
}
