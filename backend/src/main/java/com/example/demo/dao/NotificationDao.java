package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.Notification;

@Mapper
public interface NotificationDao {
    int insert(Notification notification);
    int markAsRead(int notificationId);
    int markAllAsRead(int recipientNo);
    int delete(int notificationId);
    int deleteAllByRecipient(int recipientNo);
    Notification findById(int notificationId);
    List<Notification> listByRecipient(@Param("recipientNo") int recipientNo, @Param("limit") int limit);
    List<Notification> listUnreadByRecipient(int recipientNo);
    int countUnread(int recipientNo);

    /**
     * 최근 24시간 이내 특정 태스크에 대한 특정 타입의 알림 존재 여부 확인
     */
    boolean hasRecentNotification(@Param("taskId") int taskId, @Param("type") String type);
}
