import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, CoupleData } from './types';
import { generateId, generateInviteCode } from './utils';

// Helper: Ensure user document exists
export const ensureUserDocument = async (user: any): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  
  const newUser: UserProfile & { inviteCode: string } = {
    id: user.uid,
    name: user.displayName || 'Người yêu mới',
    avatar: user.photoURL || '🌸', // default emoji if no photo
    email: user.email || '',
    provider: 'google',
    inviteCode: generateInviteCode(), // for pairing
  };
  await setDoc(userRef, newUser);
  return newUser;
};

// Create a new Couple Pairing
export const pairCouple = async (myUser: UserProfile, partnerCode: string): Promise<string> => {
  // 1. Find partner by their invite code
  const q = query(collection(db, 'users'), where('inviteCode', '==', partnerCode));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    throw new Error('Mã kết đôi không hợp lệ hoặc đã hết hạn.');
  }

  const partnerDoc = snap.docs[0];
  const partnerUser = partnerDoc.data() as UserProfile;

  if (partnerUser.coupleId) {
    throw new Error('Người này đã được ghép đôi với ai đó rùi 😢');
  }

  // 2. Create the couple document
  const coupleId = 'couple_' + generateId();
  const coupleData = {
    id: coupleId,
    user1Id: myUser.id,
    user2Id: partnerUser.id,
    startDate: new Date().toISOString().slice(0, 16),
    relationshipName: 'Chúng Mình',
  };

  await setDoc(doc(db, 'couples', coupleId), coupleData);

  // 3. Update both users with the coupleId and partnerId
  await updateDoc(doc(db, 'users', myUser.id), {
    coupleId,
    partnerId: partnerUser.id,
  });

  await updateDoc(doc(db, 'users', partnerUser.id), {
    coupleId,
    partnerId: myUser.id,
  });

  return coupleId;
};
