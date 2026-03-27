'use client';

import { useState } from 'react';
import { usePromises, mutators } from '@/lib/hooks';
import { notify } from '@/lib/notify';
import Avatar from '@/components/Avatar';
import { formatDate, generateId } from '@/lib/utils';
import type { Promise, UserProfile } from '@/lib/types';

interface Props { currentUser: UserProfile; partner: UserProfile | null; }

export default function PromisesPanel({ currentUser, partner }: Props) {
  const promises = usePromises(currentUser.coupleId);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');

  const addPromise = async () => {
    if (!newText.trim() || !currentUser.coupleId) return;
    const p: Promise = {
      id: generateId(), fromUserId: currentUser.id,
      text: newText.trim(), createdAt: new Date().toISOString(),
      isFulfilled: false,
    };
    await mutators.addDoc(currentUser.coupleId, 'promises', p);
    notify(currentUser.coupleId, currentUser, 'promise_add', `${currentUser.name} vừa thêm lời hứa mới: “${newText.trim()}”`, 'promises');
    setNewText(''); setShowAdd(false);
  };

  const toggleFulfill = async (p: Promise) => {
    if (!currentUser.coupleId) return;
    const willFulfill = !p.isFulfilled;
    await mutators.updateDoc(currentUser.coupleId, 'promises', p.id, { isFulfilled: willFulfill, fulfilledAt: willFulfill ? new Date().toISOString() : undefined });
    if (willFulfill) {
      notify(currentUser.coupleId, currentUser, 'promise_fulfill', `${currentUser.name} đã giữ lời hứa: “${p.text}” ✅`, 'promises');
    }
  };

  const deletePromise = async (id: string) => { 
    if (!currentUser.coupleId) return;
    await mutators.deleteDoc(currentUser.coupleId, 'promises', id);
  };

  const fromName = (uid: string) => uid === currentUser.id ? currentUser.name : (partner?.name || 'Người yêu');
  const fromAvatar = (uid: string) => uid === currentUser.id ? currentUser.avatar : (partner?.avatar || '?');

  const myPromises = promises.filter(p => p.fromUserId === currentUser.id);
  const partnerPromises = promises.filter(p => p.fromUserId !== currentUser.id);

  const PromiseCard = ({ p }: { p: Promise }) => (
    <div className="glass-card" style={{
      padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
      opacity: p.isFulfilled ? 0.7 : 1,
    }}>
      <button onClick={() => toggleFulfill(p)}
        style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 2,
          background: p.isFulfilled ? 'var(--gradient-primary)' : 'transparent',
          border: p.isFulfilled ? 'none' : '2px solid var(--border-glass)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, transition: 'var(--transition)',
        }}>
        {p.isFulfilled ? '✓' : ''}
      </button>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 15, fontWeight: 500, marginBottom: 6,
          textDecoration: p.isFulfilled ? 'line-through' : 'none',
          color: p.isFulfilled ? 'var(--text-muted)' : 'var(--text-primary)',
        }}>{p.text}</p>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar src={fromAvatar(p.fromUserId)} size={16} /> {fromName(p.fromUserId)}</span>
          <span>· {formatDate(p.createdAt)}</span>
          {p.isFulfilled && p.fulfilledAt && (
            <span style={{ color: '#22c55e' }}>· ✓ Đã giữ lời {formatDate(p.fulfilledAt)}</span>
          )}
        </div>
      </div>
      {p.fromUserId === currentUser.id && (
        <button className="btn-icon" onClick={() => deletePromise(p.id)}
          style={{ width: 28, height: 28, color: 'var(--rose-400)', fontSize: 13, flexShrink: 0 }}>✕</button>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">🤝 Lời Hứa Với Nhau</h2>
          <p className="section-subtitle">Ghi lại và giữ trọn những cam kết trong tình yêu</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Thêm lời hứa</button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Tổng lời hứa', value: promises.length, emoji: '🤝' },
          { label: 'Đã giữ được', value: promises.filter(p => p.isFulfilled).length, emoji: '✅' },
          { label: 'Còn hứa', value: promises.filter(p => !p.isFulfilled).length, emoji: '💭' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{s.emoji}</div>
            <div className="gradient-text" style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {promises.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <p>Chưa có lời hứa nào. Hãy bắt đầu bằng một cam kết nhỏ!</p>
        </div>
      ) : (
        <div>
          {myPromises.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)' }}><Avatar src={currentUser.avatar} size={18} /></span>
                Lời hứa của {currentUser.name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myPromises.map(p => <PromiseCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
          {partnerPromises.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)' }}><Avatar src={partner?.avatar || '?'} size={18} /></span> Lời hứa của {partner?.name || 'Người yêu'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {partnerPromises.map(p => <PromiseCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="playfair" style={{ fontSize: 22, marginBottom: 20 }}>🤝 Thêm lời hứa</h3>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Lời hứa của bạn</label>
              <textarea className="input-field" rows={4} value={newText} onChange={e => setNewText(e.target.value)}
                placeholder="VD: Anh hứa sẽ luôn lắng nghe em..." autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Huỷ</button>
              <button className="btn-primary" onClick={addPromise} style={{ flex: 1 }}>Lưu lời hứa 🤝</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
