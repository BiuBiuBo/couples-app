import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // Detect mobile/in-app browsers to use Redirect instead of Popup
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isMessenger = /FBAN|FBAV/i.test(navigator.userAgent);

    if (isMobile || isMessenger) {
      await signInWithRedirect(auth, provider);
      return null; // Page will redirect
    }

    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
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
