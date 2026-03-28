'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { useAuth, useCurrentUser } from '@/lib/hooks';
import { useToast } from '@/providers/ToastProvider';
import { signInWithGoogle, logout, signInWithEmail, signUpWithEmail, isRestrictedBrowser } from '@/lib/auth';
import { ensureUserDocument, pairCouple } from '@/lib/db';
import styles from './page.module.css';

const HEARTS = ['💕', '💖', '💗', '💓', '💝', '💞', '❤️', '🌹'];

export default function LandingPage() {
  const router = useRouter();
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { user, loading: authLoading } = useAuth();
  const profile = useCurrentUser(user?.uid);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [pairingError, setPairingError] = useState('');

  // Email Auth State
  const [emailForm, setEmailForm] = useState({ email: '', password: '', name: '' });
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authError, setAuthError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    setIsRestricted(isRestrictedBrowser());
  }, []);

  // Auto redirect to dashboard if paired
  useEffect(() => {
    if (profile?.coupleId) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  // Floating hearts canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; emoji: string; opacity: number }[] = [];

    for (let i = 0; i < 24; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 20 + 10,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: -(Math.random() * 0.5 + 0.2),
        emoji: HEARTS[Math.floor(Math.random() * HEARTS.length)],
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.emoji, p.x, p.y);
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < -50) { p.y = canvas.height + 50; p.x = Math.random() * canvas.width; }
        if (p.x < -50) p.x = canvas.width + 50;
        if (p.x > canvas.width + 50) p.x = -50;
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  // Handle Google Login Redirect Result (for Mobile)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const { handleRedirectResult } = await import('@/lib/auth');
        const fbUser = await handleRedirectResult();
        if (fbUser) {
          setIsLoading(true);
          setShowLoginModal(true); 
          const { profile: userProfile, isNew } = await ensureUserDocument(fbUser);
          // Auto link password on redirect result too, only for EXISTING users
          const hasPassword = fbUser.providerData.some(p => p.providerId === 'password');
          if (!isNew && !hasPassword && fbUser.email) {
            const { linkEmailPassword } = await import('@/lib/auth');
            await linkEmailPassword('BeUyenXinhDep');
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Lỗi redirect:", err);
        if (err.code !== 'auth/popup-closed-by-user') {
          toast.error('🍎 Lỗi iOS/Safari: ' + (err.message || 'Vui lòng thử lại bằng trình duyệt Safari gốc!'));
        }
      }
    };
    checkRedirect();
  }, []);

  // Auto-show modal if logged in but not paired (to avoid "back to home" feel)
  useEffect(() => {
    if (user && profile && !profile.coupleId && !showLoginModal) {
      setShowLoginModal(true);
    }
  }, [user, profile, showLoginModal]);

  const handleGoogleLogin = async () => {
    const ua = navigator.userAgent;
    const isMessenger = /FBAN|FBAV/i.test(ua);
    const isZalo = /Zalo/i.test(ua);
    const isInstagram = /Instagram/i.test(ua);
    const isInApp = isMessenger || isZalo || isInstagram;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isInApp) {
      if (isIOS) {
        toast.warning('🍎 CẢNH BÁO: Google không cho phép đăng nhập bên trong ứng dụng này. Hãy chọn "Mở bằng Safari" nhé!');
      } else {
        toast.warning('🌐 CẢNH BÁO: Trình duyệt này không được Google hỗ trợ. Hãy chọn "Mở bằng trình duyệt" bên ngoài nhé!');
      }
      return;
    }
    setIsLoading(true);
    setAuthError('');
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        const { profile: userProfile, isNew } = await ensureUserDocument(fbUser);
        // Tự động thiết lập mật khẩu mặc định nếu là TÀI KHOẢN CŨ và chưa có mật khẩu
        const hasPassword = fbUser.providerData.some(p => p.providerId === 'password');
        if (!isNew && !hasPassword && fbUser.email) {
          try {
            const { linkEmailPassword } = await import('@/lib/auth');
            await linkEmailPassword('BeUyenXinhDep');
            console.log('Đã tự động liên kết mật khẩu mặc định cho tài khoản cũ');
          } catch (err) {
            console.error('Không thể tự động liên kết mật khẩu:', err);
          }
        }
        toast.success(`Chào mừng quay trở lại! 💖`);
      }
    } catch (e: any) {
      console.error(e);
      setAuthError(e.code === 'auth/popup-closed-by-user' ? '' : (e.message || 'Lỗi đăng nhập Google'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email || !emailForm.password) return;
    if (emailMode === 'signup' && !emailForm.name) {
      setAuthError('Vui lòng nhập tên của bạn');
      return;
    }

    setIsLoading(true);
    setAuthError('');
    try {
      let fbUser;
      if (emailMode === 'signin') {
        fbUser = await signInWithEmail(emailForm.email, emailForm.password);
      } else if (emailMode === 'signup') {
        fbUser = await signUpWithEmail(emailForm.email, emailForm.password, emailForm.name);
      } else if (emailMode === 'forgot') {
        const { resetEmailPassword } = await import('@/lib/auth');
        await resetEmailPassword(emailForm.email);
        setResetEmailSent(true);
        setIsLoading(false);
        return;
      }
      
      if (fbUser) {
        await ensureUserDocument(fbUser);
        toast.success(emailMode === 'signup' ? 'Đăng ký thành công! Chào mừng hai bạn ✨' : 'Đăng nhập thành công! 🤗');
      }
    } catch (e: any) {
      console.error(e);
      let msg = 'Lỗi xác thực';
      if (e.code === 'auth/user-not-found') msg = 'Tài khoản không tồn tại.';
      else if (e.code === 'auth/wrong-password') msg = 'Mật khẩu không chính xác.';
      else if (e.code === 'auth/email-already-in-use') msg = 'Email này đã được sử dụng.';
      else if (e.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
      else if (e.code === 'auth/invalid-email') msg = 'Email không hợp lệ.';
      else msg = e.message || msg;
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePairing = async () => {
    if (!profile || !partnerCode.trim()) return;
    setIsLoading(true);
    setPairingError('');
    try {
      await pairCouple(profile, partnerCode.trim().toUpperCase());
      toast.success('Gắn kết thành công! Chúc mừng hai bạn đã về chung một nhà 🏠💕');
    } catch (e: any) {
      toast.error(`Lỗi ghép đôi: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowLoginModal(false);
  };

  return (
    <div className={styles.landing}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className="animate-heartbeat" style={{ display: 'inline-block', fontSize: 24 }}>💕</span>
          <span className="script" style={{ fontSize: 22, fontWeight: 700 }}>Chúng Mình</span>
        </div>
        {user && profile && !profile.coupleId && (
          <button onClick={() => setShowLoginModal(true)} style={{ background: 'var(--bg-glass)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '50px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar src={profile.avatar} size={24} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Chưa kết đôi</span>
          </button>
        )}
      </nav>

      {/* Hero */}
      <main className={styles.hero}>
        <div className={styles.heroBadge}>
          <span>✨</span>
          <span>Không gian riêng tư dành cho hai người</span>
        </div>

        <h1 className={styles.heroTitle}>
          Lưu giữ mọi khoảnh khắc<br />
          <span className="gradient-text script" style={{ fontSize: '1.2em' }}>bên người yêu</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Chia sẻ ảnh, đếm ngày yêu, ghi lại 100 điều muốn làm cùng nhau,<br />
          gửi những lời muốn nói và không bao giờ quên các dịp quan trọng.
        </p>

        <div className={styles.heroActions}>
          <button 
            className="btn-primary" 
            onClick={() => setShowLoginModal(true)} 
            style={{ fontSize: 16, padding: '16px 36px' }}
            disabled={authLoading}
          >
            {authLoading ? 'Đang tải...' : (profile?.coupleId ? 'Vào Nhà Trực Tiếp' : '💖 Bắt đầu ngay')}
          </button>
        </div>

        {/* Feature cards */}
        <div className={styles.featureGrid}>
          {[
            { emoji: '📸', title: 'Album Kỷ Niệm', desc: 'Ảnh theo từng chủ đề, cùng nhau lưu giữ' },
            { emoji: '💕', title: 'Đếm Ngày Yêu', desc: 'Từng ngày, từng giờ bên nhau đều đáng nhớ' },
            { emoji: '✨', title: '100 Điều Muốn Làm', desc: 'Bucket list chung cho cặp đôi' },
            { emoji: '📝', title: 'Ghi Chú Yêu Thương', desc: 'Lời muốn nói, gửi vào bất kỳ lúc nào' },
            { emoji: '📅', title: 'Ngày Kỷ Niệm', desc: 'Nhắc nhở tự động các dịp quan trọng' },
            { emoji: '🌙', title: 'Nhật Ký Cảm Xúc', desc: 'Chia sẻ tâm trạng hàng ngày với nhau' },
            { emoji: '🎵', title: 'Bài Hát Của Mình', desc: 'Bài nhạc gắn liền với mối tình này' },
            { emoji: '🤝', title: 'Lời Hứa Với Nhau', desc: 'Ghi lại và giữ trọn những lời hứa' },
          ].map((f, i) => (
            <div key={i} className={`glass-card ${styles.featureCard} animate-fade-in-up`} style={{ animationDelay: `${i * 0.08}s` }}>
              <span className={styles.featureEmoji}>{f.emoji}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Auth & Pairing Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => { if (!isLoading) { setShowLoginModal(false); setResetEmailSent(false); } }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            
            {/* STAGE 1: NOT LOGGED IN */}
            {!user && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💕</div>
                <h2 className="playfair" style={{ fontSize: 24, marginBottom: 8 }}>Mở khóa Không gian</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
                  {authMethod === 'google' 
                    ? 'Đăng nhập bằng Google để bảo mật kỷ niệm của hai bạn trên đám mây.'
                    : emailMode === 'signin' ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản mới cho hai bạn'}
                </p>

                {/* Restricted Browser Warning */}
                {isRestricted && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 77, 136, 0.1) 100%)',
                    border: '1px solid rgba(255, 77, 136, 0.2)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    marginBottom: '24px',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    color: 'var(--rose-400)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    gap: '12px',
                    boxShadow: '0 8px 32px rgba(255, 77, 136, 0.1)'
                  }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
                    <span>
                      Bạn đang mở từ <b>Zalo/Facebook</b>. Hãy nhấn vào dấu <span style={{ fontWeight: 800 }}>...</span> chọn <b>"Mở bằng Safari"</b> để không bị tự động đăng xuất nhé!
                    </span>
                  </div>
                )}

                {authMethod === 'google' ? (
                  <>
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                        padding: '16px 20px', background: 'white', color: '#333',
                        border: 'none', borderRadius: 'var(--radius-md)', width: '100%',
                        cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'var(--transition)',
                        fontWeight: 600, fontSize: 15, fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: 20, height: 20 }} />
                      {isLoading ? 'Đang kết nối...' : 'Tiếp tục với Google'}
                    </button>
                    <button 
                      onClick={() => { setAuthMethod('email'); setAuthError(''); }}
                      className="btn-ghost" style={{ marginTop: 12, width: '100%', fontSize: 14 }}>
                      📧 Đăng nhập bằng Email
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleEmailAuth} style={{ textAlign: 'left' }}>
                    {emailMode === 'signup' && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>TÊN CỦA BẠN</label>
                        <input 
                          autoFocus
                          className="input-field"
                          placeholder="Tên hoặc biệt danh..."
                          value={emailForm.name}
                          onChange={e => setEmailForm({ ...emailForm, name: e.target.value })}
                          required
                        />
                      </div>
                    )}
                    
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>EMAIL</label>
                      <input 
                        autoFocus={emailMode !== 'signup'}
                        className="input-field"
                        type="email"
                        placeholder="example@gmail.com"
                        value={emailForm.email}
                        onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                        required
                      />
                    </div>

                    {emailMode !== 'forgot' && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>MẬT KHẨU</label>
                        <input 
                          className="input-field"
                          type="password"
                          placeholder="••••••••"
                          value={emailForm.password}
                          onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                          required
                          minLength={6}
                        />
                        {emailMode === 'signin' && (
                          <div style={{ textAlign: 'right', marginTop: 8 }}>
                            <button 
                              type="button"
                              onClick={() => { setEmailMode('forgot'); setAuthError(''); setResetEmailSent(false); }}
                              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                              Quên mật khẩu?
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {authError && <div style={{ color: 'var(--rose-400)', fontSize: 13, marginBottom: 16 }}>⚠️ {authError}</div>}
                    
                    {resetEmailSent ? (
                      <div style={{ textAlign: 'center', background: 'rgba(255, 77, 136, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
                        <p style={{ fontSize: 13, color: 'var(--rose-300)', fontWeight: 600 }}>
                          Đã gửi hướng dẫn khôi phục! <br/> Bạn kiểm tra hộp thư đến nhé.
                        </p>
                      </div>
                    ) : (
                      <button className="btn-primary" style={{ width: '100%', padding: '14px' }} disabled={isLoading}>
                        {isLoading ? 'Đang xử lý...' : (
                          emailMode === 'signin' ? 'Đăng nhập' : 
                          emailMode === 'signup' ? 'Đăng ký ngay' : 'Gửi link khôi phục'
                        )}
                      </button>
                    )}

                    <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
                      {emailMode === 'forgot' ? (
                        <button 
                          type="button"
                          onClick={() => { setEmailMode('signin'); setAuthError(''); setResetEmailSent(false); }}
                          style={{ color: 'var(--pink-400)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Quay lại đăng nhập
                        </button>
                      ) : (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {emailMode === 'signin' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                          </span>
                          <button 
                            type="button"
                            onClick={() => { setEmailMode(emailMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); setResetEmailSent(false); }}
                            style={{ color: 'var(--pink-400)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            {emailMode === 'signin' ? 'Đăng ký' : 'Đăng nhập'}
                          </button>
                        </>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => { setAuthMethod('google'); setAuthError(''); setEmailMode('signin'); }}
                      className="btn-ghost" style={{ marginTop: 12, width: '100%', fontSize: 14 }}>
                      ← Quay lại đăng nhập Google
                    </button>
                  </form>
                )}
                
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 24 }}>
                  Dữ liệu của bạn được mã hóa và bảo mật trên Google Firebase.
                </p>
              </div>
            )}

            {/* STAGE: LOGGED IN BUT PROFILE STILL LOADING */}
            {user && !profile && (
               <div style={{ textAlign: 'center', padding: '40px 0' }}>
                 <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                 <p style={{ color: 'var(--text-secondary)' }}>Đang chuẩn bị không gian...</p>
               </div>
            )}

            {/* STAGE 2: LOGGED IN BUT NO COUPLE (PAIRING ROOM) */}
            {user && profile && !profile.coupleId && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💍</div>
                <h2 className="playfair" style={{ fontSize: 24, marginBottom: 8 }}>Phòng Kết Đôi</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
                  Chào <b>{profile.name}</b>, hãy gửi mã kết đôi của bạn cho người ấy hoặc nhập mã do người ấy gửi cho bạn vào ô bên dưới nhé.
                </p>

                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: 24, border: '1px dashed var(--border-pink)' }}>
                  <div style={{ fontSize: 12, color: 'var(--pink-300)', marginBottom: 4 }}>MÃ CỦA BẠN</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {profile.inviteCode}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'left' }}>NHẬP MÃ CỦA NGƯỜI ẤY (NẾU CÓ)</div>
                  <input
                    type="text"
                    placeholder="VD: ABCXYZ"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                    maxLength={6}
                    style={{
                      width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                      color: 'white', fontSize: 20, textAlign: 'center', fontWeight: 'bold',
                      letterSpacing: 2, fontFamily: 'monospace', outline: 'none'
                    }}
                  />
                  {pairingError && <div style={{ color: 'var(--rose-400)', fontSize: 13, marginTop: 8, textAlign: 'left' }}>{pairingError}</div>}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="btn-primary"
                    onClick={handlePairing}
                    disabled={isLoading || partnerCode.length < 3}
                    style={{ flex: 1, padding: '14px', fontSize: 15 }}
                  >
                    {isLoading ? 'Đang ghép cặp...' : 'Kết đôi ngay'}
                  </button>
                </div>
                
                <button 
                  onClick={handleLogout}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, marginTop: 16, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Đăng xuất ({user.email})
                </button>
              </div>
            )}

            {/* STAGE 3: LOGGED IN AND PAIRED (LOADING DASHBOARD TO REDIRECT) */}
            {user && profile && profile.coupleId && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }} className="animate-heartbeat">💖</div>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>Chuẩn bị vào không gian riêng...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải dữ liệu của hai bạn</p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
