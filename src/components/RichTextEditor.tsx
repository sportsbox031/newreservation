'use client'

import { useState } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  Link2, 
  List, 
  ListOrdered, 
  Type, 
  Code, 
  Eye,
  FileText,
  AlertTriangle
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type EditorMode = 'visual' | 'html' | 'markdown'

// XSS 방지를 위한 HTML 새니타이징 함수 (개선된 버전) - export for reuse
export const sanitizeHtml = (html: string): string => {
  // 위험한 태그들 제거 (스타일 태그는 허용)
  const dangerousTags = /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|<object[^>]*>.*?<\/object>|<embed[^>]*>|<link[^>]*>|<meta[^>]*>/gi
  let sanitized = html.replace(dangerousTags, '')
  
  // 위험한 속성들 제거 (보다 정교한 패턴)
  const dangerousAttributes = /\s*(on\w+|javascript:|vbscript:|mocha:|livescript:|expression\()="?[^"\s>]*"?/gi
  sanitized = sanitized.replace(dangerousAttributes, '')
  
  // 허용된 태그 대폭 확장 (스타일 태그 포함)
  const allowedTags = /^<\/?(?:p|br|strong|em|u|h[1-6]|ul|ol|li|a|code|pre|blockquote|div|span|style|body|html|head|title)(?:\s[^>]*)?>/i
  const htmlTags = sanitized.match(/<[^>]+>/g) || []
  
  // 위험한 태그만 제거 (허용된 태그는 유지)
  htmlTags.forEach(tag => {
    if (!allowedTags.test(tag)) {
      // script, iframe 등만 제거
      if (/<\/?(?:script|iframe|object|embed|link|meta)/i.test(tag)) {
        sanitized = sanitized.replace(tag, '')
      }
    }
  })
  
  return sanitized
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual')
  const [showPreview, setShowPreview] = useState(false)

  // Markdown을 HTML로 변환하는 간단한 함수
  const markdownToHtml = (markdown: string): string => {
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
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // 줄바꿈
    html = html.replace(/\n/g, '<br>')
    
    return html
  }

  // 텍스트 포맷팅 도구 함수들
  const applyFormat = (tag: string) => {
    const textarea = document.querySelector('#content-editor') as HTMLTextAreaElement
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    let newText = value
    
    switch (tag) {
      case 'bold':
        newText = value.substring(0, start) + `<strong>${selectedText}</strong>` + value.substring(end)
        break
      case 'italic':
        newText = value.substring(0, start) + `<em>${selectedText}</em>` + value.substring(end)
        break
      case 'underline':
        newText = value.substring(0, start) + `<u>${selectedText}</u>` + value.substring(end)
        break
      case 'link':
        const url = prompt('링크 URL을 입력하세요:')
        if (url) {
          newText = value.substring(0, start) + `<a href="${url}">${selectedText || url}</a>` + value.substring(end)
        }
        break
      case 'ul':
        newText = value.substring(0, start) + `<ul><li>${selectedText}</li></ul>` + value.substring(end)
        break
      case 'ol':
        newText = value.substring(0, start) + `<ol><li>${selectedText}</li></ol>` + value.substring(end)
        break
      case 'code':
        newText = value.substring(0, start) + `<code>${selectedText}</code>` + value.substring(end)
        break
    }
    
    onChange(newText)
  }

  const getDisplayValue = () => {
    if (mode === 'markdown') {
      return value
    } else if (mode === 'html') {
      return value
    } else {
      // Visual 모드에서는 HTML을 렌더링
      return value
    }
  }

  const handleContentChange = (newValue: string) => {
    if (mode === 'html') {
      // HTML 모드에서는 새니타이징 적용
      const sanitized = sanitizeHtml(newValue)
      onChange(sanitized)
    } else if (mode === 'markdown') {
      // 마크다운 모드에서는 HTML로 변환해서 저장
      const htmlContent = markdownToHtml(newValue)
      onChange(htmlContent)
    } else {
      onChange(newValue)
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
              onClick={() => setMode('visual')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'visual' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              비주얼
            </button>
            <button
              type="button"
              onClick={() => setMode('html')}
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
              onClick={() => setMode('markdown')}
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

          {/* 도구 버튼들 (비주얼 모드에서만) */}
          {mode === 'visual' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyFormat('bold')}
                className="p-2 hover:bg-gray-200 rounded"
                title="굵게"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('italic')}
                className="p-2 hover:bg-gray-200 rounded"
                title="기울임"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('underline')}
                className="p-2 hover:bg-gray-200 rounded"
                title="밑줄"
              >
                <Underline className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                type="button"
                onClick={() => applyFormat('link')}
                className="p-2 hover:bg-gray-200 rounded"
                title="링크"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('ul')}
                className="p-2 hover:bg-gray-200 rounded"
                title="순서 없는 목록"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('ol')}
                className="p-2 hover:bg-gray-200 rounded"
                title="순서 있는 목록"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('code')}
                className="p-2 hover:bg-gray-200 rounded"
                title="코드"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>
          )}

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
        {mode === 'visual' ? (
          <div
            contentEditable
            className="p-4 min-h-[200px] focus:outline-none prose prose-sm max-w-none"
            style={{
              // CSS 격리를 위한 스타일
              isolation: 'isolate',
              contain: 'layout style'
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
            onInput={(e) => {
              const content = (e.target as HTMLDivElement).innerHTML
              handleContentChange(content)
            }}
            onPaste={(e) => {
              e.preventDefault()
              const text = e.clipboardData?.getData('text/plain') || ''
              document.execCommand('insertText', false, text)
            }}
          />
        ) : (
          <textarea
            id="content-editor"
            value={getDisplayValue()}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-64 p-4 resize-none focus:outline-none font-mono text-sm"
            placeholder={
              mode === 'html' 
                ? 'HTML 코드를 입력하세요...' 
                : mode === 'markdown'
                ? '마크다운을 입력하세요...\n\n예시:\n# 제목\n**굵은글씨**\n*기울임*\n[링크](http://example.com)\n- 목록'
                : placeholder
            }
          />
        )}
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="border-t border-gray-300">
          <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
            미리보기
          </div>
          <div 
            className="p-4 prose prose-sm max-w-none"
            style={{
              // CSS 격리를 위한 스타일
              isolation: 'isolate',
              contain: 'layout style'
            }}
            dangerouslySetInnerHTML={{ 
              __html: sanitizeHtml(mode === 'markdown' ? markdownToHtml(value) : value) 
            }}
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
          {mode === 'visual' && '비주얼 에디터'}
          {mode === 'html' && 'HTML 모드 (보안 필터링 적용)'}
          {mode === 'markdown' && '마크다운 모드'}
        </div>
      </div>
    </div>
  )
}