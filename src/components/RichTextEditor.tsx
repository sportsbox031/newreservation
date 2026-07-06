'use client'

import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import {
  Type,
  Code,
  FileText,
  AlertTriangle,
  Pencil
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type EditorMode = 'text' | 'html' | 'markdown'

/**
 * XSS 방지를 위한 HTML 새니타이징 함수
 * DOMPurify를 사용하여 안전한 HTML만 허용
 * <style>, <script> 등은 허용 목록에 없어 제거됨 → 작성한 HTML은
 * 해당 콘텐츠 영역에만 적용되고 페이지 전체에는 영향을 주지 않는다.
 */
export const sanitizeHtml = (html: string): string => {
  // 브라우저 환경에서만 DOMPurify 실행
  if (typeof window === 'undefined') {
    return html
  }

  // DOMPurify 설정: 안전한 태그와 속성만 허용
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'code', 'pre', 'blockquote',
      'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'hr', 'section', 'article', 'header', 'footer'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel',
      'class', 'id', 'style',
      'colspan', 'rowspan',
      'src', 'alt', 'width', 'height'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true
  })

  return clean
}

// 마크다운을 HTML로 변환하는 간단한 함수 (HomepagePopup 등에서도 공용 사용)
export const markdownToHtml = (markdown: string): string => {
  let html = markdown

  // 헤딩
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>')

  // 볼드
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')

  // 이탤릭
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')

  // 링크
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // 코드
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 리스트
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')

  // 줄바꿈
  html = html.replace(/\n/g, '<br>')

  return html
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [mode, setMode] = useState<EditorMode>('text')
  const [showPreview, setShowPreview] = useState(false)
  // 마크다운 모드에서 사용자가 입력 중인 원본(변환 전) 텍스트.
  // 저장값(value)은 항상 변환된 HTML이므로, 원본을 따로 들고 있어야
  // 타이핑할 때마다 재변환되어 내용이 깨지는 문제가 생기지 않는다.
  const [markdownDraft, setMarkdownDraft] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // 외부(텍스트 영역) 변경을 미리보기에 반영.
  // 미리보기 자체를 편집 중일 때는 덮어쓰지 않는다(커서 위치 유지).
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    if (document.activeElement === el) return
    const html = sanitizeHtml(value)
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [value, showPreview])

  // 미리보기에서 직접 수정한 내용을 HTML 원본(value)에 즉시 반영
  const handlePreviewInput = () => {
    const el = previewRef.current
    if (!el) return
    // 미리보기를 편집한 순간부터는 변환된 HTML이 원본이 된다
    if (markdownDraft !== null) setMarkdownDraft(null)
    onChange(sanitizeHtml(el.innerHTML))
  }

  // 편집 종료 시 새니타이징된 최종 HTML로 미리보기 내용을 정규화
  const handlePreviewBlur = () => {
    const el = previewRef.current
    if (!el) return
    const html = sanitizeHtml(el.innerHTML)
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
    onChange(html)
  }

  const switchMode = (nextMode: EditorMode) => {
    setMode(nextMode)
    setMarkdownDraft(null)
  }

  const getDisplayValue = () => {
    if (mode === 'text') {
      // 텍스트 모드에서는 <br>을 줄바꿈으로 변환하여 표시
      return value.replace(/<br\s*\/?>/gi, '\n')
    } else if (mode === 'markdown') {
      // 입력 중인 마크다운 원본이 있으면 그것을 표시
      return markdownDraft ?? value
    } else {
      // HTML 모드에서는 그대로 표시
      return value
    }
  }

  const handleContentChange = (newValue: string) => {
    if (mode === 'html') {
      // HTML 모드에서는 새니타이징 적용
      const sanitized = sanitizeHtml(newValue)
      onChange(sanitized)
    } else if (mode === 'markdown') {
      // 마크다운 모드에서는 원본을 보관하고 HTML로 변환해서 저장
      setMarkdownDraft(newValue)
      onChange(markdownToHtml(newValue))
    } else if (mode === 'text') {
      // 텍스트 모드에서는 줄바꿈을 <br>로 변환하여 저장
      const htmlContent = newValue.replace(/\n/g, '<br>')
      onChange(htmlContent)
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* 에디터 헤더 */}
      <div className="bg-gray-50 border-b border-gray-300 p-3">
        <div className="flex items-center justify-between">
          {/* 모드 전환 버튼들 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchMode('text')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Type className="w-4 h-4 inline mr-1" />
              텍스트
            </button>
            <button
              type="button"
              onClick={() => switchMode('html')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'html'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Code className="w-4 h-4 inline mr-1" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => switchMode('markdown')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'markdown'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              마크다운
            </button>
          </div>

          {/* HTML 모드 경고 */}
          {mode === 'html' && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">HTML 코드는 보안을 위해 필터링됩니다</span>
            </div>
          )}
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="min-h-[200px]">
        <textarea
          id="content-editor"
          value={getDisplayValue()}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full h-64 p-4 resize-none focus:outline-none text-sm"
          style={{
            fontFamily: mode === 'text' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'monospace'
          }}
          placeholder={
            mode === 'text'
              ? '공지사항 내용을 입력하세요...'
              : mode === 'html'
              ? 'HTML 코드를 입력하세요...\n\n예시:\n<div style="padding: 20px;">\n  <h1>제목</h1>\n  <p>내용</p>\n</div>'
              : '마크다운을 입력하세요...\n\n예시:\n# 제목\n**굵은글씨**\n*기울임*\n[링크](http://example.com)\n- 목록'
          }
        />
      </div>

      {/* 미리보기 (직접 편집 가능 — 수정하면 HTML 원본에 바로 반영) */}
      {showPreview && (
        <div className="border-t border-gray-300">
          <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 flex items-center gap-2">
            미리보기
            <span className="flex items-center gap-1 text-xs font-normal text-blue-600">
              <Pencil className="w-3 h-3" />
              텍스트를 클릭해 바로 수정할 수 있습니다 (HTML에 자동 반영)
            </span>
          </div>
          <div
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handlePreviewInput}
            onBlur={handlePreviewBlur}
            className="p-4 prose prose-sm max-w-none min-h-[80px] cursor-text focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset"
          />
        </div>
      )}

      {/* 하단 도구 */}
      <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showPreview ? '미리보기 숨기기' : '미리보기'}
          </button>
          <span className="text-gray-500">
            {value.length} 문자
          </span>
        </div>

        <div className="text-gray-500">
          {mode === 'text' && '텍스트 모드'}
          {mode === 'html' && 'HTML 모드 (보안 필터링 적용)'}
          {mode === 'markdown' && '마크다운 모드'}
        </div>
      </div>
    </div>
  )
}
