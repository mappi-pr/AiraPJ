// SPA全体で一意なユーザーIDをlocalStorageで管理
export function getUserId(): string {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('userId', userId);
  }
  return userId;
}
