// hooks.ts
import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, query, orderBy, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { UserProfile, CoupleData, Album, BucketItem, Note, Anniversary, MoodEntry, Promise as PromiseType, AppNotification } from './types';

// GLOBAL HOOKS
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export function useCurrentUser(uid?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      else setProfile(null);
    });
  }, [uid]);

  return profile;
}

export function useCouple(coupleId?: string) {
  const [couple, setCouple] = useState<CoupleData | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return onSnapshot(doc(db, 'couples', coupleId), async (snap) => {
      if (!snap.exists()) { setCouple(null); return; }
      const data = snap.data() as CoupleData;

      // If user profiles are missing (old couple docs), fetch them manually
      if (!data.user1 || !data.user2) {
        const [u1snap, u2snap] = await Promise.all([
          import('firebase/firestore').then(({ getDoc, doc: fdoc }) => getDoc(fdoc(db, 'users', data.user1Id))),
          import('firebase/firestore').then(({ getDoc, doc: fdoc }) => getDoc(fdoc(db, 'users', data.user2Id))),
        ]);
        data.user1 = u1snap.exists() ? u1snap.data() as any : { id: data.user1Id, name: 'Người yêu', avatar: '🌸', email: '', provider: 'google' };
        data.user2 = u2snap.exists() ? u2snap.data() as any : { id: data.user2Id, name: 'Người yêu', avatar: '🌸', email: '', provider: 'google' };
      }

      setCouple(data);
    });
  }, [coupleId]);

  return couple;
}

// COLLECTION HOOKS
export function useAlbums(coupleId?: string, enabled: boolean = true) {
  const [albums, setAlbums] = useState<Album[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/albums`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setAlbums(snap.docs.map(d => d.data() as Album)));
  }, [coupleId, enabled]);
  return albums;
}

export function useBucketList(coupleId?: string, enabled: boolean = true) {
  const [items, setItems] = useState<BucketItem[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/bucketList`), orderBy('addedAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => d.data() as BucketItem)));
  }, [coupleId, enabled]);
  return items;
}

export function useNotes(coupleId?: string, enabled: boolean = true) {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/notes`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setNotes(snap.docs.map(d => d.data() as Note)));
  }, [coupleId, enabled]);
  return notes;
}

export function useAnniversaries(coupleId?: string, enabled: boolean = true) {
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/anniversaries`));
    return onSnapshot(q, (snap) => setAnniversaries(snap.docs.map(d => d.data() as Anniversary)));
  }, [coupleId, enabled]);
  return anniversaries;
}

export function useMoods(coupleId?: string, enabled: boolean = true) {
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/moods`), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => setMoods(snap.docs.map(d => d.data() as MoodEntry)));
  }, [coupleId, enabled]);
  return moods;
}

export function usePromises(coupleId?: string, enabled: boolean = true) {
  const [promises, setPromises] = useState<PromiseType[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/promises`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setPromises(snap.docs.map(d => d.data() as PromiseType)));
  }, [coupleId, enabled]);
  return promises;
}

export function useNotifications(coupleId?: string, enabled: boolean = true) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  useEffect(() => {
    if (!coupleId || !enabled) return;
    const q = query(collection(db, `couples/${coupleId}/notifications`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => d.data() as AppNotification)));
  }, [coupleId, enabled]);
  return notifications;
}

// MUTATION HELPERS
export const mutators = {
  addDoc: async (coupleId: string, col: string, item: any, idField: string = 'id') => {
    const docRef = doc(db, `couples/${coupleId}/${col}`, item[idField]);
    await setDoc(docRef, item);
  },
  updateDoc: async (coupleId: string, col: string, id: string, data: any) => {
    const docRef = doc(db, `couples/${coupleId}/${col}`, id);
    await updateDoc(docRef, data);
  },
  deleteDoc: async (coupleId: string, col: string, id: string) => {
    const docRef = doc(db, `couples/${coupleId}/${col}`, id);
    await deleteDoc(docRef);
  }
};
