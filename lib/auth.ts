import { auth } from './firebase';
import { 
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, 
  signOut, setPersistence, indexedDBLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  EmailAuthProvider, linkWithCredential
} from 'firebase/auth';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const isMessenger = /FBAN|FBAV|Zalo|Instagram/i.test(navigator.userAgent);
    
    // Always attempt with Persistence first
    await setPersistence(auth, indexedDBLocalPersistence);

    // If it's a known restricted In-App browser, we still need Redirect 
    // but the user is advised to use Safari.
    // However, on real Safari, Popup works better for some projects.
    if (isMessenger) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Lỗi đăng nhập Google:", error);
    // Fallback to redirect if popup is blocked
    if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
        return null;
    }
    throw error;
  }
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Lỗi xử lý redirect:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, pass: string) => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (error) {
    console.error("Lỗi đăng nhập Email:", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { displayName: name });
    return res.user;
  } catch (error) {
    console.error("Lỗi đăng ký Email:", error);
    throw error;
  }
};

export const linkEmailPassword = async (pass: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Không tìm thấy người dùng hoặc email.");
  
  try {
    const credential = EmailAuthProvider.credential(user.email, pass);
    await linkWithCredential(user, credential);
    return user;
  } catch (error) {
    console.error("Lỗi liên kết Email/Password:", error);
    throw error;
  }
};
