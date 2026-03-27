'use client';

import { useState } from 'react';
import { useAnniversaries, mutators } from '@/lib/hooks';
import { notify } from '@/lib/notify';
import { formatDate, generateId } from '@/lib/utils';
import type { Anniversary, CoupleData, UserProfile } from '@/lib/types';

interface Props { couple: CoupleData | null; currentUser: UserProfile; onRefresh?: () => void; }

const EMOJIS = ['💕', '🎂', '🎉', '💍', '🌹', '🏖️', '✈️', '🎵', '🌙', '⭐', '🥂', '🎁'];
const COLORS = ['#ff4d88', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function getNextOccurrence(dateStr: string, recurring: boolean): Date {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!recurring) return new Date(dateStr);
  const [, month, day] = dateStr.split('-').map(Number);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  if (thisYear >= today) return thisYear;
  return new Date(today.getFullYear() + 1, month - 1, day);
}

function daysUntil(dateStr: string, recurring: boolean): number {
  const next = getNextOccurrence(dateStr, recurring);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AnniversaryPanel({ couple, currentUser, onRefresh }: Props) {
  const items = useAnniversaries(couple?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', isRecurring: true, emoji: '💕', color: '#ff4d88' });

  const addItem = async () => {
    if (!form.title.trim() || !form.date || !couple || !couple.id) return;
    const ann: Anniversary = {
      id: generateId(),
      title: form.title.trim(),
      date: form.date,
      isRecurring: form.isRecurring,
      emoji: form.emoji, color: form.color,
    };
    await mutators.addDoc(couple.id, 'anniversaries', ann);
    notify(couple.id, currentUser, 'anniversary_add', `${currentUser.name} vừa thêm ngày kỷ niệm: ${form.emoji} “${form.title.trim()}”`, 'anniversaries');
    
    setForm({ title: '', date: '', isRecurring: true, emoji: '💕', color: '#ff4d88' });
    setShowAdd(false);
  };

  const deleteItem = async (id: string) => {
    if (!couple || !couple.id) return;
    await mutators.deleteDoc(couple.id, 'anniversaries', id);
  };

  const sorted = [...items].sort((a, b) => daysUntil(a.date, a.isRecurring) - daysUntil(b.date, b.isRecurring));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">📅 Ngày Kỷ Niệm</h2>
          <p className="section-subtitle">Không bao giờ quên những dịp quan trọng</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Thêm sự kiện</button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>Chưa có sự kiện nào. Hãy thêm ngày kỷ niệm đầu tiên!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(ann => {
            const days = daysUntil(ann.date, ann.isRecurring);
            const next = getNextOccurrence(ann.date, ann.isRecurring);
            const isToday = days === 0;
            const isSoon = days <= 7 && days > 0;

            return (
              <div key={ann.id} className="glass-card"
                style={{
                  padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16,
                  borderColor: isToday ? ann.color : undefined,
                  boxShadow: isToday ? `0 0 20px ${ann.color}33` : undefined,
                }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-md)',
                  background: `${ann.color}22`, border: `1px solid ${ann.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0,
                }}>
                  {ann.emoji}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 3 }}>{ann.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {formatDate(next)}
                    {ann.isRecurring && <span style={{ marginLeft: 8, opacity: 0.7 }}>· hàng năm</span>}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  {isToday ? (
                    <div style={{ background: `${ann.color}33`, border: `1px solid ${ann.color}`, padding: '6px 14px', borderRadius: 99, color: ann.color, fontSize: 13, fontWeight: 700 }}>
                      🎉 Hôm nay!
                    </div>
                  ) : isSoon ? (
                    <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', padding: '6px 14px', borderRadius: 99, color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>
                      ⏰ {days} ngày nữa
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '6px 14px', borderRadius: 99, color: 'var(--text-muted)', fontSize: 13 }}>
                      {days} ngày nữa
                    </div>
                  )}
                </div>

                <button className="btn-icon" onClick={() => deleteItem(ann.id)}
                  style={{ color: 'var(--rose-400)', flexShrink: 0, width: 32, height: 32, fontSize: 14 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="playfair" style={{ fontSize: 22, marginBottom: 20 }}>📅 Thêm sự kiện</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Tên sự kiện</label>
              <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Ngày chúng mình quen nhau..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Ngày</label>
              <input type="date" className="input-field" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>🔄 Nhắc lại hàng năm</span>
              </label>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Biểu tượng</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    style={{ width: 40, height: 40, fontSize: 22, borderRadius: 10, cursor: 'pointer', background: form.emoji === e ? 'var(--gradient-card)' : 'var(--bg-glass)', border: form.emoji === e ? '1px solid var(--pink-400)' : '1px solid var(--border-glass)' }}>{e}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Màu sắc</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Huỷ</button>
              <button className="btn-primary" onClick={addItem} style={{ flex: 1 }}>Lưu sự kiện</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
