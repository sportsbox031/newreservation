/**
 * 파일 업로드 보안 검증 유틸리티
 *
 * 보안 원칙:
 * 1. 화이트리스트 방식: 허용된 파일만 업로드
 * 2. MIME type과 확장자 매칭 확인
 * 3. 서버 사이드 검증 (클라이언트 검증 우회 방지)
 * 4. 파일 크기 제한
 */

// 허용된 파일 타입 (MIME type)
const ALLOWED_MIME_TYPES = {
  // 문서
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'text/plain': ['txt'],

  // 이미지
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],

  // 압축 파일 (필요한 경우만)
  'application/zip': ['zip'],
  'application/x-zip-compressed': ['zip'],
} as const

// 최대 파일 크기 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

// 공지사항당 최대 첨부파일 수
const MAX_FILES_PER_ANNOUNCEMENT = 3

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * 파일 확장자 추출
 * @param filename 파일명
 * @returns 소문자 확장자 (점 제외)
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase()
}

/**
 * 파일 타입 검증 (MIME type + 확장자 매칭)
 * @param file File 객체
 * @returns 검증 결과
 */
export function validateFileType(file: File): FileValidationResult {
  const mimeType = file.type.toLowerCase()
  const extension = getFileExtension(file.name)

  // MIME type이 허용 목록에 있는지 확인
  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    return {
      valid: false,
      error: `허용되지 않는 파일 형식입니다. 허용 형식: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, GIF, WEBP, ZIP`
    }
  }

  // 확장자가 MIME type과 일치하는지 확인
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES]
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `파일 확장자(${extension})가 파일 형식(${mimeType})과 일치하지 않습니다.`
    }
  }

  return { valid: true }
}

/**
 * 파일 크기 검증
 * @param file File 객체
 * @returns 검증 결과
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. (${fileSizeMB}MB / 최대 ${maxSizeMB}MB)`
    }
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: '빈 파일은 업로드할 수 없습니다.'
    }
  }

  return { valid: true }
}

/**
 * 파일명 검증 (보안 위험 문자 체크)
 * @param filename 파일명
 * @returns 검증 결과
 */
export function validateFileName(filename: string): FileValidationResult {
  // 파일명 길이 제한 (255자)
  if (filename.length > 255) {
    return {
      valid: false,
      error: '파일명이 너무 깁니다. (최대 255자)'
    }
  }

  // 위험한 문자 패턴 체크
  const dangerousPatterns = [
    /\.\./,           // 경로 탐색 (..)
    /[<>:"|?*]/,      // Windows 예약 문자
    /[\x00-\x1f]/,    // 제어 문자
    /^\.+$/,          // 숨김 파일 (., .., ...)
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(filename)) {
      return {
        valid: false,
        error: '파일명에 사용할 수 없는 문자가 포함되어 있습니다.'
      }
    }
  }

  return { valid: true }
}

/**
 * 종합 파일 검증
 * @param file File 객체
 * @returns 검증 결과
 */
export function validateFile(file: File): FileValidationResult {
  // 파일명 검증
  const nameResult = validateFileName(file.name)
  if (!nameResult.valid) return nameResult

  // 파일 타입 검증
  const typeResult = validateFileType(file)
  if (!typeResult.valid) return typeResult

  // 파일 크기 검증
  const sizeResult = validateFileSize(file)
  if (!sizeResult.valid) return sizeResult

  return { valid: true }
}

/**
 * 파일명 안전화 (위험 문자 제거)
 * @param filename 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFileName(filename: string): string {
  // 확장자 분리
  const extension = getFileExtension(filename)
  const nameWithoutExt = filename.substring(0, filename.length - extension.length - 1)

  // 안전한 문자만 유지 (한글, 영문, 숫자, 하이픈, 언더스코어, 공백)
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9가-힣\s\-_]/g, '_')
    .replace(/\s+/g, '_')  // 연속 공백을 언더스코어로
    .substring(0, 200)     // 이름 길이 제한

  return `${safeName}.${extension}`
}

/**
 * 첨부파일 개수 제한 확인
 * @param currentCount 현재 첨부파일 개수
 * @returns 검증 결과
 */
export function validateAttachmentCount(currentCount: number): FileValidationResult {
  if (currentCount >= MAX_FILES_PER_ANNOUNCEMENT) {
    return {
      valid: false,
      error: `첨부파일은 최대 ${MAX_FILES_PER_ANNOUNCEMENT}개까지만 업로드할 수 있습니다.`
    }
  }

  return { valid: true }
}

/**
 * 서버 사이드 파일 데이터 검증
 * (API route에서 사용 - File 객체 없이 메타데이터만으로 검증)
 */
export function validateFileMetadata(
  fileName: string,
  fileSize: number,
  fileType: string
): FileValidationResult {
  // 파일명 검증
  const nameResult = validateFileName(fileName)
  if (!nameResult.valid) return nameResult

  // 확장자 검증
  const extension = getFileExtension(fileName)
  const mimeType = fileType.toLowerCase()

  if (!(mimeType in ALLOWED_MIME_TYPES)) {
    return {
      valid: false,
      error: '허용되지 않는 파일 형식입니다.'
    }
  }

  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES]
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: '파일 확장자가 파일 형식과 일치하지 않습니다.'
    }
  }

  // 크기 검증
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `파일 크기가 제한을 초과했습니다. (최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    }
  }

  if (fileSize === 0) {
    return {
      valid: false,
      error: '빈 파일은 업로드할 수 없습니다.'
    }
  }

  return { valid: true }
}
