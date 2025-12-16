package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.FlowtaskColumn;

@Mapper
public interface FlowtaskColumnDao {
	int insert(FlowtaskColumn column);
	List<FlowtaskColumn> list();
	List<FlowtaskColumn> listByTeam(int teamId);
	List<FlowtaskColumn> listByProject(int projectId);
	FlowtaskColumn content(int columnId);
	int update(FlowtaskColumn column);
	int delete(int columnId);
	int updatePosition(FlowtaskColumn column);
}
