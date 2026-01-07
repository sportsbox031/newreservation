'use client'

import { Download, File } from 'lucide-react'

interface Attachment {
  id: string
  file_name: string
  file_size: number
  storage_path: string
}

interface AttachmentListProps {
  attachments: Attachment[]
  onDownload: (attachment: Attachment) => void
}

export default function AttachmentList({ attachments, onDownload }: AttachmentListProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  // 디버깅: attachments 상태 출력
  console.log('🔍 AttachmentList 렌더링:', attachments)

  if (attachments.length === 0) return null

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">첨부파일 ({attachments.length})</h4>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <button
            key={attachment.id}
            onClick={() => onDownload(attachment)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
