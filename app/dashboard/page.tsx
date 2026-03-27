'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { useAuth, useCurrentUser, useCouple, useAnniversaries, useNotifications, useBucketList, useNotes, useMoods, usePromises, useAlbums, mutators } from '@/lib/hooks';
import { logout } from '@/lib/auth';
import type { UserProfile, CoupleData, Anniversary, MoodEntry, ActiveView } from '@/lib/types';

// ─── Lazy-load feature panels ─────────────────────────────────────────────────
import LoveCounter from '@/components/LoveCounter';
import Avatar from '@/components/Avatar';
import AlbumPanel from '@/components/AlbumPanel';
import BucketListPanel from '@/components/BucketListPanel';
import NotesPanel from '@/components/NotesPanel';
import AnniversaryPanel from '@/components/AnniversaryPanel';
import MoodPanel from '@/components/MoodPanel';
import PromisesPanel from '@/components/PromisesPanel';
import ProfilePanel from '@/components/ProfilePanel';
import NotificationDrawer from '@/components/NotificationDrawer';

const NAV_ITEMS: { id: ActiveView; emoji: string; label: string }[] = [
  { id: 'dashboard',   emoji: '💕', label: 'Trang chính' },
  { id: 'albums',      emoji: '📸', label: 'Album ảnh' },
  { id: 'bucket-list', emoji: '✨', label: '100 điều muốn làm' },
  { id: 'notes',       emoji: '📝', label: 'Ghi chú yêu thương' },
  { id: 'anniversaries', emoji: '📅', label: 'Ngày kỷ niệm' },
  { id: 'mood',        emoji: '🌙', label: 'Nhật ký cảm xúc' },
  { id: 'promises',    emoji: '🤝', label: 'Lời hứa với nhau' },
  { id: 'profile',     emoji: '👤', label: 'Hồ sơ cá nhân' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const currentUser = useCurrentUser(user?.uid);
  const couple = useCouple(currentUser?.coupleId);
  const partner = couple ? (couple.user1Id === currentUser?.id ? couple.user2 : couple.user1) : null;
  const anniversaries = useAnniversaries(currentUser?.coupleId);
  const notifications = useNotifications(currentUser?.coupleId);

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Khôi phục màn hình đang xem nếu tải lại trang
  useEffect(() => {
    const saved = localStorage.getItem('cm_activeTab') as ActiveView;
    if (saved && NAV_ITEMS.some(i => i.id === saved)) setActiveView(saved);
  }, []);

  // Lưu lại mỗi khi chuyển màn hình
  useEffect(() => {
    localStorage.setItem('cm_activeTab', activeView);
  }, [activeView]);

  // Derived state
  const today = new Date();
  const upcomingCount = anniversaries.filter(a => {
    const next = getNextOccurrence(a.date, a.isRecurring);
    const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  const unreadCount = notifications.filter(n => n.fromUserId !== currentUser?.id && !n.isRead).length;

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
    else if (!authLoading && user && currentUser !== null && !currentUser.coupleId) router.push('/');
  }, [authLoading, user, currentUser, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading || !currentUser || !couple || !partner) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: 260, flexShrink: 0, background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 60,
        transition: 'var(--transition)',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="animate-heartbeat" style={{ fontSize: 24, display: 'inline-block' }}>💕</span>
            <span className="script" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Chúng Mình</span>
          </div>
          {couple && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
              {couple.relationshipName}
            </div>
          )}
        </div>

        {/* Couple display */}
        {couple && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--gradient-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Avatar src={couple.user1.avatar} size={32} />
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--gradient-primary)', borderRadius: 2 }} />
              <span style={{ fontSize: 16 }}>💞</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gradient-primary)', borderRadius: 2 }} />
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--gradient-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Avatar src={couple.user2.avatar} size={32} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>{couple.user1.name}</span>
              <span>{couple.user2.name}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 'var(--radius-md)',
                background: activeView === item.id ? 'var(--gradient-card)' : 'transparent',
                border: activeView === item.id ? '1px solid var(--border-pink)' : '1px solid transparent',
                color: activeView === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: activeView === item.id ? 600 : 400,
                cursor: 'pointer', transition: 'var(--transition)', marginBottom: 4,
                textAlign: 'left', position: 'relative',
              }}
              onMouseEnter={e => { if (activeView !== item.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-glass)'; }}
              onMouseLeave={e => { if (activeView !== item.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span>{item.label}</span>
              {item.id === 'anniversaries' && upcomingCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--gradient-primary)',
                  color: 'white', fontSize: 11, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 999,
                }}>{upcomingCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User profile + logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--gradient-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-pink)', flexShrink: 0 }}>
              <Avatar src={currentUser.avatar} size={36} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {partner ? `💞 ${partner.name}` : 'Chưa kết nối'}
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main" style={{ flex: 1, marginLeft: 260, minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'var(--transition)' }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(13, 8, 16, 0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-glass)',
          padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <button
            className="btn-icon menu-toggle"
            style={{ display: 'none' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >☰</button>

          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <h1 style={{ 
              fontSize: 20, fontWeight: 700, margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {NAV_ITEMS.find(n => n.id === activeView)?.emoji}{' '}
              {NAV_ITEMS.find(n => n.id === activeView)?.label}
            </h1>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Our song */}
            {couple?.ourSong && (
              <div className="song-chip" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)', borderRadius: 999,
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <span>🎵</span>
                <span className="song-chip-text" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {couple.ourSong.title}
                </span>
              </div>
            )}

            {/* Notification bell */}
            <button
              onClick={() => setNotifOpen(true)}
              style={{
                position: 'relative', background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)', borderRadius: 10,
                width: 40, height: 40, cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.borderColor = 'var(--border-pink)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = 'var(--border-glass)'; }}
              title="Thông báo"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 18, height: 18, borderRadius: 999,
                  background: 'var(--gradient-primary)',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid var(--bg-dark)',
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {/* Avatar — click to open profile */}
            <div
              onClick={() => setActiveView('profile')}
              title="Hồ sơ cá nhân"
              style={{
                fontSize: 28, cursor: 'pointer', borderRadius: '50%',
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-pink)'; e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.background = 'var(--bg-glass)'; }}
            >
              <Avatar src={currentUser.avatar} size={28} /></div>
          </div>
        </div>

        {/* Panel content */}
        <div className="dashboard-panel-content" style={{ flex: 1, padding: '28px' }}>
          {activeView === 'dashboard' && <DashboardOverview couple={couple} currentUser={currentUser} partner={partner} onNavigate={setActiveView} />}
          {activeView === 'albums' && <AlbumPanel currentUser={currentUser} />}
          {activeView === 'bucket-list' && <BucketListPanel currentUser={currentUser} partner={partner} />}
          {activeView === 'notes' && <NotesPanel currentUser={currentUser} partner={partner} />}
          {activeView === 'anniversaries' && <AnniversaryPanel couple={couple} currentUser={currentUser} onRefresh={() => {}} />}
          {activeView === 'mood' && <MoodPanel currentUser={currentUser} partner={partner} onNotify={() => {}} />}
          {activeView === 'promises' && <PromisesPanel currentUser={currentUser} partner={partner} />}
          {activeView === 'profile' && <ProfilePanel currentUser={currentUser} partner={partner} onUpdate={() => {}} />}
        </div>
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        currentUser={currentUser}
        onNavigate={(v) => { setActiveView(v); setNotifOpen(false); }}
      />
    </div>
  );
}

// ─── Dashboard Overview (home panel) ─────────────────────────────────────────

function DashboardOverview({
  couple, currentUser, partner,
  onNavigate,
}: {
  couple: CoupleData | null;
  currentUser: UserProfile;
  partner: UserProfile | null;
  onNavigate: (v: ActiveView) => void;
}) {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 30000);
    return () => clearTimeout(timer);
  }, []);

  const bucketItems = useBucketList(currentUser.coupleId);
  const notes = useNotes(currentUser.coupleId);
  const anns = useAnniversaries(currentUser.coupleId);
  const moods = useMoods(currentUser.coupleId);
  const albums = useAlbums(currentUser.coupleId);
  const today = new Date().toISOString().slice(0, 10);
  const myMood = moods.find(m => m.userId === currentUser.id && m.date === today);
  const partnerMood = partner ? moods.find(m => m.userId === partner.id && m.date === today) : null;

  const upcoming = anns.filter(a => {
    const next = getNextOccurrence(a.date, a.isRecurring);
    const diff = Math.ceil((next.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).sort((a, b) => {
    const da = getNextOccurrence(a.date, a.isRecurring).getTime();
    const db = getNextOccurrence(b.date, b.isRecurring).getTime();
    return da - db;
  }).slice(0, 3);

  const completedBucket = bucketItems.filter(b => b.completedAt).length;
  const unreadNotes = notes.filter(n => n.fromUserId !== currentUser.id && !n.isRead).length;

  const MOOD_EMOJIS: Record<string, string> = {
    euphoric: '🤩', happy: '😊', calm: '😌', missing: '🥺', tired: '😴', sad: '😢',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
      
      {/* Welcome Modal — centered overlay */}
      {showWelcome && (() => {
        const hour = new Date().getHours();
        const greeting = hour < 6 ? '🌙 Thức khuya thế...' : hour < 12 ? '☀️ Chào buổi sáng!' : hour < 18 ? '🌤️ Buổi chiều vui vẻ!' : '🌙 Buổi tối bình yên!';
        return (
          <div className="welcome-overlay" onClick={() => setShowWelcome(false)}>
            <div className="welcome-card" onClick={e => e.stopPropagation()}>

              {/* Floating sparkles */}
              <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 28 }}>
                {['✨','💫','⭐','✨','💕'].map((s, i) => (
                  <span key={i} style={{
                    position: 'absolute',
                    left: `${15 + i * 18}%`, top: `${10 + (i % 3) * 25}%`,
                    fontSize: 14, opacity: 0.35,
                    animation: `floatHeart ${2.5 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
                  }}>{s}</span>
                ))}
              </div>

              {/* Greeting tag */}
              <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: 'rgba(255,77,136,0.15)', border: '1px solid rgba(255,77,136,0.3)', fontSize: 13, color: 'var(--pink-300)', marginBottom: 24 }}>
                {greeting}
              </div>

              {/* Avatars */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(255,77,136,0.12)', border: '2px solid rgba(255,77,136,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
                  overflow: 'hidden',
                  animation: 'floatHeart 3s ease-in-out infinite',
                }}><Avatar src={currentUser.avatar} size={68} /></div>

                <div style={{ fontSize: 28, margin: '0 -4px', zIndex: 1, filter: 'drop-shadow(0 0 8px rgba(255,77,136,0.8))', animation: 'floatHeart 2s ease-in-out 0.5s infinite' }}>
                  💕
                </div>

                {partner && (
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'rgba(168,85,247,0.12)', border: '2px solid rgba(168,85,247,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
                    overflow: 'hidden',
                    animation: 'floatHeart 3.5s ease-in-out 0.3s infinite',
                  }}><Avatar src={partner.avatar} size={68} /></div>
                )}
              </div>

              {/* Main message */}
              <h2 className="playfair" style={{ fontSize: 26, margin: '0 0 8px', letterSpacing: 0.3 }}>
                Chào mừng trở về! 🏡
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>
                {currentUser.nickname ? `"${currentUser.nickname}"` : currentUser.name} ơi, hôm nay của bạn thế nào?
              </p>
              {partner && (
                <p style={{ fontSize: 13, color: 'var(--pink-300)', margin: 0 }}>
                  {partner.nickname ? `"${partner.nickname}"` : partner.name} đang chờ bạn 💌
                </p>
              )}

              {/* CTA button */}
              <button
                className="btn-primary"
                onClick={() => setShowWelcome(false)}
                style={{ marginTop: 28, width: '100%', fontSize: 15, padding: '13px 0', borderRadius: 14 }}
              >
                Vào trong nào ✨
              </button>

              {/* Progress bar auto-dismiss */}
              <div className="welcome-progress">
                <div className="welcome-progress-bar" />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>Tự đóng sau 30 giây · Click bên ngoài để đóng sớm</p>
            </div>
          </div>
        );
      })()}

      {/* Internal Animation Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toastSlideDown {
          0% { opacity: 0; transform: translateY(-40px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastFadeOut {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        .stagger-1 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .stagger-2 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
        .stagger-3 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        .stagger-4 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
        .stagger-5 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .interactive-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .interactive-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(255, 77, 136, 0.4);
          box-shadow: 0 12px 30px rgba(255, 77, 136, 0.15);
        }
      `}} />

      {/* Love counter */}
      <div className="stagger-1">
        {couple && <LoveCounter couple={couple} />}
      </div>

      {/* Mood today */}
      <div className="glass-card stagger-2 interactive-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div className="mood-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🌙 Tâm trạng hôm nay</h3>
            <div className="mood-items-row" style={{ display: 'flex', gap: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)', flexShrink: 0 }}><Avatar src={currentUser.avatar} size={18} /></span>
                {currentUser.name}: {myMood ? MOOD_EMOJIS[myMood.mood] : <span style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</span>}
              </div>
              {partner && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)', flexShrink: 0 }}><Avatar src={partner.avatar} size={18} /></span>
                  {partner.name}: {partnerMood ? MOOD_EMOJIS[partnerMood.mood] : <span style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</span>}
                </div>
              )}
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 18px' }} onClick={() => onNavigate('mood')}>
            Cập nhật tâm trạng
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-4 stagger-3" style={{ marginBottom: 24 }}>
        {[
          { emoji: '✨', label: 'Điều muốn làm', value: `${completedBucket}/${bucketItems.length}`, sub: 'đã hoàn thành', action: () => onNavigate('bucket-list') },
          { emoji: '📝', label: 'Ghi chú', value: notes.length, sub: unreadNotes > 0 ? `${unreadNotes} chưa đọc` : 'tất cả đã đọc', action: () => onNavigate('notes') },
          { emoji: '📅', label: 'Kỷ niệm', value: anns.length, sub: 'sự kiện đã lưu', action: () => onNavigate('anniversaries') },
          { emoji: '📸', label: 'Album ảnh', value: albums.length, sub: 'album đã tạo', action: () => onNavigate('albums') },
        ].map((stat, i) => (
          <div key={i} className="glass-card interactive-card" onClick={stat.action}
            style={{ padding: '20px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8, transition: 'transform 0.3s' }}
                 onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {stat.emoji}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)', marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: unreadNotes > 0 && stat.emoji === '📝' ? 'var(--pink-400)' : 'var(--text-muted)' }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming anniversaries */}
      {upcoming.length > 0 && (
        <div className="glass-card stagger-4 interactive-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📅 Sắp tới</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(a => {
              const next = getNextOccurrence(a.date, a.isRecurring);
              const diff = Math.ceil((next.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={a.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                  transition: 'background 0.2s', cursor: 'default'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                  <span style={{ fontSize: 24, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>{a.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(next)}
                    </div>
                  </div>
                  <span className="badge" style={{ background: diff === 0 ? 'var(--gradient-primary)' : 'var(--bg-glass)', border: diff === 0 ? 'none' : '1px solid var(--border-pink)' }}>
                    {diff === 0 ? 'Hôm nay! 🎉' : `${diff} ngày nữa`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="quick-nav-grid grid-3 stagger-5" style={{ gap: 16 }}>
        {NAV_ITEMS.filter(n => n.id !== 'dashboard').map(item => (
          <button key={item.id} className="glass-card interactive-card" onClick={() => onNavigate(item.id)}
            style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', textAlign: 'left', width: '100%' }}>
            <span style={{ fontSize: 24 }}>{item.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────────
export function getNextOccurrence(dateStr: string, recurring: boolean): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!recurring) return new Date(dateStr);

  // For recurring: use this year's date, if passed use next year
  const parts = dateStr.slice(5); // MM-DD
  const [month, day] = parts.split('-').map(Number);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  if (thisYear >= today) return thisYear;
  return new Date(today.getFullYear() + 1, month - 1, day);
}
