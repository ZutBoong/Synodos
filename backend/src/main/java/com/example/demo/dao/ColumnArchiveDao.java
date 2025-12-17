package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.ColumnArchive;

@Mapper
public interface ColumnArchiveDao {
    int insert(ColumnArchive archive);
    int delete(int archiveId);
    ColumnArchive findById(int archiveId);
    List<ColumnArchive> listByMember(int memberNo);
    int countByMember(int memberNo);
}
