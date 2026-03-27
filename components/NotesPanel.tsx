'use client';

import { useState } from 'react';
import { useNotes, mutators } from '@/lib/hooks';
import { notify } from '@/lib/notify';
import { formatDate, generateId } from '@/lib/utils';
import type { Note, UserProfile } from '@/lib/types';
import Avatar from '@/components/Avatar';

interface Props { currentUser: UserProfile; partner: UserProfile | null; }

const MOODS = ['❤️', '🥰', '😊', '🤭', '🥺', '😔', '🌙', '✨', '💭', '🔥'];

export default function NotesPanel({ currentUser, partner }: Props) {
  const notes = useNotes(currentUser.coupleId);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: '', content: '', mood: '❤️', isTimeCapsule: false, openDate: '' });

  const myNotes = notes.filter(n => n.fromUserId === currentUser.id);
  const partnerNotes = notes.filter(n => n.fromUserId !== currentUser.id);
  const displayed = tab === 'sent' ? myNotes : partnerNotes;

  const addNote = async () => {
    if (!form.title.trim() || !form.content.trim() || !currentUser.coupleId) return;
    const note: Note = {
      id: generateId(),
      fromUserId: currentUser.id,
      title: form.title.trim(),
      content: form.content.trim(),
      mood: form.mood,
      isTimeCapsule: form.isTimeCapsule,
      openDate: form.isTimeCapsule ? form.openDate : undefined,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    await mutators.addDoc(currentUser.coupleId, 'notes', note);
    notify(currentUser.coupleId, currentUser, 'note_add', `${currentUser.name} vừa gửi một ghi chú mới: “${note.mood} ${form.title.trim()}”`, 'notes');
    setForm({ title: '', content: '', mood: '❤️', isTimeCapsule: false, openDate: '' });
    setShowAdd(false);
  };

  const openNote = async (note: Note) => {
    // Mark as read
    if (note.fromUserId !== currentUser.id && !note.isRead && currentUser.coupleId) {
      await mutators.updateDoc(currentUser.coupleId, 'notes', note.id, { isRead: true });
    }
    setSelectedNote({ ...note, isRead: true });
  };

  const deleteNote = async (id: string) => {
    if (!currentUser.coupleId) return;
    await mutators.deleteDoc(currentUser.coupleId, 'notes', id);
    setSelectedNote(null);
  };

  const isLocked = (note: Note) => {
    if (!note.isTimeCapsule || !note.openDate) return false;
    return new Date(note.openDate) > new Date();
  };

  const fromName = (userId: string) =>
    userId === currentUser.id ? currentUser.name : (partner?.name || 'Người yêu');

  const fromAvatar = (userId: string) =>
    userId === currentUser.id ? currentUser.avatar : (partner?.avatar || '?');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">📝 Ghi Chú Yêu Thương</h2>
          <p className="section-subtitle">Những lời muốn nói, gửi vào bất kỳ lúc nào</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>✍️ Viết ghi chú</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-glass)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        {[
          { id: 'received', label: `📬 Nhận được (${partnerNotes.length})` },
          { id: 'sent',     label: `📤 Đã gửi (${myNotes.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'received' | 'sent')}
            style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
              background: tab === t.id ? 'var(--gradient-primary)' : 'transparent',
              border: 'none', color: tab === t.id ? 'white' : 'var(--text-secondary)',
              fontFamily: 'Inter, sans-serif', fontWeight: tab === t.id ? 600 : 400,
              transition: 'var(--transition)',
            }}>{t.label}</button>
        ))}
      </div>

      {/* Unread badge */}
      {tab === 'received' && partnerNotes.filter(n => !n.isRead).length > 0 && (
        <div className="badge" style={{ marginBottom: 16 }}>
          💌 {partnerNotes.filter(n => !n.isRead).length} ghi chú chưa đọc
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{tab === 'received' ? '📬' : '📤'}</div>
          <p>{tab === 'received' ? 'Chưa có ghi chú nào từ người yêu' : 'Bạn chưa gửi ghi chú nào'}</p>
        </div>
      ) : (
        <div className="grid-3">
          {displayed.map(note => (
            <div key={note.id} className="glass-card" onClick={() => openNote(note)}
              style={{
                padding: '18px 20px', cursor: 'pointer',
                borderColor: !note.isRead && note.fromUserId !== currentUser.id ? 'var(--pink-400)' : undefined,
                position: 'relative',
              }}>
              {!note.isRead && note.fromUserId !== currentUser.id && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--pink-400)',
                }} />
              )}
              {isLocked(note) && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,8,16,0.7)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontSize: 32 }}>🔒</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Mở ngày {formatDate(note.openDate!)}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 10 }}>{note.mood}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {note.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: 12 }}>
                {note.content}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span><Avatar src={fromAvatar(note.fromUserId)} size={16} /></span>
                <span>{fromName(note.fromUserId)}</span>
                <span style={{ marginLeft: 'auto' }}>{formatDate(note.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note detail modal */}
      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{selectedNote.mood}</div>
              <h3 className="playfair" style={{ fontSize: 22 }}>{selectedNote.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Từ {fromName(selectedNote.fromUserId)} · {formatDate(selectedNote.createdAt)}
              </div>
            </div>
            <div className="divider" />
            <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 20 }}>
              {selectedNote.content}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => deleteNote(selectedNote.id)}
                style={{ fontSize: 13, padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, cursor: 'pointer' }}>
                Xoá ghi chú
              </button>
              <button className="btn-primary" onClick={() => setSelectedNote(null)}>Đóng lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Add note modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <h3 className="playfair" style={{ fontSize: 22, marginBottom: 20 }}>✍️ Viết ghi chú</h3>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Tâm trạng</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {MOODS.map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, mood: m }))}
                    style={{
                      width: 40, height: 40, fontSize: 22, borderRadius: 10, cursor: 'pointer',
                      background: form.mood === m ? 'var(--gradient-card)' : 'var(--bg-glass)',
                      border: form.mood === m ? '1px solid var(--pink-400)' : '1px solid var(--border-glass)',
                    }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Tiêu đề</label>
              <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Lời yêu thương gửi đến em..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Nội dung</label>
              <textarea className="input-field" rows={5} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Viết những gì bạn muốn nói..." />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isTimeCapsule} onChange={e => setForm(f => ({ ...f, isTimeCapsule: e.target.checked }))} style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 14 }}>🔒 Time Capsule — đối phương chỉ đọc được sau ngày...</span>
              </label>
              {form.isTimeCapsule && (
                <input type="date" className="input-field" style={{ marginTop: 10 }}
                  value={form.openDate} onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Huỷ</button>
              <button className="btn-primary" onClick={addNote} style={{ flex: 1 }}>Gửi ghi chú 💌</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
