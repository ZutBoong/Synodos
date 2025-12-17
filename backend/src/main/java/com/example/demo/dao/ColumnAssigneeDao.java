package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.ColumnAssignee;

@Mapper
public interface ColumnAssigneeDao {
    int insert(ColumnAssignee assignee);
    int delete(@Param("columnId") int columnId, @Param("memberNo") int memberNo);
    int deleteByColumn(int columnId);
    List<ColumnAssignee> listByColumn(int columnId);
    List<ColumnAssignee> listByMember(int memberNo);
    int countByColumn(int columnId);
}
