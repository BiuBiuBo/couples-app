// ===== TYPES =====

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // emoji or base64
  email: string;
  provider: 'google' | 'facebook' | 'email' | 'demo';
  // Extended personal info
  nickname?: string;
  birthday?: string; // YYYY-MM-DD
  bio?: string;
  hobbies?: string; // comma-separated
  loveLanguage?: 'words' | 'acts' | 'gifts' | 'time' | 'touch';
  quote?: string;
  coupleId?: string; // ID của document Couple trên Firestore
  partnerId?: string; // UID của đối phương
  inviteCode?: string; // OTP ghép đôi
}

export interface CoupleData {
  id?: string;
  user1Id: string; // Thay vì chứa nguyên object user (để tối ưu Firestore)
  user2Id: string;
  user1: UserProfile; // local cached
  user2: UserProfile; // local cached
  startDate: string; // ISO date string
  relationshipName: string; // "Chúng mình", "Tim & Ana", etc.
  inviteCode?: string;
  ourSong?: {
    title: string;
    artist: string;
    url: string;
  };
}

export interface Album {
  id: string;
  name: string;
  coverEmoji: string;
  createdAt: string;
  photos: Photo[];
}

export interface Photo {
  id: string;
  albumId: string;
  url: string; // base64
  caption: string;
  uploadedBy: string; // userId
  uploadedAt: string;
}

export interface BucketItem {
  id: string;
  text: string;
  addedBy: string;
  addedAt: string;
  completedAt?: string;
  category: 'travel' | 'food' | 'adventure' | 'romance' | 'other';
}

export interface Note {
  id: string;
  fromUserId: string;
  title: string;
  content: string;
  mood: string; // emoji
  isTimeCapsule: boolean;
  openDate?: string; // ISO date — for time capsule
  createdAt: string;
  isRead: boolean;
}

export interface Anniversary {
  id: string;
  title: string;
  date: string; // MM-DD or YYYY-MM-DD
  isRecurring: boolean; // annual
  emoji: string;
  color: string;
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: 'euphoric' | 'happy' | 'calm' | 'missing' | 'tired' | 'sad';
  note: string;
  date: string; // YYYY-MM-DD
}

export interface Promise {
  id: string;
  fromUserId: string;
  text: string;
  createdAt: string;
  isFulfilled: boolean;
  fulfilledAt?: string;
}

export type ActiveView =
  | 'dashboard'
  | 'albums'
  | 'bucket-list'
  | 'notes'
  | 'anniversaries'
  | 'mood'
  | 'promises'
  | 'profile';

export interface AppNotification {
  id: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string;
  type:
    | 'mood_update'
    | 'album_create' | 'album_delete'
    | 'photo_add' | 'photo_delete'
    | 'bucket_add' | 'bucket_complete' | 'bucket_delete'
    | 'anniversary_add' | 'anniversary_delete'
    | 'note_add'
    | 'promise_add' | 'promise_fulfill';
  message: string;
  createdAt: string;
  isRead: boolean;
  targetView?: ActiveView;
}
