export function getAnnouncementAuthorName(value: { admins?: { username?: string } | null }): string {
  return value.admins?.username || '관리자'
}
