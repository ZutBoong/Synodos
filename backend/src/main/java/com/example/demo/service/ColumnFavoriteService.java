package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.ColumnFavoriteDao;
import com.example.demo.model.ColumnFavorite;

@Service
public class ColumnFavoriteService {

    @Autowired
    private ColumnFavoriteDao dao;

    public int addFavorite(int columnId, int memberNo) {
        ColumnFavorite favorite = new ColumnFavorite();
        favorite.setColumnId(columnId);
        favorite.setMemberNo(memberNo);
        return dao.insert(favorite);
    }

    public int removeFavorite(int columnId, int memberNo) {
        return dao.delete(columnId, memberNo);
    }

    public List<ColumnFavorite> getFavoritesByMember(int memberNo) {
        return dao.listByMember(memberNo);
    }

    public boolean isFavorite(int columnId, int memberNo) {
        return dao.findOne(columnId, memberNo) != null;
    }

    public int countFavorites(int memberNo) {
        return dao.countByMember(memberNo);
    }

    // 즐겨찾기 토글
    public boolean toggleFavorite(int columnId, int memberNo) {
        ColumnFavorite existing = dao.findOne(columnId, memberNo);
        if (existing != null) {
            dao.delete(columnId, memberNo);
            return false; // 즐겨찾기 해제됨
        } else {
            ColumnFavorite favorite = new ColumnFavorite();
            favorite.setColumnId(columnId);
            favorite.setMemberNo(memberNo);
            dao.insert(favorite);
            return true; // 즐겨찾기 추가됨
        }
    }
}
