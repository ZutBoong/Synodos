package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.KariColumn;

@Mapper
public interface KariColumnDao {
	int insert(KariColumn column);
	List<KariColumn> list();
	List<KariColumn> listByTeam(int teamId);
	List<KariColumn> listByProject(int projectId);
	KariColumn content(int columnId);
	int update(KariColumn column);
	int delete(int columnId);
	int updatePosition(KariColumn column);
}
