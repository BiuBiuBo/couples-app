'use client';

import { useEffect } from 'react';
import { useNotifications, mutators } from '@/lib/hooks';
import Avatar from '@/components/Avatar';
import type { AppNotification, ActiveView, UserProfile } from '@/lib/types';

const TYPE_CONFIG: Record<AppNotification['type'], { emoji: string; color: string }> = {
  mood_update:       { emoji: '🌙', color: '#a855f7' },
  album_create:      { emoji: '📸', color: '#f43f5e' },
  album_delete:      { emoji: '🗑️', color: '#6b7280' },
  photo_add:         { emoji: '🖼️', color: '#ec4899' },
  photo_delete:      { emoji: '🗑️', color: '#6b7280' },
  bucket_add:        { emoji: '✨', color: '#f59e0b' },
  bucket_complete:   { emoji: '🎉', color: '#10b981' },
  bucket_delete:     { emoji: '🗑️', color: '#6b7280' },
  anniversary_add:   { emoji: '📅', color: '#3b82f6' },
  anniversary_delete:{ emoji: '🗑️', color: '#6b7280' },
  note_add:          { emoji: '📝', color: '#8b5cf6' },
  promise_add:       { emoji: '🤝', color: '#06b6d4' },
  promise_fulfill:   { emoji: '✅', color: '#10b981' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onNavigate: (v: ActiveView) => void;
}

export default function NotificationDrawer({ open, onClose, currentUser, onNavigate }: Props) {
  const allNotifications = useNotifications(currentUser.coupleId);
  const notifs = allNotifications.filter(n => n.fromUserId !== currentUser.id);

  useEffect(() => {
    if (open && currentUser.coupleId) {
      // Mark all unread notifications from partner as read
      notifs.forEach(n => {
        if (!n.isRead && currentUser.coupleId) {
          mutators.updateDoc(currentUser.coupleId, 'notifications', n.id, { isRead: true });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUser.coupleId]);

  if (!open) return null;

  const handleNav = (n: AppNotification) => {
    if (currentUser.coupleId && !n.isRead) {
      mutators.updateDoc(currentUser.coupleId, 'notifications', n.id, { isRead: true });
    }
    if (n.targetView) { onNavigate(n.targetView); }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 91,
        width: 360, maxWidth: '92vw',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-glass)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🔔 Thông báo</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Hoạt động từ người yêu của bạn
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18 }}
          >✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💌</div>
              <p style={{ fontSize: 14 }}>Chưa có hoạt động nào từ người yêu của bạn!</p>
            </div>
          ) : (
            notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] || { emoji: '🔔', color: '#f43f5e' };
              return (
                <div
                  key={n.id}
                  onClick={() => handleNav(n)}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '12px 20px',
                    cursor: n.targetView ? 'pointer' : 'default',
                    background: n.isRead ? 'transparent' : 'rgba(255,77,136,0.05)',
                    borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--pink-400)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (n.targetView) e.currentTarget.style.background = 'var(--bg-glass)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(255,77,136,0.05)'; }}
                >
                  {/* Avatar + type badge */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--gradient-card)', border: '1px solid var(--border-pink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    }}><Avatar src={n.fromAvatar} size={40} /></div>
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: cfg.color, fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--bg-card)',
                    }}>{cfg.emoji}</div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.45 }}>
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</span>
                      {n.targetView && (
                        <span style={{ fontSize: 11, color: 'var(--pink-400)', fontWeight: 500 }}>→ Xem ngay</span>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink-400)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifs.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => {
                if (currentUser.coupleId) {
                  notifs.forEach(n => {
                    if (!n.isRead && currentUser.coupleId) {
                      mutators.updateDoc(currentUser.coupleId, 'notifications', n.id, { isRead: true });
                    }
                  });
                }
              }}
              className="btn-ghost"
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
            >
              ✓ Đánh dấu tất cả đã đọc
            </button>
          </div>
        )}
      </div>
    </>
  );
}
