'use client';

import { useEffect, useState } from 'react';
import { useAnniversaries, mutators } from '@/lib/hooks';
import type { CoupleData } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Avatar from '@/components/Avatar';
import { formatDateTime } from '@/lib/utils';

interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

function calcTimeDiff(startDate: string): TimeLeft {
  const start = new Date(startDate);
  const now = new Date();
  
  const totalMs = Math.max(0, now.getTime() - start.getTime());
  
  const totalDays = Math.floor(Math.max(0, totalMs) / (1000 * 60 * 60 * 24));
  const remMsAfterDays = totalMs % (1000 * 60 * 60 * 24);

  const hours = Math.floor(remMsAfterDays / (1000 * 60 * 60));
  const remMsAfterHours = remMsAfterDays % (1000 * 60 * 60);

  const minutes = Math.floor(remMsAfterHours / (1000 * 60));
  const remMsAfterMins = remMsAfterHours % (1000 * 60);

  const seconds = Math.floor(remMsAfterMins / 1000);

  // User requested exact 30-day month logic
  const years = Math.floor(totalDays / 365);
  const rem = totalDays % 365;
  const months = Math.floor(rem / 30);
  const days = rem % 30;

  return { years, months, days, hours, minutes, seconds, totalDays };
}

export default function LoveCounter({ couple }: { couple: CoupleData }) {
  const anns = useAnniversaries(couple.id);
  const [mounted, setMounted] = useState(false);
  const [currentStartDate, setCurrentStartDate] = useState(couple.startDate);
  const [time, setTime] = useState<TimeLeft | null>(null);
  
  const formatForInput = (iso: string) => {
    if (iso.length === 10) return `${iso}T00:00`;
    return iso.slice(0, 16);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editDateValue, setEditDateValue] = useState(formatForInput(couple.startDate));

  useEffect(() => {
    setMounted(true);
    setTime(calcTimeDiff(currentStartDate));
    const id = setInterval(() => setTime(calcTimeDiff(currentStartDate)), 1000);
    return () => clearInterval(id);
  }, [currentStartDate]);

  const handleSaveDate = async () => {
    if (!editDateValue || !couple.id) return;
    
    // Update couple document
    await updateDoc(doc(db, 'couples', couple.id), { startDate: editDateValue });
    
    // Also update the anniversary if exists
    const ann = anns.find(a => a.id === 'a1' || a.title.toLowerCase().includes('ngày yêu nhau'));
    if (ann) {
      await mutators.updateDoc(couple.id, 'anniversaries', ann.id, { date: editDateValue });
    }

    setCurrentStartDate(editDateValue);
    setIsEditing(false);
  };

  // Prevent SSR Hydration mismatches by only rendering on client
  if (!mounted || !time) {
    return (
      <div style={{
        height: 380, background: 'rgba(255,255,255,0.02)', border: '2px solid rgba(255,255,255,0.05)',
        borderRadius: 32, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="spinner" style={{ width: 40, height: 40, opacity: 0.5 }} />
      </div>
    );
  }

  const startDisplay = formatDateTime(currentStartDate);

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(255,42,109,0.1) 0%, rgba(193,84,249,0.1) 100%)',
      border: '2px solid rgba(255,77,136,0.3)',
      boxShadow: '0 10px 50px rgba(255,77,136,0.15), inset 0 0 40px rgba(255,255,255,0.03)',
      borderRadius: '32px',
      padding: '48px 24px',
      marginBottom: 36,
      textAlign: 'center',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Dynamic Background Glow & Floating Hearts */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', height: '100%',
        background: 'radial-gradient(circle at center, rgba(255,77,136,0.15) 0%, transparent 60%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Title & Start Date */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ filter: 'drop-shadow(0 0 10px rgba(255,77,136,0.8))', animation: 'floatHeart 3s ease-in-out infinite', width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--gradient-card)', border: '2px solid rgba(255,77,136,0.5)' }}>
              <Avatar src={couple.user1.avatar} size={72} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--pink-200)' }}>
              {couple.user1.nickname || couple.user1.name}
            </div>
          </div>

          <div style={{ fontSize: 56, filter: 'drop-shadow(0 0 20px rgba(255,77,136,1))', margin: '0 -8px', zIndex: 1, transform: 'translateY(-14px)' }} className="animate-heartbeat">💖</div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ filter: 'drop-shadow(0 0 10px rgba(193,84,249,0.8))', animation: 'floatHeart 3s ease-in-out infinite 1.5s', width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--gradient-card)', border: '2px solid rgba(193,84,249,0.5)' }}>
              <Avatar src={couple.user2.avatar} size={72} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--purple-200)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {couple.user2.nickname || couple.user2.name}
            </div>
          </div>
        </div>
        
        <h2 className="playfair love-title" style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {couple.relationshipName}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0, fontWeight: 500, letterSpacing: 0.5 }}>
            Bắt đầu từ ngày {startDisplay}
          </p>
          <button 
            onClick={() => { setEditDateValue(formatForInput(currentStartDate)); setIsEditing(true); }}
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
              borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 12, transition: 'var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            title="Chỉnh sửa ngày yêu"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Main Total Days Ribbon */}
      <div style={{ position: 'relative', zIndex: 1, margin: '20px 0 36px 0' }}>
        <div className="love-days-ribbon" style={{
          background: 'var(--gradient-primary)',
          color: '#fff',
          padding: '12px 40px',
          borderRadius: 999,
          boxShadow: '0 8px 24px rgba(255,77,136,0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          fontWeight: 700,
        }}>
          <span className="love-days-label" style={{ fontSize: 24, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 }}>Đã yêu nhau</span>
          <span className="love-days-number" style={{ fontSize: 52, lineHeight: 1, fontFamily: 'Playfair Display, serif', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
            {time.totalDays.toLocaleString('vi-VN')}
          </span>
          <span className="love-days-label" style={{ fontSize: 24, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 }}>Ngày</span>
        </div>
      </div>

      {/* Detailed Units Grid */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 32, position: 'relative', zIndex: 1 }}>
        {[
          { value: time.years,  label: 'Năm' },
          { value: time.months, label: 'Tháng' },
          { value: time.days,   label: 'Ngày' },
        ].filter(item => item.value > 0 || item.label === 'Ngày').map((item, i) => (
          <div key={i} style={{
            minWidth: 110, padding: '20px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transform: 'translateY(0)',
            transition: 'transform 0.3s',
            cursor: 'default'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: 44, fontWeight: 700, fontFamily: 'Playfair Display, serif', lineHeight: 1, color: 'var(--text-primary)', marginBottom: 4 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Active Digital Clock */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'inline-flex', gap: 12, alignItems: 'center',
        padding: '12px 28px',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,77,136,0.2)',
        borderRadius: 999,
        fontFamily: 'monospace', fontSize: 28, fontWeight: 600,
        color: 'var(--pink-400)', letterSpacing: 3,
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
      }}>
        <span>{String(time.hours).padStart(2, '0')}</span>
        <span style={{ opacity: 0.5, animation: 'blink 1s infinite' }}>:</span>
        <span>{String(time.minutes).padStart(2, '0')}</span>
        <span style={{ opacity: 0.5, animation: 'blink 1s infinite' }}>:</span>
        <span style={{ color: 'var(--pink-300)' }}>{String(time.seconds).padStart(2, '0')}</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatHeart {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}} />

      {/* Edit Date Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)} style={{ zIndex: 100, background: 'rgba(10, 5, 12, 0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'left' }}>
            <h3 className="playfair" style={{ fontSize: 24, marginBottom: 20 }}>💖 Chỉnh sửa ngày kỉ niệm</h3>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Ngày giờ bắt đầu yêu nhau:</label>
              <input type="datetime-local" className="input-field" value={editDateValue} 
                onChange={e => setEditDateValue(e.target.value)}
                max={new Date().toISOString().slice(0, 16)}
                style={{ width: '100%', marginTop: 8 }}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                *Lưu ý: Nếu ngày này được chọn làm ngày lễ kỉ niệm trong phần Ngày Kỷ Niệm (Anniversary) thì nó cũng sẽ được tự động cập nhật.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setIsEditing(false)} style={{ flex: 1 }}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveDate} style={{ flex: 1 }}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
