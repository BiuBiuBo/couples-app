import { mutators } from './hooks';
import type { AppNotification, ActiveView, UserProfile } from './types';
import { generateId } from './utils';

/** Gửi thông báo trực tiếp lên Firestore Notification collection của Couple */
export async function notify(
  coupleId: string,
  user: UserProfile,
  type: AppNotification['type'],
  message: string,
  targetView?: ActiveView,
) {
  if (!coupleId || !user) return;

  const notif: AppNotification = {
    id: generateId(),
    fromUserId: user.id,
    fromName: user.name || 'Người yêu',
    fromAvatar: user.avatar,
    type,
    message,
    createdAt: new Date().toISOString(),
    isRead: false,
    ...(targetView ? { targetView } : {}),
  };

  await mutators.addDoc(coupleId, 'notifications', notif);
}
