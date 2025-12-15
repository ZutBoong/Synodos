import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getRecentMessages, sendMessage, getMessagesBefore } from '../api/chatApi';
import './ChatPanel.css';

function ChatPanel({ teamId, loginMember, isOpen, onClose, stompClient }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const subscriptionRef = useRef(null);

  // 메시지 목록 로드
  const loadMessages = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await getRecentMessages(teamId, 100);
      setMessages(data);
      setHasMore(data.length >= 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // 이전 메시지 로드
  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;

    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const olderMessages = await getMessagesBefore(teamId, oldestMessage.messageId, 50);
      if (olderMessages.length < 50) {
        setHasMore(false);
      }
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  // 맨 아래로 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // WebSocket 구독
  useEffect(() => {
    if (!stompClient || !stompClient.connected || !teamId || !isOpen) return;

    const destination = `/topic/team/${teamId}/chat`;
    console.log('Subscribing to chat:', destination);

    subscriptionRef.current = stompClient.subscribe(destination, (message) => {
      const chatMessage = JSON.parse(message.body);
      console.log('Received chat message:', chatMessage);
      setMessages(prev => [...prev, chatMessage]);
    });

    return () => {
      if (subscriptionRef.current) {
        console.log('Unsubscribing from chat');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [stompClient, teamId, isOpen]);

  // 패널 열릴 때 메시지 로드
  useEffect(() => {
    if (isOpen && teamId) {
      loadMessages();
    }
  }, [isOpen, teamId, loadMessages]);

  // 새 메시지 시 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // 메시지 전송
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !loginMember) return;

    try {
      await sendMessage(teamId, loginMember.no, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  // 시간 포맷팅
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 내 메시지인지 확인
  const isMyMessage = (msg) => loginMember && msg.senderNo === loginMember.no;

  if (!isOpen) return null;

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>팀 채팅</h3>
        <button className="chat-close-btn" onClick={onClose}>×</button>
      </div>

      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="chat-loading-more">이전 메시지 로딩중...</div>
        )}

        {loading ? (
          <div className="chat-loading">메시지를 불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <p>아직 메시지가 없습니다.</p>
            <p>첫 번째 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.messageId || index}
              className={`chat-message ${isMyMessage(msg) ? 'mine' : ''}`}
            >
              {!isMyMessage(msg) && (
                <div className="chat-sender">{msg.senderName || msg.senderUserid}</div>
              )}
              <div className="chat-bubble">
                <div className="chat-content">{msg.content}</div>
                <div className="chat-time">{formatTime(msg.sentAt)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="메시지를 입력하세요..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!loginMember}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || !loginMember}
        >
          전송
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
