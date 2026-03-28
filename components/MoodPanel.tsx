'use client';

import { useState } from 'react';
import { useMoods, mutators } from '@/lib/hooks';
import { notify } from '@/lib/notify';
import Avatar from '@/components/Avatar';
import type { MoodEntry, UserProfile } from '@/lib/types';
import { useToast } from '@/providers/ToastProvider';

interface Props { currentUser: UserProfile; partner: UserProfile | null; onNotify?: () => void; }

const MOODS = [
  { id: 'euphoric', emoji: '🤩', label: 'Hạnh phúc tột đỉnh', color: '#f59e0b' },
  { id: 'happy',   emoji: '😊', label: 'Vui vẻ',             color: '#22c55e' },
  { id: 'calm',    emoji: '😌', label: 'Bình yên',            color: '#3b82f6' },
  { id: 'missing', emoji: '🥺', label: 'Nhớ nhau',            color: '#a855f7' },
  { id: 'tired',   emoji: '😴', label: 'Mệt mỏi',             color: '#6b7280' },
  { id: 'sad',     emoji: '😢', label: 'Buồn',                color: '#ef4444' },
] as const;

type MoodId = typeof MOODS[number]['id'];

export default function MoodPanel({ currentUser, partner, onNotify }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const allMoods = useMoods(currentUser.coupleId);
  const toast = useToast();
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const myTodayMood = allMoods.find(m => m.userId === currentUser.id && m.date === today);
  const partnerTodayMood = partner ? allMoods.find(m => m.userId === partner.id && m.date === today) : null;

  // Last 7 days history
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  }).reverse();

  const saveMood = async () => {
    if (!selectedMood || !currentUser.coupleId) return;
    const entry: MoodEntry = {
      id: `${currentUser.id}_${today}`, userId: currentUser.id,
      mood: selectedMood, note, date: today,
    };
    await mutators.addDoc(currentUser.coupleId, 'moods', entry);
    const moodDef = MOODS.find(m => m.id === selectedMood);
    notify(currentUser.coupleId, currentUser, 'mood_update', `${currentUser.name} vừa cập nhật tâm trạng: ${moodDef?.emoji} ${moodDef?.label}`, 'mood');
    
    setSaved(true);
    setNote('');
    toast.success('Hôm nay bạn cảm thấy thế nào? Đã lưu nhé! ✨');
  };

  const getMoodDef = (id: string) => MOODS.find(m => m.id === id);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="section-title">🌙 Nhật Ký Cảm Xúc</h2>
        <p className="section-subtitle">Chia sẻ tâm trạng hàng ngày với người yêu</p>
      </div>

      {/* Today status */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* My mood */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)' }}><Avatar src={currentUser.avatar} size={20} /></span>
            {currentUser.name} — hôm nay
          </div>
          {myTodayMood ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 40 }}>{getMoodDef(myTodayMood.mood)?.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, color: getMoodDef(myTodayMood.mood)?.color }}>{getMoodDef(myTodayMood.mood)?.label}</div>
                {myTodayMood.note && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{myTodayMood.note}</div>}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>😶 Chưa cập nhật tâm trạng</div>
          )}
        </div>

        {/* Partner mood */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)' }}><Avatar src={partner?.avatar || '?'} size={20} /></span>
            {partner?.name || 'Người yêu'} — hôm nay
          </div>
          {partnerTodayMood ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 40 }}>{getMoodDef(partnerTodayMood.mood)?.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, color: getMoodDef(partnerTodayMood.mood)?.color }}>{getMoodDef(partnerTodayMood.mood)?.label}</div>
                {partnerTodayMood.note && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{partnerTodayMood.note}</div>}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>💭 Chưa cập nhật</div>
          )}
        </div>
      </div>

      {/* Update my mood */}
      {!saved && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tâm trạng của bạn hôm nay?</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {MOODS.map(m => (
              <button key={m.id} onClick={() => setSelectedMood(m.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: selectedMood === m.id ? `${m.color}22` : 'var(--bg-glass)',
                  border: selectedMood === m.id ? `1px solid ${m.color}` : '1px solid var(--border-glass)',
                  transition: 'var(--transition)', fontFamily: 'Inter, sans-serif',
                }}>
                <span style={{ fontSize: 28 }}>{m.emoji}</span>
                <span style={{ fontSize: 11, color: selectedMood === m.id ? m.color : 'var(--text-muted)' }}>{m.label}</span>
              </button>
            ))}
          </div>
          {selectedMood && (
            <>
              <input className="input-field" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Thêm ghi chú (tuỳ chọn)..." style={{ marginBottom: 14 }} />
              <button className="btn-primary" onClick={saveMood}>Lưu tâm trạng</button>
            </>
          )}
        </div>
      )}
      {saved && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24, borderColor: 'var(--pink-400)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <span style={{ fontSize: 14 }}>Đã lưu tâm trạng hôm nay!</span>
          <button className="btn-ghost" style={{ marginLeft: 'auto', fontSize: 13 }} onClick={() => setSaved(false)}>Thay đổi</button>
        </div>
      )}

      {/* 7-day history */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📊 7 ngày gần đây</h3>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {last7.map(date => {
            const myM = allMoods.find(m => m.userId === currentUser.id && m.date === date);
            const partnerM = partner ? allMoods.find(m => m.userId === partner.id && m.date === date) : null;
            const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short' });
            const isToday = date === today;
            return (
              <div key={date} style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: 11, color: isToday ? 'var(--pink-300)' : 'var(--text-muted)', marginBottom: 6, fontWeight: isToday ? 700 : 400 }}>
                  {isToday ? 'Hôm nay' : dayLabel}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }} title={currentUser.name}>{myM ? getMoodDef(myM.mood)?.emoji : '⬜'}</span>
                  <span style={{ fontSize: 22 }} title={partner?.name}>{partnerM ? getMoodDef(partnerM.mood)?.emoji : '⬜'}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)' }}><Avatar src={currentUser.avatar} size={16} /></span>
            {currentUser.name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {partner && <><span style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)' }}><Avatar src={partner.avatar} size={16} /></span>{partner.name}</>}
            {!partner && '?'}
          </span>
        </div>
      </div>
    </div>
  );
}
