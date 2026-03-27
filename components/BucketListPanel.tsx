'use client';

import { useState } from 'react';
import { useBucketList, mutators } from '@/lib/hooks';
import { notify } from '@/lib/notify';
import { generateId } from '@/lib/utils';
import type { BucketItem, UserProfile } from '@/lib/types';

interface Props { currentUser: UserProfile; partner: UserProfile | null; }

const CATEGORIES = [
  { id: 'all',       label: 'Tất cả',    emoji: '✨' },
  { id: 'travel',    label: 'Du lịch',   emoji: '✈️' },
  { id: 'food',      label: 'Ẩm thực',   emoji: '🍜' },
  { id: 'adventure', label: 'Phiêu lưu', emoji: '🏔️' },
  { id: 'romance',   label: 'Lãng mạn',  emoji: '💕' },
  { id: 'other',     label: 'Khác',      emoji: '🌟' },
] as const;

type FilterType = 'all' | 'done' | 'todo';

export default function BucketListPanel({ currentUser, partner }: Props) {
  const items = useBucketList(currentUser.coupleId);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<BucketItem['category']>('other');
  const [filter, setFilter] = useState<FilterType>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);

  const addItem = async () => {
    if (!newText.trim() || !currentUser.coupleId) return;
    const item: BucketItem = {
      id: generateId(), text: newText.trim(),
      addedBy: currentUser.id, addedAt: new Date().toISOString(),
      category: newCategory,
    };
    await mutators.addDoc(currentUser.coupleId, 'bucketList', item);
    notify(currentUser.coupleId, currentUser, 'bucket_add', `${currentUser.name} vừa thêm: “${newText.trim()}” vào danh sách 100 điều muốn làm`, 'bucket-list');
    setNewText(''); setShowAdd(false);
  };

  const toggleComplete = async (item: BucketItem) => {
    if (!currentUser.coupleId) return;
    const updated = { ...item, completedAt: item.completedAt ? undefined : new Date().toISOString() };
    await mutators.updateDoc(currentUser.coupleId, 'bucketList', item.id, updated);
    if (!item.completedAt) {
      notify(currentUser.coupleId, currentUser, 'bucket_complete', `${currentUser.name} vừa hoàn thành: “${item.text}” 🎉`, 'bucket-list');
    }
  };

  const deleteItem = async (id: string) => { 
    if (!currentUser.coupleId) return;
    await mutators.deleteDoc(currentUser.coupleId, 'bucketList', id); 
  };

  const getUserAvatar = (userId: string) => {
    if (userId === currentUser.id) return currentUser.avatar;
    return partner?.avatar || '?';
  };

  let displayed = items;
  if (filter === 'done') displayed = displayed.filter(i => i.completedAt);
  if (filter === 'todo') displayed = displayed.filter(i => !i.completedAt);
  if (catFilter !== 'all') displayed = displayed.filter(i => i.category === catFilter);

  const total = items.length;
  const done = items.filter(i => i.completedAt).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">✨ 100 Điều Muốn Làm</h2>
          <p className="section-subtitle">Cùng nhau lên kế hoạch cho những trải nghiệm tuyệt vời</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Thêm điều ước</button>
      </div>

      {/* Progress */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Tiến độ hoàn thành</span>
          <span className="gradient-text" style={{ fontWeight: 700, fontSize: 16 }}>{done}/{total}</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-glass)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${percent}%`,
            background: 'var(--gradient-primary)', borderRadius: 99,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{percent}% đã hoàn thành 🎉</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'todo', 'done'] as FilterType[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 99, fontSize: 13, cursor: 'pointer',
              background: filter === f ? 'var(--gradient-primary)' : 'var(--bg-glass)',
              border: filter === f ? 'none' : '1px solid var(--border-glass)',
              color: filter === f ? 'white' : 'var(--text-secondary)',
              fontFamily: 'Inter, sans-serif',
            }}>
            {f === 'all' ? 'Tất cả' : f === 'done' ? '✅ Đã làm' : '⏳ Chưa làm'}
          </button>
        ))}
        <div style={{ width: 1, background: 'var(--border-glass)', margin: '0 4px' }} />
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCatFilter(c.id)}
            style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer',
              background: catFilter === c.id ? 'var(--gradient-card)' : 'transparent',
              border: catFilter === c.id ? '1px solid var(--border-pink)' : '1px solid var(--border-glass)',
              color: catFilter === c.id ? 'var(--pink-300)' : 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌟</div>
          <p>Chưa có điều gì trong danh sách này</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map((item, idx) => (
            <div key={item.id} className="glass-card"
              style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                opacity: item.completedAt ? 0.65 : 1, animation: 'fadeInUp 0.3s ease',
              }}>
              <button onClick={() => toggleComplete(item)}
                style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: item.completedAt ? 'var(--gradient-primary)' : 'transparent',
                  border: item.completedAt ? 'none' : '2px solid var(--border-glass)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 14, transition: 'var(--transition)',
                }}>
                {item.completedAt ? '✓' : ''}
              </button>

              <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 24, textAlign: 'center' }}>
                {idx + 1}
              </span>

              <span style={{
                flex: 1, fontSize: 15, fontWeight: 500,
                textDecoration: item.completedAt ? 'line-through' : 'none',
                color: item.completedAt ? 'var(--text-muted)' : 'var(--text-primary)',
              }}>
                {item.text}
              </span>

              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {CATEGORIES.find(c => c.id === item.category)?.emoji}
              </span>

              <span style={{ fontSize: 18, flexShrink: 0 }} title={item.addedBy === currentUser.id ? currentUser.name : partner?.name}>
                {getUserAvatar(item.addedBy)}
              </span>

              <button className="btn-icon" onClick={() => deleteItem(item.id)}
                style={{ width: 32, height: 32, color: 'var(--rose-400)', fontSize: 14, flexShrink: 0 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="playfair" style={{ fontSize: 22, marginBottom: 20 }}>✨ Thêm điều muốn làm</h3>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Nội dung</label>
              <input className="input-field" value={newText} onChange={e => setNewText(e.target.value)}
                placeholder="VD: Cùng nhau xem bình minh..." autoFocus
                onKeyDown={e => e.key === 'Enter' && addItem()} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Danh mục</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <button key={c.id} onClick={() => setNewCategory(c.id as BucketItem['category'])}
                    style={{
                      padding: '7px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer',
                      background: newCategory === c.id ? 'var(--gradient-primary)' : 'var(--bg-glass)',
                      border: newCategory === c.id ? 'none' : '1px solid var(--border-glass)',
                      color: newCategory === c.id ? 'white' : 'var(--text-secondary)',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Huỷ</button>
              <button className="btn-primary" onClick={addItem} style={{ flex: 1 }}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
