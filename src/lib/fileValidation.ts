/**
 * 파일 업로드 보안 검증 유틸리티
 *
 * 보안 원칙:
 * 1. 화이트리스트 방식: 허용된 파일만 업로드
 * 2. MIME type과 확장자 매칭 확인
 * 3. 서버 사이드 검증 (클라이언트 검증 우회 방지)
 * 4. 파일 크기 제한
 */

// 허용된 확장자 → 해당 확장자에 매칭되는 MIME type 목록
//
// 검증은 "확장자 화이트리스트"를 1차 기준으로 한다.
// MIME 목록이 비어있는([]) 확장자는 MIME 검증을 생략하고 확장자만으로 허용한다.
//
// HWP/HWPX는 한컴오피스 버전(2014/2018/2022)과 OS 레지스트리 설정에 따라
// 브라우저가 보고하는 MIME type이 제각각이다.
//   - 2014: application/haansofthwp, application/octet-stream 등
//   - 2018/2022: application/hwp+zip (HWPX 공식 MIME) 등
// 이 값들을 MIME 화이트리스트로 일일이 막으면 특정 버전이 업로드되지 않으므로
// hwp/hwpx는 확장자만으로 허용한다.
const ALLOWED_EXTENSIONS: Record<string, readonly string[]> = {
  // 문서
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  hwp: [],  // MIME 신뢰 불가 → 확장자만 검증
  hwpx: [], // MIME 신뢰 불가 → 확장자만 검증
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'],

  // 이미지
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],

  // 압축 파일 (필요한 경우만)
  zip: ['application/zip', 'application/x-zip-compressed'],
}

const ALLOWED_EXTENSION_LABEL = 'HWP, HWPX, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, GIF, WEBP, ZIP'

// 이벤트 서류(양식/제출) 전용 허용 확장자 — 공지 첨부보다 좁게 제한한다.
// (스포츠이벤트 스펙: pdf/hwp/hwpx/jpg/jpeg/png)
export const EVENT_DOCUMENT_EXTENSIONS: readonly string[] = ['pdf', 'hwp', 'hwpx', 'jpg', 'jpeg', 'png']

/**
 * 확장자 + MIME type 검증 (확장자 화이트리스트 1차, MIME은 보조)
 *
 * - 확장자가 허용 목록에 없으면 거부
 * - 허용 MIME 목록이 비어있으면(hwp/hwpx 등) 확장자만으로 허용
 * - 브라우저가 MIME을 비워서 보내거나 octet-stream으로 보내면 허용
 *   (브라우저/OS가 MIME을 인식하지 못하는 정상 케이스)
 * - 그 외에는 MIME이 확장자와 일치해야 함
 */
function validateExtensionAndMime(
  filename: string,
  rawMimeType: string,
  allowedExtensions?: readonly string[]
): FileValidationResult {
  const extension = getFileExtension(filename)
  const mimeType = (rawMimeType || '').toLowerCase()

  if (!(extension in ALLOWED_EXTENSIONS)) {
    return {
      valid: false,
      error: `허용되지 않는 파일 형식입니다. 허용 형식: ${ALLOWED_EXTENSION_LABEL}`
    }
  }

  // 호출부가 더 좁은 확장자 집합을 지정하면 그 집합으로 2차 제한한다.
  // (전역 화이트리스트는 MIME 규칙을 얻기 위한 상위 집합이고, 실제 허용은 이 부분집합)
  if (allowedExtensions && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `허용되지 않는 파일 형식입니다. 허용 형식: ${allowedExtensions.map((e) => e.toUpperCase()).join(', ')}`
    }
  }

  const allowedMimes = ALLOWED_EXTENSIONS[extension]

  // MIME을 신뢰할 수 없는 포맷이거나, 브라우저가 MIME을 인식하지 못한 경우 확장자만으로 허용
  if (
    allowedMimes.length === 0 ||
    mimeType === '' ||
    mimeType === 'application/octet-stream' ||
    allowedMimes.includes(mimeType)
  ) {
    return { valid: true }
  }

  return {
    valid: false,
    error: `파일 확장자(${extension})가 파일 형식(${mimeType})과 일치하지 않습니다.`
  }
}

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
  return validateExtensionAndMime(file.name, file.type)
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

  // Storage object key에는 ASCII 안전 문자만 남긴다.
  const safeName = nameWithoutExt
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '_')
    .replace(/[^a-zA-Z0-9\s\-_]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .substring(0, 200)

  const finalName = safeName || 'file'

  return `${finalName}.${extension}`
}

/**
 * 첨부파일 개수 제한 확인
 * @param currentCount 현재 첨부파일 개수
 * @param maxCount 허용되는 최대 개수 (기본값: 공지사항 첨부파일 제한 3개)
 * @returns 검증 결과
 */
export function validateAttachmentCount(
  currentCount: number,
  maxCount: number = MAX_FILES_PER_ANNOUNCEMENT
): FileValidationResult {
  if (currentCount >= maxCount) {
    return {
      valid: false,
      error: `첨부파일은 최대 ${maxCount}개까지만 업로드할 수 있습니다.`
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
  fileType: string,
  allowedExtensions?: readonly string[]
): FileValidationResult {
  // 파일명 검증
  const nameResult = validateFileName(fileName)
  if (!nameResult.valid) return nameResult

  // 확장자 + MIME type 검증 (allowedExtensions 지정 시 그 부분집합으로 제한)
  const typeResult = validateExtensionAndMime(fileName, fileType, allowedExtensions)
  if (!typeResult.valid) return typeResult

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
