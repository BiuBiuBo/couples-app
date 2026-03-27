// Tháo gỡ Firebase Storage do bị lỗi policy đòi thẻ tín dụng

export const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const generateInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function formatDate(dateInput: string | Date | number): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(dateInput: string | Date | number): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
}

/** Upload base64 image string to Cloudinary */
export async function uploadImageString(path: string, dataUrl: string): Promise<string> {
  const CLOUD_NAME = 'ddceci1ir';
  const UPLOAD_PRESET = 'couples_app';
  
  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('upload_preset', UPLOAD_PRESET);
  // Dùng thư mục chungminh_app để dễ quản lý trên Cloudinary
  formData.append('folder', 'chungminh_app/' + path.split('/').slice(0, -1).join('/'));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'Lỗi tải ảnh lên Cloudinary');
  }

  const data = await res.json();
  return data.secure_url;
}
