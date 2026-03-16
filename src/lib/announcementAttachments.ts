import type { FileAttachment } from '@/components/FileUploadManager'

export interface PersistedAttachment {
  id: string
  storage_path: string
}

export function getRemovedExistingAttachments(
  originalAttachments: PersistedAttachment[],
  currentAttachments: FileAttachment[]
): PersistedAttachment[] {
  const currentIds = new Set(
    currentAttachments
      .map((attachment) => attachment.id)
      .filter((id): id is string => Boolean(id))
  )

  return originalAttachments.filter((attachment) => !currentIds.has(attachment.id))
}
