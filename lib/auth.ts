import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';

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
