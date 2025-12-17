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
}
