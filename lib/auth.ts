import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      await signInWithRedirect(auth, provider);
      return null;
    } else {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    }
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
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
