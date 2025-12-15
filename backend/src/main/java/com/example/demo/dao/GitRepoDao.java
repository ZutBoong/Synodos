package com.example.demo.dao;

import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.GitRepo;

@Mapper
public interface GitRepoDao {
	int insert(GitRepo repo);
	GitRepo getByTeamId(int teamId);
	GitRepo getById(int repoId);
	int update(GitRepo repo);
	int delete(int repoId);
}
