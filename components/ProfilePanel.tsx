 'use client';

import { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, uploadImageString } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';

interface Props {
  currentUser: UserProfile;
  partner: UserProfile | null;
  onUpdate: (updated: UserProfile) => void;
}

const LOVE_LANGUAGES = [
  { id: 'words', emoji: '💬', label: 'Lời nói yêu thương', desc: 'Lời khen, lời động viên, "anh/em yêu em/anh"' },
  { id: 'acts',  emoji: '🛠️', label: 'Hành động quan tâm', desc: 'Làm việc giúp đỡ, chăm lo không cần nói' },
  { id: 'gifts', emoji: '🎁', label: 'Quà tặng',           desc: 'Những món quà nhỏ thể hiện sự quan tâm' },
  { id: 'time',  emoji: '⏰', label: 'Thời gian bên nhau', desc: 'Chất lượng thời gian dành cho nhau' },
  { id: 'touch', emoji: '🤗', label: 'Tiếp xúc thể chất',  desc: 'Nắm tay, ôm, những cử chỉ âu yếm' },
] as const;

const AVATAR_EMOJIS = [
  '🐱','🐰','🦊','🐼','🐨','🐸','🦋','🌸','🌺','🌻','🍀','⭐',
  '🦄','🐙','🦭','🐧','🐝','🦚','🌙','☀️','🍓','🍑','🎠','💎',
  '👸','🤴','🧚','🧜','🦸','🎭','🌈','🔮','🪄','💫','🫧','🌊',
];

function isImageAvatar(avatar: string) {
  return avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('/');
}

/** Render avatar — handles both emoji and image */
function AvatarDisplay({ avatar, size = 80 }: { avatar: string; size?: number }) {
  if (isImageAvatar(avatar)) {
    return (
      <img src={avatar} alt="avatar"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
    );
  }
  return <span style={{ fontSize: size * 0.56, lineHeight: 1 }}>{avatar}</span>;
}

/** Compress image to small avatar size */
function compressAvatar(dataUrl: string, size = 240): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      // Crop to square center
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = dataUrl;
  });
}

function getZodiac(birthday: string): string {
  const d = new Date(birthday);
  const m = d.getMonth() + 1, day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return '♈ Bạch Dương';
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return '♉ Kim Ngưu';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return '♊ Song Tử';
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return '♋ Cự Giải';
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return '♌ Sư Tử';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return '♍ Xử Nữ';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return '♎ Thiên Bình';
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return '♏ Bọ Cạp';
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return '♐ Nhân Mã';
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return '♑ Ma Kết';
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return '♒ Bảo Bình';
  return '♓ Song Ngư';
}

function getAge(birthday: string): number {
  const today = new Date(), birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

function ProfileCard({ user, isMe, onEdit }: { user: UserProfile; isMe: boolean; onEdit?: () => void }) {
  const ll = LOVE_LANGUAGES.find(l => l.id === user.loveLanguage);
  const hobbies = user.hobbies ? user.hobbies.split(',').map(h => h.trim()).filter(Boolean) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Avatar + Name */}
      <div className="glass-card" style={{ padding: '28px 24px', textAlign: 'center', position: 'relative' }}>
        {isMe && onEdit && (
          <button className="btn-ghost" onClick={onEdit}
            style={{ position: 'absolute', top: 16, right: 16, fontSize: 13, padding: '6px 14px' }}>
            ✏️ Chỉnh sửa
          </button>
        )}

        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 16px',
          background: 'var(--gradient-card)', border: '2px solid var(--border-pink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(255,77,136,0.2)', overflow: 'hidden',
        }}>
          <AvatarDisplay avatar={user.avatar} size={96} />
        </div>

        <h2 className="playfair" style={{ fontSize: 26, margin: 0 }}>{user.name}</h2>
        {user.nickname && (
          <p style={{ fontSize: 14, color: 'var(--pink-300)', marginTop: 4 }}>"{user.nickname}"</p>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{user.email}</p>

        {user.birthday && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <span className="badge">🎂 {formatDate(user.birthday)}</span>
            <span className="badge">{getAge(user.birthday)} tuổi</span>
            <span className="badge">{getZodiac(user.birthday)}</span>
          </div>
        )}
      </div>

      {user.bio && (
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>💭 Giới thiệu</div>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{user.bio}</p>
        </div>
      )}

      {ll && (
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>💕 Ngôn ngữ tình yêu</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 36 }}>{ll.emoji}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{ll.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{ll.desc}</div>
            </div>
          </div>
        </div>
      )}

      {hobbies.length > 0 && (
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🎯 Sở thích</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hobbies.map((h, i) => (
              <span key={i} style={{ padding: '6px 14px', borderRadius: 99, background: 'var(--bg-glass)', border: '1px solid var(--border-pink)', fontSize: 13, color: 'var(--pink-300)' }}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {user.quote && (
        <div className="glass-card" style={{ padding: '20px 24px', borderColor: 'var(--border-pink)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>✨ Câu nói yêu thích</div>
          <p className="playfair" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--pink-300)', margin: 0, lineHeight: 1.6 }}>
            "{user.quote}"
          </p>
        </div>
      )}

      {!user.bio && !ll && hobbies.length === 0 && !user.quote && (
        <div className="empty-state">
          <div className="empty-icon">🌸</div>
          <p>{isMe ? 'Thêm thông tin cá nhân của bạn!' : 'Người yêu chưa cập nhật thông tin.'}</p>
        </div>
      )}
    </div>
  );
}

export default function ProfilePanel({ currentUser, partner, onUpdate }: Props) {
  const [tab, setTab] = useState<'me' | 'partner'>('me');
  const [editing, setEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [form, setForm] = useState({
    name: currentUser.name,
    nickname: currentUser.nickname || '',
    avatar: currentUser.avatar,
    birthday: currentUser.birthday || '',
    bio: currentUser.bio || '',
    hobbies: currentUser.hobbies || '',
    loveLanguage: currentUser.loveLanguage || '' as UserProfile['loveLanguage'] | '',
    quote: currentUser.quote || '',
  });
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setEditing(true); // force editing state lock? actually just show loader here if needed
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressAvatar(reader.result as string);
        const path = `users/${currentUser.id}/avatar`;
        // Since we don't have a loading state yet, let's just upload directly
        // User could click save early though. Let's do it inside saveProfile!
        // No, let's keep it here so they preview it, and upload right away. Wait, they might cancel!
        setForm(f => ({ ...f, avatar: compressed }));
        setShowEmojiPicker(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = () => {
    setForm({
      name: currentUser.name,
      nickname: currentUser.nickname || '',
      avatar: currentUser.avatar,
      birthday: currentUser.birthday || '',
      bio: currentUser.bio || '',
      hobbies: currentUser.hobbies || '',
      loveLanguage: currentUser.loveLanguage || '',
      quote: currentUser.quote || '',
    });
    setShowEmojiPicker(false);
    setEditing(true);
  };

  const [isSaving, setIsSaving] = useState(false);
  const saveProfile = async () => {
    setIsSaving(true);
    try {
      let finalAvatar = form.avatar;
      
      // If the avatar is a new base64 string, upload it to Storage
      // base64 strings from compressAvatar start with "data:image/"
      if (finalAvatar.startsWith('data:image/')) {
        const path = `users/${currentUser.id}/avatar_${Date.now()}`;
        finalAvatar = await uploadImageString(path, finalAvatar);
      }

      const updated: Partial<UserProfile> = {
        name: form.name.trim() || currentUser.name,
        nickname: form.nickname.trim() || '',
        avatar: finalAvatar,
      birthday: form.birthday || '',
      bio: form.bio.trim() || '',
      hobbies: form.hobbies.trim() || '',
      loveLanguage: (form.loveLanguage as UserProfile['loveLanguage']) || undefined,
      quote: form.quote.trim() || '',
    };
    
      // strip undefined
      Object.keys(updated).forEach(k => updated[k as keyof UserProfile] === undefined && delete updated[k as keyof UserProfile]);

      await updateDoc(doc(db, 'users', currentUser.id), updated);
      onUpdate({ ...currentUser, ...updated });
      setEditing(false);
    } catch (error: any) {
      console.error(error);
      alert("❌ Lưu thất bại: " + (error.message || "Không rõ nguyên nhân. Hãy kiểm tra lại kết nối mạng hoặc kho lưu trữ Firebase."));
    } finally {
      setIsSaving(false);
    }
  };

  const TabLabel = ({ user }: { user: UserProfile }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.08)', fontSize: 14, flexShrink: 0,
      }}>
        <AvatarDisplay avatar={user.avatar} size={22} />
      </span>
      {user.name}
    </span>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="section-title">👤 Hồ Sơ Cá Nhân</h2>
        <p className="section-subtitle">Thông tin về bạn và người yêu của bạn</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-glass)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        <button onClick={() => setTab('me')} style={{
          padding: '8px 20px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
          background: tab === 'me' ? 'var(--gradient-primary)' : 'transparent',
          border: 'none', color: tab === 'me' ? 'white' : 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif', fontWeight: tab === 'me' ? 600 : 400, transition: 'var(--transition)',
        }}>
          <TabLabel user={currentUser} />
        </button>
        {partner && (
          <button onClick={() => setTab('partner')} style={{
            padding: '8px 20px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
            background: tab === 'partner' ? 'var(--gradient-primary)' : 'transparent',
            border: 'none', color: tab === 'partner' ? 'white' : 'var(--text-secondary)',
            fontFamily: 'Inter, sans-serif', fontWeight: tab === 'partner' ? 600 : 400, transition: 'var(--transition)',
          }}>
            <TabLabel user={partner} />
          </button>
        )}
      </div>

      {tab === 'me' ? (
        <ProfileCard user={currentUser} isMe onEdit={openEdit} />
      ) : (
        partner
          ? <ProfileCard user={partner} isMe={false} />
          : <div className="empty-state"><div className="empty-icon">💌</div><p>Chưa có người yêu trong app!</p></div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="playfair" style={{ fontSize: 22, marginBottom: 20 }}>✏️ Chỉnh sửa hồ sơ</h3>

            {/* ── Avatar section ── */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {/* Preview */}
              <div style={{
                width: 90, height: 90, borderRadius: '50%', margin: '0 auto 12px',
                background: 'var(--gradient-card)', border: '2px solid var(--border-pink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(255,77,136,0.2)', overflow: 'hidden',
                cursor: 'pointer', transition: 'transform 0.2s',
              }}
                onClick={() => avatarFileRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Click để tải ảnh lên"
              >
                <AvatarDisplay avatar={form.avatar} size={90} />
              </div>

              {/* Upload / Emoji buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}
                  onClick={() => avatarFileRef.current?.click()}>
                  📷 Tải ảnh lên
                </button>
                <button className="btn-ghost" style={{ fontSize: 13, padding: '7px 16px' }}
                  onClick={() => setShowEmojiPicker(v => !v)}>
                  😊 Chọn emoji
                </button>
                {isImageAvatar(form.avatar) && (
                  <button className="btn-ghost" style={{ fontSize: 13, padding: '7px 16px', color: 'var(--rose-400)' }}
                    onClick={() => setForm(f => ({ ...f, avatar: '🐱' }))}>
                    ✕ Xoá ảnh
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />

              {/* Emoji picker */}
              {showEmojiPicker && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12, padding: 12, background: 'var(--bg-glass)', borderRadius: 12 }}>
                  {AVATAR_EMOJIS.map(e => (
                    <button key={e} onClick={() => { setForm(f => ({ ...f, avatar: e })); setShowEmojiPicker(false); }}
                      style={{
                        width: 40, height: 40, fontSize: 22, borderRadius: 10, cursor: 'pointer',
                        background: form.avatar === e ? 'var(--gradient-card)' : 'transparent',
                        border: form.avatar === e ? '1px solid var(--pink-400)' : '1px solid transparent',
                      }}>{e}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Name & Nickname */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Tên</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên của bạn" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Tên gọi thân mật</label>
                <input className="input-field" value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder='VD: "Mèo béo"' />
              </div>
            </div>

            {/* Birthday */}
            <div style={{ marginBottom: 14 }}>
              <label className="label">Ngày sinh</label>
              <input type="date" className="input-field" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)} />
              {form.birthday && (
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pink-300)' }}>
                  {getAge(form.birthday)} tuổi · {getZodiac(form.birthday)}
                </div>
              )}
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 14 }}>
              <label className="label">Giới thiệu bản thân</label>
              <textarea className="input-field" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Kể một chút về bản thân bạn..." />
            </div>

            {/* Hobbies */}
            <div style={{ marginBottom: 14 }}>
              <label className="label">Sở thích <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(phân cách bởi dấu phẩy)</span></label>
              <input className="input-field" value={form.hobbies} onChange={e => setForm(f => ({ ...f, hobbies: e.target.value }))}
                placeholder="VD: Nghe nhạc, Cà phê, Du lịch, Nấu ăn" />
              {form.hobbies && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {form.hobbies.split(',').map(h => h.trim()).filter(Boolean).map((h, i) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: 99, background: 'var(--bg-glass)', border: '1px solid var(--border-pink)', fontSize: 12, color: 'var(--pink-300)' }}>{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Love language */}
            <div style={{ marginBottom: 14 }}>
              <label className="label">Ngôn ngữ tình yêu</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LOVE_LANGUAGES.map(ll => (
                  <button key={ll.id} onClick={() => setForm(f => ({ ...f, loveLanguage: f.loveLanguage === ll.id ? '' : ll.id }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: form.loveLanguage === ll.id ? 'rgba(255,77,136,0.1)' : 'var(--bg-glass)',
                      border: form.loveLanguage === ll.id ? '1px solid var(--pink-400)' : '1px solid var(--border-glass)',
                      fontFamily: 'Inter, sans-serif', transition: 'var(--transition)',
                    }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{ll.emoji}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: form.loveLanguage === ll.id ? 'var(--pink-300)' : 'var(--text-primary)' }}>{ll.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ll.desc}</div>
                    </div>
                    {form.loveLanguage === ll.id && <span style={{ marginLeft: 'auto', color: 'var(--pink-400)', fontSize: 18 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Quote */}
            <div style={{ marginBottom: 24 }}>
              <label className="label">Câu nói yêu thích</label>
              <textarea className="input-field" rows={2} value={form.quote} onChange={e => setForm(f => ({ ...f, quote: e.target.value }))}
                placeholder='VD: "Tình yêu không phải là nhìn nhau, mà là cùng nhìn về một hướng"' />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex: 1 }} disabled={isSaving}>Huỷ</button>
              <button className="btn-primary" onClick={saveProfile} style={{ flex: 2, opacity: isSaving ? 0.7 : 1 }} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : '💾 Lưu hồ sơ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
