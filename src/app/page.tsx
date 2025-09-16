"use client"

import { useState, useEffect } from "react"
import Link from "next/link";
import { Calendar, Users, MapPin, Clock, Shield, Award, BookOpen, Phone, Bell, ChevronRight, AlertCircle, Eye, MessageCircle } from "lucide-react";
import { announcementAPI } from '@/lib/supabase'
import { sanitizeHtml } from '@/components/RichTextEditor'
import HomepagePopup from '@/components/HomepagePopup'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'all' | 'region'
  is_important: boolean
  view_count: number
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
      // 홈페이지에서는 전체 공지만 표시 (최대 3개)
      const { data, error } = await announcementAPI.getPublicAnnouncements()
      
      if (error) {
        console.error('공지사항 로드 오류:', error)
      } else {
        // 최신순으로 정렬하고 최대 3개만 표시
        const sortedData = (data || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
        setAnnouncements(sortedData)
      }
    } catch (error) {
      console.error('공지사항 로드 예외:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnnouncementClick = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setShowModal(true)
    
    // 조회수 증가 (비로그인 사용자는 로컬 상태만 업데이트)
    try {
      const userInfo = localStorage.getItem('userInfo')
      const userId = userInfo ? JSON.parse(userInfo).id : null
      
      if (userId) {
        await announcementAPI.incrementViewCount(announcement.id, userId)
      }
      
      // 로컬 상태 업데이트
      setAnnouncements(prev => 
        prev.map(item => 
          item.id === announcement.id 
            ? { ...item, view_count: item.view_count + 1 }
            : item
        )
      )
    } catch (error) {
      console.error('조회수 증가 오류:', error)
      // 에러가 발생해도 로컬 상태는 업데이트
      setAnnouncements(prev => 
        prev.map(item => 
          item.id === announcement.id 
            ? { ...item, view_count: item.view_count + 1 }
            : item
        )
      )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const truncateContent = (content: string, maxLength: number = 60) => {
    // HTML 태그 제거 후 텍스트만 추출
    const textOnly = content.replace(/<[^>]*>/g, '').trim()
    if (textOnly.length <= maxLength) return textOnly
    return textOnly.substring(0, maxLength) + '...'
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더/네비게이션 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sports-box-gradient rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">경기도체육회</h1>
                <p className="text-sm text-blue-600">스포츠박스 예약시스템</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#" className="text-gray-700 hover:text-blue-600 font-medium">사업소개</Link>
              <Link href="#" className="text-gray-700 hover:text-blue-600 font-medium">운영프로그램</Link>
              <Link href="#" className="text-gray-700 hover:text-blue-600 font-medium">신청절차</Link>
              <Link href="/announcements" className="text-gray-700 hover:text-blue-600 font-medium">공지사항</Link>
              <Link href="#" className="text-gray-700 hover:text-blue-600 font-medium">FAQ</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                로그인
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 히어로 섹션 */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              모두를 위한
              <span className="block text-blue-600">스포츠박스</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              경기도 전 지역을 찾아가는 체육프로그램으로 누구나 쉽게 스포츠를 즐길 수 있습니다.
              간편한 온라인 예약으로 건강한 생활을 시작하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
              >
                <Calendar className="w-5 h-5 mr-2" />
                예약하기
              </Link>
              <Link
                href="#programs"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                프로그램 안내
              </Link>
              <a
                href="https://open.kakao.com/o/sgewClQh"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                톡으로 문의하기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 공지사항 섹션 - 상단에 배치 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bell className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">공지사항</h2>
            </div>
            <p className="text-lg text-gray-600">스포츠박스 관련 중요한 소식을 확인하세요</p>
          </div>
          
          {/* 실시간 공지사항 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100">
            {loading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                  </div>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">등록된 공지사항이 없습니다</p>
                <p className="text-sm mb-6">관리자가 공지사항을 등록하면 여기에 표시됩니다.</p>
                
                <div className="mt-6">
                  <Link 
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    로그인하여 맞춤 공지사항 확인하기
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-8">
                {/* 실제 공지사항 리스트 */}
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      onClick={() => handleAnnouncementClick(announcement)}
                      className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Bell className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {announcement.is_important && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                중요
                              </span>
                            )}
                            {announcement.target_type === 'all' ? (
                              <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                전체 공지
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                {announcement.regions?.name || '지역'} 공지
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {announcement.title}
                          </h3>
                          
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {truncateContent(announcement.content, 80)}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(announcement.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{announcement.view_count}회 조회</span>
                            </div>
                            <span>작성자: {announcement.admins.username}</span>
                            <span className="text-blue-600 font-medium ml-auto">자세히 보기 →</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-8 text-center">
                    <Link 
                      href="/announcements"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      <Bell className="w-5 h-5" />
                      모든 공지사항 보기
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 주요 특징 섹션 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">스포츠박스의 특징</h2>
            <p className="text-lg text-gray-600">경기도 전 지역에서 누구나 이용할 수 있는 체육프로그램</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center card-hover p-6 rounded-xl bg-blue-50">
              <div className="w-16 h-16 sports-box-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">찾아가는 서비스</h3>
              <p className="text-gray-600">
                경기남부·북부 31개 시·군 어디든 찾아가서 프로그램을 제공합니다.
              </p>
            </div>
            <div className="text-center card-hover p-6 rounded-xl bg-green-50">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">다양한 대상</h3>
              <p className="text-gray-600">
                초등학생부터 일반인까지 연령별 맞춤 프로그램을 운영합니다.
              </p>
            </div>
            <div className="text-center card-hover p-6 rounded-xl bg-yellow-50">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">간편한 예약</h3>
              <p className="text-gray-600">
                온라인으로 쉽고 빠르게 예약할 수 있으며, 실시간으로 확인 가능합니다.
              </p>
            </div>
            <div className="text-center card-hover p-6 rounded-xl bg-purple-50">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">안전한 운영</h3>
              <p className="text-gray-600">
                전문 지도자와 안전한 장비로 안심하고 참여할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 운영 프로그램 섹션 */}
      <section id="programs" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">운영 프로그램</h2>
            <p className="text-lg text-gray-600">다양한 체육 활동을 통해 건강하고 즐거운 시간을 보내세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-md overflow-hidden card-hover">
              <div className="h-48 sports-box-gradient flex items-center justify-center">
                <Users className="w-16 h-16 text-white" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">스포츠교실</h3>
                <p className="text-gray-600 mb-4">
                  다양한 종목의 스포츠를 체계적으로 배울 수 있는 교육 프로그램입니다.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• 축구, 농구, 배구 등 구기 종목</li>
                  <li>• 연령별 맞춤 커리큘럼</li>
                  <li>• 전문 지도자 지도</li>
                </ul>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md overflow-hidden card-hover">
              <div className="h-48 bg-green-500 flex items-center justify-center">
                <MapPin className="w-16 h-16 text-white" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">스포츠체험존</h3>
                <p className="text-gray-600 mb-4">
                  다양한 스포츠를 체험해볼 수 있는 참여형 프로그램입니다.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• 뉴스포츠 체험</li>
                  <li>• 가족 단위 참여 가능</li>
                  <li>• 장비 무료 제공</li>
                </ul>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md overflow-hidden card-hover">
              <div className="h-48 bg-yellow-500 flex items-center justify-center">
                <Award className="w-16 h-16 text-white" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">스포츠이벤트</h3>
                <p className="text-gray-600 mb-4">
                  지역 주민이 함께하는 다양한 스포츠 행사와 대회입니다.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• 지역별 스포츠 대회</li>
                  <li>• 가족 운동회</li>
                  <li>• 시즌별 특별 이벤트</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 신청 절차 섹션 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">신청 절차</h2>
            <p className="text-lg text-gray-600">간단한 7단계로 스포츠박스 프로그램을 신청하세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {[
              { step: 1, title: "회원가입", desc: "단체명으로 가입" },
              { step: 2, title: "승인 대기", desc: "관리자 승인" },
              { step: 3, title: "로그인", desc: "승인 후 로그인" },
              { step: 4, title: "날짜 선택", desc: "달력에서 선택" },
              { step: 5, title: "프로그램 선택", desc: "시간·장소 입력" },
              { step: 6, title: "예약 신청", desc: "신청서 제출" },
              { step: 7, title: "최종 승인", desc: "프로그램 확정" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 sports-box-gradient rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">{item.step}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
                {index < 6 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/auth/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-flex items-center"
            >
              지금 시작하기
            </Link>
          </div>
        </div>
      </section>


      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 sports-box-gradient rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">경기도체육회</h3>
                  <p className="text-sm text-gray-400">스포츠박스</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                경기도 전 지역을 찾아가는 체육프로그램으로 건강한 경기도를 만들어갑니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">프로그램</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">스포츠교실</Link></li>
                <li><Link href="#" className="hover:text-white">스포츠체험존</Link></li>
                <li><Link href="#" className="hover:text-white">스포츠이벤트</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/announcements" className="hover:text-white">공지사항</Link></li>
                <li><Link href="#" className="hover:text-white">FAQ</Link></li>
                <li><Link href="#" className="hover:text-white">이용약관</Link></li>
                <li><Link href="#" className="hover:text-white">개인정보처리방침</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">연락처</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>031-123-4567</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>경기도 수원시 영통구</span>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="https://open.kakao.com/o/sgewClQh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  톡으로 문의하기
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 경기도체육회. All rights reserved.</p>
          </div>
        </div>
      </footer>

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
                        <AlertCircle className="w-3 h-3" />
                        중요
                      </span>
                    )}
                    {selectedAnnouncement.target_type === 'all' ? (
                      <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        전체 공지
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
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
                    <span>조회: {selectedAnnouncement.view_count}회</span>
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
                  style={{
                    isolation: 'isolate',
                    contain: 'layout style'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(selectedAnnouncement.content)
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
