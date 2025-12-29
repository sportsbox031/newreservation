'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { announcementAPI } from '@/lib/supabase'
import { sanitizeHtml } from '@/components/RichTextEditor'
import HomepagePopup from '@/components/HomepagePopup'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'all' | 'region'
  is_important: boolean
  created_at: string
  updated_at: string
  admins: {
    username: string
  }
  regions?: {
    name: string
  }
}

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await announcementAPI.getPublicAnnouncements()

      if (error) {
        console.error('공지사항 로드 오류:', error)
      } else {
        // 중요 공지를 최상단에 표시하고, 그 다음 최신순으로 정렬
        const sortedData = (data || [])
          .sort((a, b) => {
            // 1순위: 중요 공지 우선
            if (a.is_important !== b.is_important) {
              return b.is_important ? 1 : -1
            }
            // 2순위: 최신순
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          .slice(0, 5)
        setAnnouncements(sortedData)
      }
    } catch (error) {
      console.error('공지사항 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setShowModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const stripHtml = (html: string) => {
    if (!html) return ''

    // 향상된 HTML 및 CSS 제거 - 미리보기용
    return html
      // CSS 스타일 블록 완전 제거 (스타일 태그와 내용)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // 스크립트 태그와 내용 제거
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // 모든 HTML 태그 제거
      .replace(/<[^>]*>/g, '')
      // CSS 선언 (body { font-family 등) 제거
      .replace(/[a-zA-Z-]+\s*\{\s*[^}]*\}/g, '')
      // CSS 속성 (font-family:, color: 등) 제거
      .replace(/[a-zA-Z-]+\s*:\s*[^;]+;/g, '')
      // HTML 엔터티 디코딩
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[^;]+;/g, ' ')
      // 연속된 공백을 하나로 정리
      .replace(/\s+/g, ' ')
      .trim()
  }

  const truncateContent = (content: string, maxLength: number = 80) => {
    // HTML 태그를 제거한 후 텍스트만 추출
    const textOnly = stripHtml(content)
    if (textOnly.length <= maxLength) return textOnly
    return textOnly.substring(0, maxLength) + '...'
  }
  return (
    <div className="bg-white">
      {/* Header */}
      <header className="fixed w-full bg-white shadow-sm z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/110ce5261818cd69133e46ef8c6b097a.png"
                alt="경기도체육회 로고"
                className="h-10"
              />
              <div className="text-2xl font-bold text-[#0066CC]">스포츠박스</div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#notices" className="text-gray-700 hover:text-[#0066CC] py-2">공지사항</a>
              <a href="#intro" className="text-gray-700 hover:text-[#0066CC] py-2">사업소개</a>
              <a href="#programs" className="text-gray-700 hover:text-[#0066CC] py-2">운영프로그램</a>
              <a href="#process" className="text-gray-700 hover:text-[#0066CC] py-2">신청절차</a>
              <a href="#faq" className="text-gray-700 hover:text-[#0066CC] py-2">자주 묻는 질문</a>
              <Link
                href="/auth/login"
                className="bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90"
              >
                회원가입/로그인
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* 메인 비주얼 섹션 */}
        <section
          className="relative h-[600px] bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('https://raw.githubusercontent.com/sportsbox031/sports/main/메인사진2.png')",
            backgroundPosition: 'center 20%',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="container mx-auto px-6 relative h-full flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-6xl font-bold mb-6 text-white drop-shadow-lg">SPORTS BOX</h1>
              <h2 className="text-4xl font-bold mb-6 text-[#0066CC] drop-shadow">모두를 위한 스포츠</h2>
              <p className="text-xl mb-8 text-white drop-shadow-lg">경기도체육회 스포츠박스가 여러분의 건강한 생활을 지원합니다</p>
              <Link
                href="/auth/login"
                className="rounded-lg bg-[#0066CC] text-white px-8 py-3 text-lg hover:bg-[#0066CC]/90 inline-block"
              >
                예약하기
              </Link>
            </div>
          </div>
        </section>

        {/* 사업소개 및 공지사항 섹션 */}
        <section id="intro" className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* 왼쪽: 사업소개 */}
              <div>
                <h2 className="text-3xl font-bold mb-8">사업소개</h2>
                <div className="mb-6">
                  <img
                    src="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/37e4760851bd5a23c2838ccd027fd4f3.png"
                    className="w-full h-auto rounded-lg shadow-lg"
                    alt="스포츠박스 활동"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">찾아가는 스포츠 프로그램</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    스포츠박스는 경기도민의 건강한 생활을 위해 찾아가는 스포츠 프로그램을 운영합니다.
                    스포츠 취약계층을 위한 맞춤형 프로그램과 다양한 체험 기회를 제공하여
                    모든 도민이 스포츠를 즐길 수 있도록 지원합니다.
                  </p>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <i className="ri-user-heart-line text-[#0066CC] text-xl"></i>
                      <span>취약계층 지원</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="ri-community-line text-[#0066CC] text-xl"></i>
                      <span>생활체육 활성화</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 공지사항 */}
              <div id="notices">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold">공지사항</h2>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6 max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">등록된 공지사항이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          onClick={() => handleAnnouncementClick(announcement)}
                          className={`
                            notice-item cursor-pointer border border-gray-200 p-4 rounded-lg hover:shadow-md transition-all duration-200
                            ${announcement.is_important ? 'bg-orange-50 border-orange-200' : ''}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {announcement.is_important && (
                                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                                    중요
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  announcement.target_type === 'all'
                                    ? 'bg-blue-100 text-blue-800'
                                    : announcement.regions?.name === '경기남부'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {announcement.target_type === 'all' ? '전체 공지' : `${announcement.regions?.name || '지역'} 공지`}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                                {announcement.title}
                              </h4>
                              <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                                {truncateContent(announcement.content, 80)}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{formatDate(announcement.created_at)}</span>
                                <span>작성자: {announcement.admins.username}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 운영프로그램 섹션 */}
        <section id="programs" className="py-20">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16">운영프로그램</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="program-card relative rounded-lg overflow-hidden shadow-lg">
                <img
                  src="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/32c46d527cf6d2a7c9d564083dfe5195.png"
                  className="w-full h-[300px] object-cover"
                  alt="스포츠교실"
                />
                <div className="p-6 bg-white">
                  <h3 className="text-xl font-bold mb-3">스포츠교실</h3>
                  <p className="text-gray-600 mb-4">전문 강사진이 직접 찾아가는 뉴스포츠 프로그램</p>
                  <a
                    href="https://www.youtube.com/watch?v=ui3qOANOOTI"
                    target="_blank"
                    className="inline-block bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90"
                  >
                    자세히보기
                  </a>
                </div>
              </div>
              <div className="program-card relative rounded-lg overflow-hidden shadow-lg">
                <img
                  src="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/44959af536d5400000e12357a5586b8f.png"
                  className="w-full h-[300px] object-cover"
                  alt="스포츠체험존"
                />
                <div className="p-6 bg-white">
                  <h3 className="text-xl font-bold mb-3">스포츠체험존</h3>
                  <p className="text-gray-600 mb-4">경기도 내 스포츠대회 및 지자체 축제 연계 체험존 운영</p>
                  <a
                    href="https://www.youtube.com/watch?v=cdOh5nLmQ-o"
                    target="_blank"
                    className="inline-block bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90"
                  >
                    자세히보기
                  </a>
                </div>
              </div>
              <div className="program-card relative rounded-lg overflow-hidden shadow-lg">
                <img
                  src="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/ca135fc96b572c92d6c08bfcc5782da7.png"
                  className="w-full h-[300px] object-cover"
                  alt="스포츠이벤트"
                />
                <div className="p-6 bg-white">
                  <h3 className="text-xl font-bold mb-3">스포츠이벤트</h3>
                  <p className="text-gray-600 mb-4">수상레저스포츠, 스키교실 등 특별 프로그램 운영</p>
                  <a
                    href="https://www.youtube.com/watch?v=4nyB-iATP5k"
                    target="_blank"
                    className="inline-block bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90"
                  >
                    자세히보기
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 신청절차 섹션 */}
        <section id="process" className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16">신청절차</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* 1번째 줄 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-[#0066CC] hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#0066CC] text-white rounded-full flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold ml-3">회원가입</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">✏️</div>
                  <p className="text-gray-600">관리자 승인 대기</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-blue-400 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-bold ml-3">로그인</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">🔑</div>
                  <p className="text-gray-600">승인완료 후 로그인</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-indigo-400 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-bold ml-3">날짜/시간 선택</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">📅</div>
                  <p className="text-gray-600">희망 일정 예약</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-purple-400 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    4
                  </div>
                  <h3 className="text-xl font-bold ml-3">승인 대기</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">⏳</div>
                  <p className="text-gray-600">관리자 검토 중</p>
                </div>
              </div>

              {/* 2번째 줄 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-green-400 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    5
                  </div>
                  <h3 className="text-xl font-bold ml-3">관리자 승인</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">✅</div>
                  <p className="text-gray-600">예약 승인 완료</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-yellow-400 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-yellow-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    6
                  </div>
                  <h3 className="text-xl font-bold ml-3">예약확정</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">🎫</div>
                  <p className="text-gray-600">서비스 이용 가능</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-orange-400 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    7
                  </div>
                  <h3 className="text-xl font-bold ml-3">예약 정보확인</h3>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl mb-3">📋</div>
                  <p className="text-gray-600">대시보드에서 확인</p>
                </div>
              </div>

              {/* 버튼 섹션 */}
              <div className="bg-gradient-to-r from-[#0066CC] to-[#0066CC]/80 rounded-xl p-6 shadow-lg flex flex-col justify-center items-center text-white">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold mb-2">지금 바로 시작하세요!</h3>
                <p className="mb-4 text-white/80 text-center">예약 및 관리가 편리합니다</p>
                <Link
                  href="/auth/login"
                  className="bg-white text-[#0066CC] font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-md"
                >
                  시작하기
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 자주 묻는 질문 섹션 */}
        <section id="faq" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16">자주 묻는 질문</h2>
            <div className="max-w-3xl mx-auto">
              {/* 질문 1 */}
              <div className="mb-8 bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#0066CC] text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">Q</span>
                    요일을 지정해서 정기적으로 운영해주실 수 있나요?
                  </h3>
                  <div className="pl-11">
                    <p className="text-gray-600">정기 운영은 현재 어렵습니다. 저희는 더 많은 아이들에게 공평한 혜택을 제공하기 위해 매월 선착순 접수 방식으로 운영하고 있습니다.</p>
                  </div>
                </div>
              </div>

              {/* 질문 2 */}
              <div className="mb-8 bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#0066CC] text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">Q</span>
                    스포츠체험존은 어떻게 운영되나요?
                  </h3>
                  <div className="pl-11">
                    <p className="text-gray-600">스포츠체험존은 도내 공직유관단체 및 지자체에서 진행하는 행사를 대상으로 운영됩니다. 체험존에서는 한궁체험, 후크볼, 배팅체험, 탁구(스파이더볼) 등 다양한 스포츠 활동을 체험하실 수 있습니다.</p>
                  </div>
                </div>
              </div>

              {/* 질문 3 */}
              <div className="mb-8 bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#0066CC] text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">Q</span>
                    스포츠이벤트는 누구나 신청 가능한가요?
                  </h3>
                  <div className="pl-11">
                    <p className="text-gray-600">스포츠이벤트는 스포츠교실 참여자에 한하여 신청 가능합니다. 계절에 따라 여름에는 수상레저스포츠, 겨울에는 스키교실을 운영하고 있으니 많은 관심 부탁드립니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 푸터 */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4">스포츠박스</h3>
                <p className="text-gray-400">경기도체육회</p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">연락처</h3>
                <p className="text-gray-400">전화: 031-250-0474~7</p>
                <p className="text-gray-400">이메일: <a href="mailto:hoseok0119@ggsc.or.kr" className="hover:text-white">hoseok0119@ggsc.or.kr</a></p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">운영시간</h3>
                <p className="text-gray-400">평일: 09:00 - 18:00</p>
                <p className="text-gray-400">주말 및 공휴일 휴무</p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">SNS</h3>
                <div className="flex space-x-4">
                  <a
                    href="https://www.youtube.com/@%EC%8A%A4%ED%8F%AC%EC%B8%A0%EB%B0%95%EC%8A%A4-l7e"
                    target="_blank"
                    className="text-gray-400 hover:text-white"
                  >
                    <i className="ri-youtube-fill text-xl"></i>
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 경기도체육회 스포츠박스. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>

      {/* 공지사항 상세 모달 */}
      {showModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedAnnouncement.is_important && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        중요
                      </span>
                    )}
                    {selectedAnnouncement.target_type === 'all' ? (
                      <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        전체 공지
                      </span>
                    ) : (
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        selectedAnnouncement.regions?.name === '경기남부'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedAnnouncement.regions?.name || '지역'} 공지
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedAnnouncement.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>작성자: {selectedAnnouncement.admins.username}</span>
                    <span>작성일: {formatDate(selectedAnnouncement.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="prose max-w-none">
                <div
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: selectedAnnouncement.content
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 홈페이지 초기 팝업 */}
      <HomepagePopup />
    </div>
  );
}
