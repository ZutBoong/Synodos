package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.ColumnFavorite;

@Mapper
public interface ColumnFavoriteDao {
    int insert(ColumnFavorite favorite);
    int delete(@Param("columnId") int columnId, @Param("memberNo") int memberNo);
    List<ColumnFavorite> listByMember(int memberNo);
    ColumnFavorite findOne(@Param("columnId") int columnId, @Param("memberNo") int memberNo);
    int countByMember(int memberNo);
}
