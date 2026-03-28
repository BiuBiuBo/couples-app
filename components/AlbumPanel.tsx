'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAlbums, mutators } from '@/lib/hooks';
import { notify } from '@/lib/notify';
import { useToast } from '@/providers/ToastProvider';
import { generateId, uploadImageString } from '@/lib/utils';
import type { Album, Photo, UserProfile } from '@/lib/types';

interface Props { currentUser: UserProfile; }

export default function AlbumPanel({ currentUser }: Props) {
  const albums = useAlbums(currentUser.coupleId);
  const toast = useToast();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const selectedAlbum = useMemo(() => albums.find(a => a.id === selectedAlbumId) || null, [albums, selectedAlbumId]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumEmoji, setNewAlbumEmoji] = useState('📸');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingCaption, setEditingCaption] = useState<{ photoId: string; value: string } | null>(null);
  // Pending upload queue: show caption modal before saving
  const [uploadQueue, setUploadQueue] = useState<{ url: string }[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, currentIndex: number, total: number) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe Left -> Next
        setEditingCaption(null);
        setLightboxIndex((currentIndex + 1) % total);
      } else {
        // Swipe Right -> Prev
        setEditingCaption(null);
        setLightboxIndex((currentIndex - 1 + total) % total);
      }
    }
    setTouchStartX(null);
  };
  const captionInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSaveName = async () => {
    if (!selectedAlbum || !editNameValue.trim() || !currentUser.coupleId) {
      setIsEditingName(false);
      return;
    }
    const updated = { ...selectedAlbum, name: editNameValue.trim() };
    await mutators.updateDoc(currentUser.coupleId, 'albums', updated.id, updated);
    setIsEditingName(false);
  };

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [lightboxIndex]);

  const saveCaption = async (photoId: string, caption: string) => {
    if (!selectedAlbum || !currentUser.coupleId) return;
    const updatedAlbum = {
      ...selectedAlbum,
      photos: selectedAlbum.photos.map(p => p.id === photoId ? { ...p, caption: caption.trim() } : p),
    };
    await mutators.updateDoc(currentUser.coupleId, 'albums', updatedAlbum.id, updatedAlbum);
    setEditingCaption(null);
  };

  const EMOJIS = ['📸', '🌸', '🏖️', '🌙', '🎉', '🍜', '✈️', '🏔️', '🎵', '💕', '🌺', '☕'];

  const createAlbum = async () => {
    if (!newAlbumName.trim() || !currentUser.coupleId) return;
    const album: Album = {
      id: generateId(), name: newAlbumName.trim(),
      coverEmoji: newAlbumEmoji, createdAt: new Date().toISOString(), photos: [],
    };
    await mutators.addDoc(currentUser.coupleId, 'albums', album);
    setNewAlbumName(''); setShowNewAlbum(false);
    toast.success('Đã tạo album mới thành công! 📁✨');
  };

  /** Compress image via Canvas before storing in localStorage */
  const compressImage = (dataUrl: string, maxPx = 900, quality = 0.72): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!selectedAlbum || !files.length) return;
    // Bỏ qua nén ảnh, giữ nguyên chất lượng gốc (Original Quality)
    const promises = files.map(file => new Promise<string>(resolve => {
      const reader = new FileReader();
      // Gửi thẳng file gốc dưới dạng DataURL để Cloudinary xử lý
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then(urls => {
      setUploadQueue(urls.map(url => ({ url })));
      setUploadCaption('');
    });
    e.target.value = '';
  };

  const handleSaveUploadedPhoto = async () => {
    if (!selectedAlbum || uploadQueue.length === 0 || !currentUser.coupleId || isUploading) return;
    setIsUploading(true);
    const [current, ...rest] = uploadQueue;
    try {
      const pid = generateId();
      const storagePath = `couples/${currentUser.coupleId}/albums/${selectedAlbum.id}/${pid}`;
      const downloadUrl = await uploadImageString(storagePath, current.url);
      
      const photo: Photo = {
        id: pid, albumId: selectedAlbum.id,
        url: downloadUrl, caption: uploadCaption.trim(),
        uploadedBy: currentUser.id, uploadedAt: new Date().toISOString(),
      };
      const latestAlbum = albums.find(a => a.id === selectedAlbum.id) || selectedAlbum;
      await mutators.updateDoc(currentUser.coupleId, 'albums', selectedAlbum.id, { ...latestAlbum, photos: [...latestAlbum.photos, photo] });
      notify(currentUser.coupleId, currentUser, 'photo_add', `${currentUser.name} vừa thêm ảnh mới vào album “${selectedAlbum.name}”`, 'albums');
      setUploadQueue(rest);
      setUploadCaption('');
      toast.success('Đã tải ảnh lên thành công! 📸');
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi khi tải ảnh: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipUploadedPhoto = async () => {
    if (!selectedAlbum || uploadQueue.length === 0 || !currentUser.coupleId || isUploading) return;
    setIsUploading(true);
    const [current, ...rest] = uploadQueue;
    try {
      const pid = generateId();
      const storagePath = `couples/${currentUser.coupleId}/albums/${selectedAlbum.id}/${pid}`;
      const downloadUrl = await uploadImageString(storagePath, current.url);
      
      const photo: Photo = {
        id: pid, albumId: selectedAlbum.id,
        url: downloadUrl, caption: '',
        uploadedBy: currentUser.id, uploadedAt: new Date().toISOString(),
      };
      const latestAlbum = albums.find(a => a.id === selectedAlbum.id) || selectedAlbum;
      await mutators.updateDoc(currentUser.coupleId, 'albums', selectedAlbum.id, { ...latestAlbum, photos: [...latestAlbum.photos, photo] });
      setUploadQueue(rest);
      setUploadCaption('');
      toast.success('Đã tải ảnh lên thành công! 📸');
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi tải ảnh: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAlbum = async (id: string) => {
    if (!currentUser.coupleId) return;
    const album = albums.find(a => a.id === id);
    await mutators.deleteDoc(currentUser.coupleId, 'albums', id);
    if (album) notify(currentUser.coupleId, currentUser, 'album_delete', `${currentUser.name} đã xóa album “${album.coverEmoji} ${album.name}”`);
    setSelectedAlbumId(null);
    toast.info('Đã xóa album kỷ niệm.');
  };

  const deletePhoto = async (photoId: string) => {
    if (!selectedAlbum || !currentUser.coupleId) return;
    const updated = { ...selectedAlbum, photos: selectedAlbum.photos.filter(p => p.id !== photoId) };
    await mutators.updateDoc(currentUser.coupleId, 'albums', selectedAlbum.id, updated);
    notify(currentUser.coupleId, currentUser, 'photo_delete', `${currentUser.name} đã xóa một ảnh khỏi album “${selectedAlbum.name}”`);
    setLightboxIndex(null);
    toast.info('Đã xóa ảnh kỷ niệm.');
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || !selectedAlbum) return;
      if (e.key === 'ArrowRight') setLightboxIndex((lightboxIndex + 1) % selectedAlbum.photos.length);
      if (e.key === 'ArrowLeft') setLightboxIndex((lightboxIndex - 1 + selectedAlbum.photos.length) % selectedAlbum.photos.length);
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, selectedAlbum]);

  // Alternating slight tilts for natural polaroid feel (no overlap)
  const transforms3D = useMemo(() => {
    if (!selectedAlbum) return [];
    return selectedAlbum.photos.map((_, i) => ({
      rotateZ: (i % 4 === 0 ? -2.5 : i % 4 === 1 ? 1.5 : i % 4 === 2 ? -1 : 2) as number,
      animDelay: (i % 5) * 0.4,
      animDuration: 3 + (i % 3) * 0.8,
    }));
  }, [selectedAlbum?.photos.length]);

  // Album list view
  if (!selectedAlbum) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">📸 Album Kỷ Niệm</h2>
          <p className="section-subtitle">Lưu giữ từng khoảnh khắc theo những chủ đề riêng</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewAlbum(true)}>+ Tạo album</button>
      </div>

      {albums.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <p>Chưa có album nào. Hãy tạo album đầu tiên để bắt đầu lưu giữ kỷ niệm!</p>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 20 }}>
          {albums.map(album => (
            <div key={album.id} className="glass-card" onClick={() => setSelectedAlbumId(album.id)}
              style={{
                padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'var(--transition)',
                transform: 'translateY(0)', border: '1px solid var(--border-glass)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border-pink)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-glass)'; }}
            >
              {/* Cover */}
              <div style={{
                height: 180, background: 'linear-gradient(135deg, rgba(255,77,136,0.1) 0%, rgba(192,132,252,0.1) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72,
                position: 'relative',
              }}>
                {album.photos.length > 0 ? (
                  <>
                    <img src={album.photos[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.8 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
                  </>
                ) : null}
                <span style={{
                  position: 'relative', zIndex: 1,
                  filter: album.photos.length > 0 ? 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 10px rgba(255,77,136,0.3))'
                }}>
                  {album.coverEmoji}
                </span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: 'var(--text-primary)' }}>{album.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{album.photos.length} bức ảnh</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New album modal */}
      {showNewAlbum && (
        <div className="modal-overlay" onClick={() => setShowNewAlbum(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 className="playfair" style={{ fontSize: 24, marginBottom: 20 }}>✨ Tạo album mới</h3>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Tên bộ sưu tập</label>
              <input className="input-field" value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)}
                placeholder="VD: Chuyến du lịch Hội An..." onKeyDown={e => e.key === 'Enter' && createAlbum()} autoFocus />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label className="label">Biểu tượng</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewAlbumEmoji(e)}
                    style={{
                      width: 48, height: 48, fontSize: 26, background: newAlbumEmoji === e ? 'var(--gradient-card)' : 'var(--bg-glass)',
                      border: newAlbumEmoji === e ? '2px solid var(--pink-400)' : '1px solid var(--border-glass)',
                      borderRadius: 12, cursor: 'pointer', transition: 'var(--transition)'
                    }}>{e}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowNewAlbum(false)} style={{ flex: 1 }}>Huỷ</button>
              <button className="btn-primary" onClick={createAlbum} style={{ flex: 1 }}>Tạo ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Album detail view
  return (
    <div className="space-galaxy-bg" style={{ minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
      {/* Galaxy Background Base Layer (Non-clipping container) */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, borderRadius: 'inherit' }}>
        <div className="nebula-glow" />
        <div className="space-stars" />
        <div className="space-stars-2" />
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap', padding: '24px 24px 0 24px' }}>
        <button className="btn-ghost" onClick={() => setSelectedAlbumId(null)}>← Trở lại</button>
        <span style={{ fontSize: 36, filter: 'drop-shadow(0 2px 8px rgba(255,100,150,0.3))' }}>{selectedAlbum.coverEmoji}</span>
        <div>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                style={{
                  fontSize: 26, fontWeight: 700, margin: 0, padding: '4px 8px',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid var(--rose-400)',
                  color: '#fff', borderRadius: 6, outline: 'none', width: '250px'
                }}
                className="playfair"
              />
              <button className="btn-primary" style={{ padding: '6px 12px' }} onClick={handleSaveName}>Lưu</button>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setIsEditingName(false)}>Hủy</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0 }} className="playfair">{selectedAlbum.name}</h2>
              <button onClick={() => { setEditNameValue(selectedAlbum.name); setIsEditingName(true); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 18, color: '#fff', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                title="Đổi tên album"
              >
                ✏️
              </button>
            </div>
          )}
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>{selectedAlbum.photos.length} bức ảnh · Lưu giữ những kỉ niệm đẹp nhất</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>+ Thêm ảnh</button>
          <button className="btn-secondary" onClick={() => { if (confirm('Xóa album này và tất cả ảnh bên trong?')) deleteAlbum(selectedAlbum.id); }}
            style={{ color: 'var(--rose-400)', borderColor: 'rgba(244,63,94,0.3)' }}>🗑 Xóa</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />

      {selectedAlbum.photos.length === 0 ? (
        <div className="empty-state" style={{ position: 'relative', zIndex: 10 }}>
          <div className="empty-icon">🖼️</div>
          <p>Album đang trống. Bạn hãy thêm những bức ảnh thật đẹp vào nhé!</p>
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => fileRef.current?.click()}>Chọn ảnh từ máy</button>
        </div>
      ) : (
        <div className="album-masonry-grid" style={{
          position: 'relative', zIndex: 10,
        }}>
          {selectedAlbum.photos.map((photo, i) => {
            const t = transforms3D[i] || { rotateZ: 0, animDelay: 0, animDuration: 4 };
            return (
            <div key={photo.id} className="photo-polaroid">
              <div 
                className="photo-float-wrapper"
                style={{ 
                  animation: `floatGentle ${t.animDuration}s ease-in-out infinite alternate`,
                  animationDelay: `${t.animDelay}s`,
                }}
              >
                <div 
                  className="photo-card-inner"
                  style={{ 
                    '--rotate-deg': `${t.rotateZ}deg`,
                    transform: `rotate(var(--rotate-deg))`,
                  } as any}
                  onMouseEnter={e => {
                    const isMobile = window.innerWidth < 600;
                    e.currentTarget.style.transform = `${isMobile ? '' : 'rotate(0deg)'} scale(1.06) translateY(-8px)`;
                    e.currentTarget.style.zIndex = '50';
                    e.currentTarget.style.boxShadow = '0 24px 50px rgba(255,100,150,0.45), inset 0 2px 5px rgba(255,255,255,1)';
                  }}
                  onMouseLeave={e => {
                    const isMobile = window.innerWidth < 600;
                    e.currentTarget.style.transform = isMobile ? 'rotate(0deg)' : `rotate(var(--rotate-deg))`;
                    e.currentTarget.style.zIndex = '1';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3), inset 0 2px 5px rgba(255,255,255,0.5)';
                  }}
                  onClick={() => setLightboxIndex(i)}
                >
                  <div style={{ overflow: 'hidden', borderRadius: 2, width: '100%', background: '#111', minHeight: '120px' }}>
                    <img src={photo.url} alt="" style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.4s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                  {/* Caption below photo */}
                  <div style={{ textAlign: 'center', paddingTop: 6, paddingBottom: 2 }}>
                    {photo.caption ? (
                      <p style={{
                        fontSize: 10, color: '#555', fontStyle: 'italic',
                        margin: 0, lineHeight: 1.2,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                      }}>{photo.caption}</p>
                    ) : (
                      <span style={{ fontSize: 11, color: '#bbb', letterSpacing: 0.3 }}>💬 thêm ghi chú...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Interactive Lightbox / Slideshow */}
      {lightboxIndex !== null && selectedAlbum.photos[lightboxIndex] && (
        <div className="modal-overlay" 
          onClick={() => setLightboxIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, lightboxIndex, selectedAlbum.photos.length)}
          style={{ background: 'rgba(10, 5, 12, 0.95)', backdropFilter: 'blur(10px)' }}>

          {/* Close Header */}
          <div style={{ position: 'absolute', top: 20, right: 30, zIndex: 100 }}>
            <button className="btn-icon" onClick={() => setLightboxIndex(null)} style={{ color: '#fff', fontSize: 24, width: 44, height: 44, background: 'rgba(255,255,255,0.1)' }}>✕</button>
          </div>

          <div 
            className="lightbox-container"
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              width: '100%', height: '100%', position: 'relative', gap: 12 
            }} 
          >

            <div key={lightboxIndex} 
              onClick={e => e.stopPropagation()}
              style={{ animation: 'fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '100%' }}>
              <img src={selectedAlbum.photos[lightboxIndex].url} alt=""
                style={{
                  maxWidth: '100%', maxHeight: '85vh', borderRadius: 8,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                  objectFit: 'contain'
                }} />

              {/* Delete btn */}
              <button onClick={(e) => { e.stopPropagation(); deletePhoto(selectedAlbum.photos[lightboxIndex].id); }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(220,38,38,0.8)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, backdropFilter: 'blur(4px)',
                  transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.8)'}
              >
                🗑 Xóa ảnh
              </button>
            </div>

            {/* Caption section */}
            <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              {editingCaption?.photoId === selectedAlbum.photos[lightboxIndex]?.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    autoFocus
                    value={editingCaption.value}
                    onChange={e => setEditingCaption({ ...editingCaption, value: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCaption(selectedAlbum.photos[lightboxIndex].id, editingCaption.value); }
                      if (e.key === 'Escape') setEditingCaption(null);
                    }}
                    placeholder="Ghi chú cho bức ảnh này... (Enter để lưu)"
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,77,136,0.5)',
                      borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'Inter, sans-serif',
                      resize: 'none', outline: 'none', lineHeight: 1.5, minHeight: 72,
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button className="btn-primary" style={{ padding: '7px 20px', fontSize: 13 }}
                      onClick={() => saveCaption(selectedAlbum.photos[lightboxIndex].id, editingCaption.value)}>
                      ✓ Lưu
                    </button>
                    <button className="btn-ghost" style={{ padding: '7px 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}
                      onClick={() => setEditingCaption(null)}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingCaption({ photoId: selectedAlbum.photos[lightboxIndex].id, value: selectedAlbum.photos[lightboxIndex].caption || '' })}
                  style={{
                    cursor: 'text', padding: '10px 16px',
                    borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)',
                    transition: 'border-color 0.2s, background 0.2s',
                    minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,77,136,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {selectedAlbum.photos[lightboxIndex].caption ? (
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                      “{selectedAlbum.photos[lightboxIndex].caption}”
                    </p>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>✏️ Click để thêm ghi chú cho ảnh này...</span>
                  )}
                </div>
              )}
            </div>

            {/* Next */}
            {selectedAlbum.photos.length > 1 && (
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setEditingCaption(null); setLightboxIndex((lightboxIndex + 1) % selectedAlbum.photos.length); }}
                style={{ position: 'absolute', right: 20, width: 50, height: 50, color: '#fff', fontSize: 28, background: 'rgba(255,255,255,0.1)' }}>
                ›
              </button>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: 1 }}>
            Ảnh {lightboxIndex + 1} / {selectedAlbum.photos.length}
          </div>
        </div>
      )}

      {/* ── Upload caption modal ── */}
      {uploadQueue.length > 0 && (
        <div className="modal-overlay" style={{ background: 'rgba(5,2,10,0.92)', backdropFilter: 'blur(12px)', zIndex: 200 }}
          onClick={() => { setUploadQueue([]); setUploadCaption(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="playfair" style={{ fontSize: 22, margin: 0 }}>
                📝 Thêm ghi chú
              </h3>
              {uploadQueue.length > 1 && (
                <span className="badge">
                  {uploadQueue.length} ảnh còn lại
                </span>
              )}
            </div>

            {/* Preview */}
            <div style={{
              borderRadius: 12, overflow: 'hidden',
              background: '#111', maxHeight: 320,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}>
              <img
                src={uploadQueue[0].url} alt="preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 320, display: 'block' }}
              />
            </div>

            {/* Caption input */}
            <div>
              <label className="label">Ghi chú cho bức ảnh này</label>
              <textarea
                ref={captionInputRef}
                autoFocus
                value={uploadCaption}
                onChange={e => setUploadCaption(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveUploadedPhoto(); }
                  if (e.key === 'Escape') { setUploadQueue([]); setUploadCaption(''); }
                }}
                placeholder="Ngày này thật đặc biệt vì... (Enter để lưu, Shift+Enter xuống dòng)"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  fontSize: 15, fontFamily: 'Inter, sans-serif',
                  resize: 'none', outline: 'none', lineHeight: 1.6,
                  minHeight: 88, transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--pink-400)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 2, opacity: isUploading ? 0.7 : 1 }} onClick={handleSaveUploadedPhoto} disabled={isUploading}>
                {isUploading ? 'Đang lưu...' : '💾 Lưu ảnh'}
              </button>
              <button className="btn-secondary" style={{ flex: 1, fontSize: 13, opacity: isUploading ? 0.7 : 1 }} onClick={handleSkipUploadedPhoto} disabled={isUploading}>
                Bỏ qua ghi chú
              </button>
              <button className="btn-ghost" style={{ fontSize: 13, padding: '12px 14px' }}
                onClick={() => { setUploadQueue([]); setUploadCaption(''); }}
                disabled={isUploading}
                title="Huỷ tất cả">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keep simple CSS for the specific animations only missing in globals */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatGentle {
          from { transform: translateY(0px); }
          to   { transform: translateY(-10px); }
        }

        /* Masonry polaroid grid */
        .album-masonry-grid {
          columns: 2;
          column-width: 120px; /* Force small columns */
          column-gap: 8px;
          padding: 8px 30px 40px; /* Heavy side padding to shrink the grid */
          max-width: 100%;
          margin: 0 auto;
        }
        @media (min-width: 600px) {
          .album-masonry-grid { columns: 3; column-gap: 16px; padding: 24px 24px 50px; }
        }
        @media (min-width: 1024px) {
          .album-masonry-grid { columns: 4; column-gap: 24px; }
        }

        /* Polaroid card */
        .photo-polaroid {
          break-inside: avoid;
          display: inline-block; /* More stable than block in some browsers */
          width: 100%;
          margin-bottom: 8px;
        }
        .photo-float-wrapper {
          width: 100%;
          height: auto;
          will-change: transform;
        }
        .photo-card-inner {
          display: block;
          width: 100%;
          cursor: pointer;
          padding: 6px 6px 14px 6px;
          background: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          border-radius: 2px;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s ease;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 600px) {
          .photo-card-inner { padding: 5px 5px 12px 5px; border-radius: 3px; }
          .photo-polaroid { margin-bottom: 20px; }
        }
        .lightbox-container {
          padding: 0 80px;
        }
        @media (max-width: 600px) {
          .lightbox-container { padding: 0 10px; }
          .photo-polaroid { --rotate-deg: 0deg !important; }
        }

        /* Space Galaxy Background */
        .space-galaxy-bg {
          position: relative;
          border-radius: 20px;
          border: 1px solid var(--border-glass);
          background: linear-gradient(135deg, #090310 0%, #170824 50%, #0d0614 100%);
          overflow-y: initial; /* Ensure vertical scrolling is never blocked */
          min-height: 500px;
          box-shadow: inset 0 0 50px rgba(0,0,0,0.8);
        }
        .space-stars {
          position: absolute; inset: 0;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
            radial-gradient(3px 3px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(3px 3px at 130px 80px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, #eee, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          animation: floatStars 60s linear infinite;
          opacity: 0.6;
        }
        .space-stars-2 {
          position: absolute; inset: 0;
          background-image: 
            radial-gradient(1px 1px at 10px 10px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 150px 150px, #fff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 60px 120px, #ffccff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 180px 40px, #fff, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 250px 250px;
          animation: floatStars 90s linear infinite reverse;
          opacity: 0.4; mix-blend-mode: screen;
        }
        .nebula-glow {
          position: absolute; top: -10%; left: -10%; right: -10%; bottom: -10%;
          background: 
            radial-gradient(circle at 15% 50%, rgba(147, 51, 234, 0.2), transparent 40%),
            radial-gradient(circle at 85% 30%, rgba(255, 77, 136, 0.15), transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(79, 70, 229, 0.15), transparent 50%);
          filter: blur(60px);
          animation: pulseNebula 8s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes floatStars {
          from { background-position: 0 0; }
          to { background-position: 500px 500px; }
        }
        @keyframes pulseNebula {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); }
        }
      `}} />
    </div>
  );
}
