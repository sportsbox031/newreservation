'use client'

import { useState } from 'react'
import { Upload, X, File, AlertCircle } from 'lucide-react'

export interface FileAttachment {
  id?: string  // 기존 파일의 경우
  file?: File  // 새로 업로드할 파일
  file_name: string
  file_size: number
  file_type: string
  storage_path?: string
}

interface FileUploadManagerProps {
  files: FileAttachment[]
  onChange: (files: FileAttachment[]) => void
  maxFiles?: number
  maxFileSize?: number  // bytes
  allowedTypes?: string[]
}

export default function FileUploadManager({
  files,
  onChange,
  maxFiles = 3,
  maxFileSize = 5 * 1024 * 1024,  // 5MB
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwp',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
}: FileUploadManagerProps) {
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    // 파일 크기 검사
    if (file.size > maxFileSize) {
      return `파일 크기가 ${maxFileSize / 1024 / 1024}MB를 초과합니다.`
    }

    // 파일 확장자 검사
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['hwp', 'hwpx', 'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return '허용되지 않는 파일 형식입니다. (hwp, hwpx, pdf, doc, docx, jpg, jpeg, png만 가능)'
    }

    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setError(null)

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`최대 ${maxFiles}개의 파일만 첨부할 수 있습니다.`)
      return
    }

    const newFiles: FileAttachment[] = []

    for (const file of selectedFiles) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      newFiles.push({
        file,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream'
      })
    }

    onChange([...files, ...newFiles])
    e.target.value = ''  // input 초기화
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onChange(newFiles)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileName: string) => {
    return <File className="w-4 h-4 text-gray-500" />
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        첨부파일 <span className="text-gray-500">(최대 {maxFiles}개, 파일당 최대 5MB)</span>
      </label>

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(file.file_name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      {files.length < maxFiles && (
        <div>
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              파일 선택 ({files.length}/{maxFiles})
            </span>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept=".hwp,.hwpx,.pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </label>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 허용 파일 형식 안내 */}
      <p className="text-xs text-gray-500">
        허용 파일 형식: hwp, hwpx, pdf, doc, docx, jpg, jpeg, png
      </p>
    </div>
  )
}
