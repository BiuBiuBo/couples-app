import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, CoupleData } from './types';
import { generateId, generateInviteCode } from './utils';

// Helper: Ensure user document exists
export const ensureUserDocument = async (user: any): Promise<{ profile: UserProfile, isNew: boolean }> => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { profile: snap.data() as UserProfile, isNew: false };
  }
  
  const newUser: UserProfile & { inviteCode: string } = {
    id: user.uid,
    name: user.displayName || 'Người yêu mới',
    avatar: user.photoURL || '🌸', // default emoji if no photo
    email: user.email || '',
    provider: user.providerId === 'password' ? 'email' : 'google',
    inviteCode: generateInviteCode(), // for pairing
  };
  await setDoc(userRef, newUser);
  return { profile: newUser, isNew: true };
};

// Unpair a couple
export const unpairCouple = async (myUserId: string, partnerId: string): Promise<void> => {
  // 1. Remove connection from both user documents
  await updateDoc(doc(db, 'users', myUserId), {
    coupleId: null,
    partnerId: null,
  });

  if (partnerId) {
    await updateDoc(doc(db, 'users', partnerId), {
      coupleId: null,
      partnerId: null,
    });
  }
};

// Migrate a partner to a new account
export const migratePartner = async (myUser: UserProfile, newPartnerCode: string): Promise<void> => {
  if (!myUser.coupleId || !myUser.partnerId) throw new Error('Bạn cần đang kết đôi để thực hiện việc này.');

  // 1. Find the new user (the replacement)
  const q = query(collection(db, 'users'), where('inviteCode', '==', newPartnerCode));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    throw new Error('Mã mời của tài khoản mới không hợp lệ.');
  }

  const newUserDoc = snap.docs[0];
  const newUser = newUserDoc.data() as UserProfile;

  if (newUser.id === myUser.id) {
    throw new Error('Bạn không thể tự kết đôi với chính mình.');
  }

  if (newUser.coupleId) {
    throw new Error('Tài khoản mới này đã được kết đôi với ai đó rồi.');
  }

  // 2. Load the current couple document
  const coupleRef = doc(db, 'couples', myUser.coupleId);
  const coupleSnap = await getDoc(coupleRef);
  if (!coupleSnap.exists()) throw new Error('Không tìm thấy dữ liệu cặp đôi hiện tại.');
  const coupleData = coupleSnap.data() as CoupleData;

  // 3. Identify which slot the old partner occupied (user1 or user2)
  const isPartnerSlot1 = coupleData.user1Id === myUser.partnerId;
  const oldPartnerId = myUser.partnerId;

  // 4. Update the Couple document with the new partner's info
  const updatedCoupleData: Partial<CoupleData> = {};
  if (isPartnerSlot1) {
    updatedCoupleData.user1Id = newUser.id;
    updatedCoupleData.user1 = newUser;
  } else {
    updatedCoupleData.user2Id = newUser.id;
    updatedCoupleData.user2 = newUser;
  }
  await updateDoc(coupleRef, updatedCoupleData);

  // 5. Update my user document (point to new partner UID)
  await updateDoc(doc(db, 'users', myUser.id), {
    partnerId: newUser.id,
  });

  // 6. Update the NEW partner's user document
  await updateDoc(doc(db, 'users', newUser.id), {
    coupleId: myUser.coupleId,
    partnerId: myUser.id,
  });

  // 7. Clear the OLD partner's user document (if reachable)
  try {
    await updateDoc(doc(db, 'users', oldPartnerId), {
      coupleId: null,
      partnerId: null,
    });
  } catch (e) {
    console.warn('Không thể cập nhật tài khoản cũ (có lỗi hoặc không tồn tại), tiến hành bỏ qua.', e);
  }
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

  // 2. Create the couple document (include user profiles so dashboard can render)
  const coupleId = 'couple_' + generateId();
  const coupleData = {
    id: coupleId,
    user1Id: myUser.id,
    user2Id: partnerUser.id,
    user1: myUser,
    user2: partnerUser,
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
