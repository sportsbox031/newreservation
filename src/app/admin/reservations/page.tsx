'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  X,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  Building,
  AlertTriangle,
  RefreshCw,
  List,
  Grid3X3,
  UserCheck,
  UserX,
  Trash2,
  Timer,
  GraduationCap,
  Download,
  Users2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { settingsAPI, reservationAPI } from '@/lib/supabase';
import AdminNavigation from '@/components/AdminNavigation';

type CalendarValue = Date | null | [Date | null, Date | null];

// 예약 상태 타입
type ReservationStatus = 'pending' | 'approved' | 'cancelled' | 'admin_cancelled' | 'rejected' | 'cancel_requested';

// 예약 데이터 타입
interface Reservation {
  id: string;
  date: Date;
  status: ReservationStatus;
  user_id: string;
  organization_name: string;
  manager_name: string;
  phone: string;
  email: string;
  slots: {
    startTime: string;
    endTime: string;
    grade: string;
    participantCount: number;
    location: string;
  }[];
  created_at: Date;
}

// 달력 날짜 상태 타입
type DayStatus = 'available' | 'limited' | 'full' | 'blocked' | 'closed';

// 모달 타입
type ModalType = 'reservationList' | 'reservationDetail' | null;

export default function AdminReservationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // 예약 현황 상태
  const [reservationStatus, setReservationStatus] = useState<{
    [date: string]: { current: number; max: number; isFull: boolean; isOpen: boolean }
  }>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [dayReservations, setDayReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [adminRegion, setAdminRegion] = useState<'south' | 'north'>('south');
  const [isMonthClosed, setIsMonthClosed] = useState(true);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 뷰 모드 상태 추가
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // 데이터 로드 (월 변경이나 지역 변경 시 실행)
  useEffect(() => {
    if (adminRegion) {
      loadReservationStatus();
      loadBlockedDates();
      loadAllReservations();
    }
  }, [currentMonth, adminRegion]);

  // 실시간 설정 변경 감지를 위한 주기적 새로고침
  useEffect(() => {
    if (!adminRegion) return;

    const interval = setInterval(() => {
      loadReservationStatus();
      loadBlockedDates();
      loadAllReservations();
    }, 30000); // 30초마다 새로고침

    return () => clearInterval(interval);
  }, [currentMonth, adminRegion]);

  const checkAuth = () => {
    const adminAuth = localStorage.getItem('adminInfo');
    if (!adminAuth) {
      router.push('/auth/login');
      return;
    }

    const adminData = JSON.parse(adminAuth);
    setAdminInfo(adminData);

    // 관리자 지역 설정
    if (adminData.role === 'south') {
      setAdminRegion('south');
    } else if (adminData.role === 'north') {
      setAdminRegion('north');
    } else if (adminData.role === 'super') {
      setAdminRegion('south'); // 기본값
    }

    setLoading(false);
  };

  // 예약 현황 로드 - 성능 최적화된 버전 (사용자 대시보드와 동일)
  const loadReservationStatus = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      console.log(`[DEBUG] Admin loadReservationStatus for ${year}-${month}, region: ${adminRegion}`);

      // 월별 일괄 조회로 성능 개선 (31개 API 호출 → 1개 API 호출)
      const { data: monthStatus, error } = await settingsAPI.getMonthReservationStatus(adminRegion, year, month);

      if (error) {
        console.error('예약 현황 로드 오류:', error);
        // 오류 발생 시 기본값으로 폴백 (예약 종료 상태가 기본값)
        const endOfMonth = new Date(year, month, 0);
        const fallbackStatus = {};
        for (let day = 1; day <= endOfMonth.getDate(); day++) {
          const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          fallbackStatus[dateString] = {
            current: 0,
            max: 2,
            isFull: false,
            isOpen: false // 기본값은 예약 종료
          };
        }
        setReservationStatus(fallbackStatus);
        setIsMonthClosed(true); // 오류 시 월 전체 닫힌 상태
        setIsLoadingCalendar(false);
        return;
      }

      if (monthStatus) {
        // 데이터 형식 변환 (API 응답 → 컴포넌트 상태 형식)
        const formattedStatus = {};
        let hasAnyOpenDay = false;
        let totalDays = 0;
        let closedDays = 0;

        Object.keys(monthStatus).forEach(dateString => {
          const status = monthStatus[dateString];
          totalDays++;

          formattedStatus[dateString] = {
            current: status.current_reservations,
            max: status.max_reservations_per_day,
            isFull: status.is_full,
            isOpen: status.is_open
          };

          // 하나라도 열린 날이 있으면 월 전체가 열린 것으로 간주
          if (status.is_open) {
            hasAnyOpenDay = true;
          } else {
            closedDays++;
          }
        });

        // 디버깅을 위한 로그
        console.log(`[DEBUG] Admin ${year}년 ${month}월: 전체 ${totalDays}일 중 ${closedDays}일 닫힘, 열린 날 있음: ${hasAnyOpenDay}`);

        setReservationStatus(formattedStatus);
        // 열린 날이 하나라도 있으면 월이 열린 것으로 간주
        setIsMonthClosed(!hasAnyOpenDay);
      }

      setIsLoadingCalendar(false);

    } catch (error) {
      console.error('예약 현황 로드 예외:', error);
      setIsLoadingCalendar(false);
    }
  };

  // 차단된 날짜 로드 (최적화)
  const loadBlockedDates = async () => {
    try {
      const { data, error } = await settingsAPI.getBlockedDates(adminRegion);

      if (error) {
        console.error('차단된 날짜 로드 오류:', error);
        return;
      }

      // 날짜 형식으로 변환하여 저장
      const blocked = data?.map((item: any) => item.date) || [];
      setBlockedDates(blocked);
    } catch (error) {
      console.error('차단된 날짜 로드 중 오류:', error);
    }
  };

  // 모든 예약 데이터 로드
  const loadAllReservations = async () => {
    try {
      const { data, error } = await reservationAPI.getAllReservationsForRegion(adminRegion);

      if (error) {
        console.error('예약 데이터 로드 오류:', error);
        return [];
      }

      // 데이터 변환 (취소된 예약 제외)
      const transformedData = data?.filter(item =>
        item.status !== 'cancelled' && item.status !== 'admin_cancelled'
      ).map(item => ({
        id: item.id,
        date: new Date(item.date),
        status: item.status,
        user_id: item.user_id,
        organization_name: item.users?.organization_name || '',
        manager_name: item.users?.manager_name || '',
        phone: item.users?.phone || '',
        email: item.users?.email || '',
        slots: item.reservation_slots?.map(slot => ({
          startTime: slot.start_time.substring(0, 5), // HH:MM 형식으로 자르기
          endTime: slot.end_time.substring(0, 5), // HH:MM 형식으로 자르기
          grade: slot.grade,
          participantCount: slot.participant_count,
          location: slot.location
        })) || [],
        created_at: new Date(item.created_at)
      })) || [];

      setAllReservations(transformedData);
      return transformedData;
    } catch (error) {
      console.error('예약 데이터 로드 중 오류:', error);
      return [];
    }
  };

  // 특정 날짜의 예약 로드
  const loadDayReservations = async (date: Date) => {
    try {
      // 로컬 시간대로 날짜 변환 (시간대 오류 방지)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const dayData = allReservations.filter(reservation => {
        const reservationYear = reservation.date.getFullYear();
        const reservationMonth = String(reservation.date.getMonth() + 1).padStart(2, '0');
        const reservationDay = String(reservation.date.getDate()).padStart(2, '0');
        const reservationDateString = `${reservationYear}-${reservationMonth}-${reservationDay}`;
        return reservationDateString === dateString;
      });
      setDayReservations(dayData);
    } catch (error) {
      console.error('날짜별 예약 로드 중 오류:', error);
    }
  };

  // 달력 날짜 클릭 핸들러 - 바로 상세보기로 이동
  const handleDateClick = async (value: CalendarValue) => {
    if (!value || Array.isArray(value)) return;
    setSelectedDate(value);
    await loadDayReservations(value);

    // 해당 날짜의 예약이 있으면 바로 상세보기 모달 열기
    const dateData = getDayReservationsData(value);
    if (dateData.length === 1) {
      // 예약이 1개면 바로 상세보기
      setSelectedReservation(dateData[0]);
      setActiveModal('reservationDetail');
    } else if (dateData.length > 1) {
      // 예약이 여러 개면 목록에서 선택할 수 있도록
      setActiveModal('reservationList');
    } else {
      // 예약이 없으면 목록 모달 (빈 상태)
      setActiveModal('reservationList');
    }
  };

  // 특정 날짜의 예약 데이터 가져오기 (헬퍼 함수)
  const getDayReservationsData = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayData = allReservations.filter(reservation => {
      const reservationYear = reservation.date.getFullYear();
      const reservationMonth = String(reservation.date.getMonth() + 1).padStart(2, '0');
      const reservationDay = String(reservation.date.getDate()).padStart(2, '0');
      const reservationDateString = `${reservationYear}-${reservationMonth}-${reservationDay}`;
      return reservationDateString === dateString;
    });
    return dayData;
  };

  // 날짜의 예약 상태 확인
  const getDayStatus = (date: Date): DayStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 과거 날짜는 선택 불가
    if (date < today) return 'blocked';

    // 로컬 시간대로 날짜 변환 (시간대 오류 방지)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // 차단된 날짜 체크
    if (blockedDates.includes(dateString)) return 'blocked';

    // 예약 현황 체크
    const status = reservationStatus[dateString];
    if (status) {
      if (!status.isOpen) return 'closed';
      if (status.isFull) return 'full';
      if (status.current > 0 && status.current < status.max) return 'limited';
    }

    return 'available';
  };

  // 달력 타일 클래스 설정
  const getTileClassName = ({ date }: { date: Date }) => {
    const status = getDayStatus(date);
    const baseClass = 'react-calendar__tile';

    switch (status) {
      case 'available':
        return `${baseClass} calendar-day-available`;
      case 'limited':
        return `${baseClass} calendar-day-limited`;
      case 'full':
        return `${baseClass} calendar-day-full`;
      case 'blocked':
        return `${baseClass} calendar-day-blocked`;
      case 'closed':
        return `${baseClass} calendar-day-closed`;
      default:
        return baseClass;
    }
  };

  // 달력 타일 내용 - 사용자 대시보드와 동일한 디자인
  const getTileContent = ({ date }: { date: Date }) => {
    // 로컬 시간대로 날짜 변환 (시간대 오류 방지)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const status = reservationStatus[dateString];
    const isBlocked = blockedDates.includes(dateString);

    // 디버깅용 로그 - 현재 월의 모든 날짜
    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth() + 1;
    if (year === currentYear && date.getMonth() + 1 === currentMonthNum && day <= '05') {
      console.log(`[DEBUG] getTileContent for ${dateString}:`, {
        status,
        isBlocked,
        hasReservationStatus: !!reservationStatus[dateString],
        reservationStatusKeys: Object.keys(reservationStatus).slice(0, 5)
      });
    }

    if (isLoadingCalendar) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-4 h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full animate-pulse"></div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-end p-1 space-y-1">
        {isBlocked && (
          <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full shadow-sm" title="예약 불가">
            <X className="w-3 h-3 text-white" />
          </div>
        )}
        {status && !isBlocked && (
          <>
            {status.isFull ? (
              <div className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-md animate-pulse">
                마감
              </div>
            ) : (
              <div className="w-full space-y-1">
                {/* 진행률 바 */}
                <div className="w-full h-1.5 bg-white bg-opacity-30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      status.current === 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                      status.current >= status.max * 0.7 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                      'bg-gradient-to-r from-blue-400 to-blue-500'
                    }`}
                    style={{ width: `${status.max > 0 ? (status.current / status.max) * 100 : 0}%` }}
                  />
                </div>
                {/* 예약 숫자 - 더 눈에 띄게 개선 */}
                {status.max > 0 && (
                  <div className={`text-xs font-bold text-center px-2 py-1 rounded-full shadow-sm border backdrop-blur-sm ${
                    status.current === 0 ? 'text-emerald-800 bg-emerald-100 border-emerald-300' :
                    status.current >= status.max * 0.7 ? 'text-amber-800 bg-amber-100 border-amber-300' :
                    'text-blue-800 bg-blue-100 border-blue-300'
                  }`}>
                    {status.current}/{status.max}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const StatusBadge = ({ status }: { status: ReservationStatus }) => {
    const statusMap = {
      pending: { label: '승인대기', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인완료', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-800' },
      admin_cancelled: { label: '관리자취소', color: 'bg-red-100 text-red-800' },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-800' },
      cancel_requested: { label: '취소요청', color: 'bg-orange-100 text-orange-800' }
    };

    const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  // 예약 승인 처리
  const handleApprove = async (reservationId: string) => {
    try {
      setActionLoading(reservationId);
      const { data, error } = await reservationAPI.updateReservationStatus(reservationId, 'approved');

      if (error) {
        console.error('승인 처리 오류:', error);
        alert('승인 처리 중 오류가 발생했습니다.');
        return;
      }

      // 데이터 새로고침 후 업데이트된 예약 정보 가져오기
      const updatedReservations = await loadAllReservations();
      await loadReservationStatus();

      // 선택된 날짜의 예약 목록 즉시 업데이트 (최신 데이터 사용)
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        const dayData = updatedReservations.filter(reservation => {
          const reservationYear = reservation.date.getFullYear();
          const reservationMonth = String(reservation.date.getMonth() + 1).padStart(2, '0');
          const reservationDay = String(reservation.date.getDate()).padStart(2, '0');
          const reservationDateString = `${reservationYear}-${reservationMonth}-${reservationDay}`;
          return reservationDateString === dateString;
        });
        setDayReservations(dayData);
      }

      // 모달에 표시 중인 예약이면 업데이트된 데이터로 동기화
      if (selectedReservation && selectedReservation.id === reservationId) {
        const updatedReservation = updatedReservations.find(r => r.id === reservationId);
        if (updatedReservation) {
          setSelectedReservation(updatedReservation);
        }
      }

      alert('예약이 승인되었습니다.');
    } catch (error) {
      console.error('승인 처리 오류:', error);
      alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 예약 거절 처리 (DB에서 완전 삭제)
  const handleReject = async (reservationId: string) => {
    try {
      setActionLoading(reservationId);
      const { data, error } = await reservationAPI.deleteReservation(reservationId);

      if (error) {
        console.error('거절 처리 오류:', error);
        alert('거절 처리 중 오류가 발생했습니다.');
        return;
      }

      // 데이터 새로고침
      await loadAllReservations();
      await loadReservationStatus();

      if (selectedDate) {
        await loadDayReservations(selectedDate);
      }

      alert('예약이 거절되어 삭제되었습니다.');
      setActiveModal(null);
      setSelectedReservation(null);
    } catch (error) {
      console.error('거절 처리 오류:', error);
      alert('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 예약 강제 취소 처리 (DB에서 완전 삭제)
  const handleForceCancel = async (reservationId: string) => {
    if (!confirm('정말로 이 예약을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(reservationId);
      const { data, error } = await reservationAPI.deleteReservation(reservationId);

      if (error) {
        console.error('강제 취소 오류:', error);
        alert('강제 취소 중 오류가 발생했습니다.');
        return;
      }

      // 데이터 새로고침
      await loadAllReservations();
      await loadReservationStatus();

      if (selectedDate) {
        await loadDayReservations(selectedDate);
      }

      alert('예약이 삭제되었습니다.');
      setActiveModal(null);
      setSelectedReservation(null);
    } catch (error) {
      console.error('강제 취소 오류:', error);
      alert('강제 취소 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 취소 승인 처리 (DB에서 완전 삭제)
  const handleApproveCancellation = async (reservationId: string) => {
    try {
      setActionLoading(reservationId);
      const { data, error } = await reservationAPI.deleteReservation(reservationId);

      if (error) {
        console.error('취소 승인 오류:', error);
        alert('취소 승인 중 오류가 발생했습니다.');
        return;
      }

      // 데이터 새로고침
      await loadAllReservations();
      await loadReservationStatus();

      if (selectedDate) {
        await loadDayReservations(selectedDate);
      }

      alert('취소 요청이 승인되어 삭제되었습니다.');
      setActiveModal(null);
      setSelectedReservation(null);
    } catch (error) {
      console.error('취소 승인 오류:', error);
      alert('취소 승인 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 엑셀 다운로드 함수
  const handleDownloadExcel = async () => {
    if (!currentMonth) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 해당 월의 첫날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 달력 시작일 (전월 마지막 주 포함)
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - startDay.getDay());

    // 달력 종료일 (다음월 첫 주 포함)
    const endDay = new Date(lastDay);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

    // 주 수 계산
    const weekCount = Math.ceil((endDay.getTime() - startDay.getTime()) / (7 * 24 * 60 * 60 * 1000));

    // ExcelJS 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${month + 1}월 예약현황`);

    // 열 너비 설정
    worksheet.columns = [
      { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
      { width: 16 }, { width: 16 }, { width: 16 }
    ];

    let currentRow = 1;

    // 제목 행
    const titleRow = worksheet.getRow(currentRow);
    titleRow.getCell(1).value = `${year}년 ${month + 1}월 예약 현황`;
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    titleRow.getCell(1).font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: 'FF1F4788' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).border = {
      top: { style: 'medium', color: { argb: 'FF1F4788' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4788' } },
      left: { style: 'medium', color: { argb: 'FF1F4788' } },
      right: { style: 'medium', color: { argb: 'FF1F4788' } }
    };
    titleRow.height = 30;
    currentRow++;

    // 빈 행
    currentRow++;

    // 요일 헤더
    const headerRow = worksheet.getRow(currentRow);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    weekdays.forEach((day, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = day;
      cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5DADE2' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF2874A6' } },
        bottom: { style: 'medium', color: { argb: 'FF2874A6' } },
        left: { style: 'thin', color: { argb: 'FF2874A6' } },
        right: { style: 'thin', color: { argb: 'FF2874A6' } }
      };
    });
    headerRow.height = 25;
    currentRow++;

    // 각 주별 데이터 생성
    for (let week = 0; week < weekCount; week++) {
      // 해당 주의 각 날짜별 예약 정보 수집
      const weekReservations: any[][] = [];
      let maxReservations = 0;

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDay);
        currentDate.setDate(startDay.getDate() + (week * 7) + day);

        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        // 해당 날짜의 예약 찾기 (거절/취소 제외)
        const dayReservations = allReservations.filter(r => {
          const resDate = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}`;
          return resDate === dateStr &&
                 r.status !== 'rejected' &&
                 r.status !== 'cancelled' &&
                 r.status !== 'admin_cancelled';
        });

        weekReservations[day] = dayReservations;
        maxReservations = Math.max(maxReservations, dayReservations.length);
      }

      // 일자 행 추가
      const dateRow = worksheet.getRow(currentRow);
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDay);
        currentDate.setDate(startDay.getDate() + (week * 7) + day);
        const cell = dateRow.getCell(day + 1);
        cell.value = `${currentDate.getDate()}일`;
        cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FF2C3E50' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF5DADE2' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
      dateRow.height = 20;
      currentRow++;

      // 예약 정보 행 추가 (최대 예약 수만큼)
      for (let i = 0; i < maxReservations; i++) {
        const reservationRow = worksheet.getRow(currentRow);
        for (let day = 0; day < 7; day++) {
          const reservation = weekReservations[day][i];
          const cell = reservationRow.getCell(day + 1);
          if (reservation) {
            let content = reservation.organization_name;
            if (reservation.slots && reservation.slots.length > 0) {
              const firstSlot = reservation.slots[0];
              const lastSlot = reservation.slots[reservation.slots.length - 1];
              content += ` ${firstSlot.startTime}~${lastSlot.endTime}`;
            }
            cell.value = content;
          } else {
            cell.value = '';
          }
          cell.font = { name: '맑은 고딕', size: 9, color: { argb: 'FF000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }
        reservationRow.height = 18;
        currentRow++;
      }
    }

    // 엑셀 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `예약현황_${year}년${month + 1}월_${adminRegion}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // 필터링된 예약 목록 (전체 리스트용)
  const filteredAllReservations = allReservations.filter(reservation => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const matchesSearch = !searchTerm ||
      reservation.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.manager_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // 필터링된 예약 목록 (특정 날짜용)
  const filteredReservations = dayReservations.filter(reservation => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const matchesSearch = !searchTerm ||
      reservation.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.manager_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // 통계 계산
  const getStats = () => {
    const pending = allReservations.filter(r => r.status === 'pending').length;
    const approved = allReservations.filter(r => r.status === 'approved').length;
    const cancelRequested = allReservations.filter(r => r.status === 'cancel_requested').length;
    return { pending, approved, cancelRequested };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
              <p className="text-gray-600 mt-1">
                {adminInfo?.role === 'super' && '전체 지역'}
                {adminInfo?.role === 'south' && '경기남부'}
                {adminInfo?.role === 'north' && '경기북부'}
                의 예약을 관리합니다
              </p>
            </div>

            {adminInfo?.role === 'super' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setAdminRegion('south')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    adminRegion === 'south'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  경기남부
                </button>
                <button
                  onClick={() => setAdminRegion('north')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    adminRegion === 'north'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  경기북부
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 달력/리스트 섹션 */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {viewMode === 'calendar' ? '예약 달력' : '예약 목록'}
                  </h2>

                  {/* 뷰 모드 토글 */}
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                        viewMode === 'calendar'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                      <span className="text-sm font-medium">달력뷰</span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span className="text-sm font-medium">리스트뷰</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {viewMode === 'calendar' && (
                    <button
                      onClick={handleDownloadExcel}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="엑셀 다운로드"
                    >
                      <Download className="w-4 h-4" />
                      <span>엑셀 다운로드</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      loadReservationStatus();
                      loadAllReservations();
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>새로고침</span>
                  </button>
                  <div className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg shadow-sm">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {adminRegion === 'south' ? '경기남부' : '경기북부'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 달력뷰 또는 리스트뷰 */}
              {viewMode === 'calendar' ? (
                <div className="premium-calendar-container relative">
                  {isLoadingCalendar && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-medium text-gray-800">예약 현황 로딩 중</span>
                          <div className="text-sm text-gray-600 mt-1">잠시만 기다려주세요...</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <Calendar
                    onChange={handleDateClick}
                    value={selectedDate}
                    tileClassName={getTileClassName}
                    tileContent={getTileContent}
                    onActiveStartDateChange={({ activeStartDate }) => {
                      if (activeStartDate) {
                        setCurrentMonth(activeStartDate);
                      }
                    }}
                    calendarType="gregory"
                    locale="ko-KR"
                    formatDay={(locale, date) => date.getDate().toString()}
                    formatShortWeekday={(locale, date) =>
                      ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
                    }
                    formatMonthYear={(locale, date) =>
                      `${date.getFullYear()}년 ${date.getMonth() + 1}월`
                    }
                    next2Label={null}
                    prev2Label={null}
                    showNeighboringMonth={false}
                  />

                </div>
              ) : (
                /* 리스트뷰 */
                <div className="space-y-4">
                  {/* 검색 및 필터 */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="단체명 또는 담당자명으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | ReservationStatus)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">전체 상태</option>
                      <option value="pending">승인대기</option>
                      <option value="approved">승인완료</option>
                      <option value="cancel_requested">취소요청</option>
                      <option value="rejected">거절됨</option>
                    </select>
                  </div>

                  {/* 예약 리스트 */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {filteredAllReservations.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 mb-1">예약이 없습니다</h4>
                        <p className="text-gray-500">검색 조건에 맞는 예약이 없습니다.</p>
                      </div>
                    ) : (
                      filteredAllReservations.map((reservation) => (
                        <div key={reservation.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{reservation.organization_name}</h3>
                                <StatusBadge status={reservation.status} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-2 text-gray-400" />
                                  <span>{reservation.manager_name}</span>
                                </div>
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                  <span>{reservation.phone}</span>
                                </div>
                                <div className="flex items-center">
                                  <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                                  <span>{reservation.date.toLocaleDateString('ko-KR')}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                  <span>
                                    {reservation.slots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 액션 버튼들 */}
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={async () => {
                                  // 최신 데이터 로드 후 모달 열기
                                  const updatedReservations = await loadAllReservations();
                                  const freshReservation = updatedReservations.find(r => r.id === reservation.id);
                                  if (freshReservation) {
                                    setSelectedReservation(freshReservation);
                                    setActiveModal('reservationDetail');
                                  } else {
                                    setSelectedReservation(reservation);
                                    setActiveModal('reservationDetail');
                                  }
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="상세보기"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {reservation.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(reservation.id)}
                                    disabled={actionLoading === reservation.id}
                                    className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                                  >
                                    {actionLoading === reservation.id ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : (
                                      '승인'
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleReject(reservation.id)}
                                    disabled={actionLoading === reservation.id}
                                    className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                                  >
                                    {actionLoading === reservation.id ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : (
                                      '거절'
                                    )}
                                  </button>
                                </>
                              )}

                              {reservation.status === 'cancel_requested' && (
                                <button
                                  onClick={() => handleApproveCancellation(reservation.id)}
                                  disabled={actionLoading === reservation.id}
                                  className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="취소 승인"
                                >
                                  {actionLoading === reservation.id ? (
                                    <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {reservation.status === 'approved' && (
                                <button
                                  onClick={() => handleForceCancel(reservation.id)}
                                  disabled={actionLoading === reservation.id}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="강제 취소"
                                >
                                  {actionLoading === reservation.id ? (
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 시간 슬롯 미리보기 - 개선된 디자인 */}
                          {reservation.slots.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                              <div className="flex flex-wrap gap-2">
                                {reservation.slots.map((slot, index) => (
                                  <div key={index} className={`${index === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'} px-3 py-2 rounded-lg text-xs border shadow-sm`}>
                                    <div className="flex items-center space-x-2">
                                      <span className={`${index === 0 ? 'bg-blue-600' : 'bg-purple-600'} text-white px-1.5 py-0.5 rounded text-xs font-bold`}>
                                        {index === 0 ? '1' : '2'}
                                      </span>
                                      <span className="font-bold">{slot.startTime} - {slot.endTime}</span>
                                      <span className="text-gray-600">({slot.grade} / {slot.participantCount}명)</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 범례 - 사용자 대시보드와 완전히 동일하게 */}
              {viewMode === 'calendar' && (
                <div className="mt-4 flex flex-wrap items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-pink-200 rounded-full"></div>
                    <span>예약가능</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-pink-300 rounded-full"></div>
                    <span>일부예약</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                    <span>예약마감</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <span>예약불가</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    * 숫자는 현재예약수/최대예약수를 나타냅니다
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 관리 통계 섹션 */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">관리 통계</h3>
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                      <div>
                        <div className="font-semibold text-gray-900">승인대기</div>
                        <div className="text-sm text-gray-600">처리 필요</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <div className="font-semibold text-gray-900">승인완료</div>
                        <div className="text-sm text-gray-600">이번 달</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
                      <div>
                        <div className="font-semibold text-gray-900">취소요청</div>
                        <div className="text-sm text-gray-600">확인 필요</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{stats.cancelRequested}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 최근 예약 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">최근 예약</h3>
              <div className="space-y-3">
                {allReservations.slice(0, 3).length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900 mb-1">예약이 없습니다</h4>
                    <p className="text-sm text-gray-500">아직 등록된 예약이 없습니다.</p>
                  </div>
                ) : (
                  allReservations.slice(0, 3).map((reservation) => (
                    <div key={reservation.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <CalendarIcon className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{reservation.organization_name}</div>
                        <div className="text-sm text-gray-600">
                          {reservation.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 예약 목록 모달 (달력 날짜 클릭 시) */}
      {activeModal === 'reservationList' && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })} 예약 목록
                </h3>
                <p className="text-gray-600">총 {filteredReservations.length}개의 예약</p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 검색 및 필터 */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="단체명 또는 담당자명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | ReservationStatus)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">승인대기</option>
                  <option value="approved">승인완료</option>
                  <option value="cancel_requested">취소요청</option>
                </select>
              </div>

              {/* 예약 목록 */}
              <div className="space-y-4">
                {filteredReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-1">예약이 없습니다</h4>
                    <p className="text-gray-500">해당 날짜에 예약된 내역이 없습니다.</p>
                  </div>
                ) : (
                  filteredReservations.map((reservation) => (
                    <div key={reservation.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{reservation.organization_name}</h4>
                            <StatusBadge status={reservation.status} />
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2" />
                              {reservation.manager_name}
                            </div>
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2" />
                              {reservation.phone}
                            </div>
                          </div>

                          {/* 시간 슬롯 - 개선된 디자인 */}
                          <div className="mt-3">
                            <div className="space-y-2">
                              {reservation.slots.map((slot, index) => (
                                <div key={index} className={`${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'} p-3 rounded-lg border shadow-sm`}>
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                      <span className={`${index === 0 ? 'bg-blue-600' : 'bg-purple-600'} text-white px-2 py-1 rounded text-xs font-bold mr-2`}>
                                        {index === 0 ? '1타임' : '2타임'}
                                      </span>
                                      <span className="font-bold text-gray-800">{slot.startTime} - {slot.endTime}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">{slot.grade}</span>
                                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">{slot.participantCount}명</span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-2 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {slot.location}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setActiveModal('reservationDetail');
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="상세보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {reservation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(reservation.id)}
                                disabled={actionLoading === reservation.id}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                              >
                                {actionLoading === reservation.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                  '승인'
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(reservation.id)}
                                disabled={actionLoading === reservation.id}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                              >
                                {actionLoading === reservation.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                  '거절'
                                )}
                              </button>
                            </>
                          )}

                          {reservation.status === 'cancel_requested' && (
                            <button
                              onClick={() => handleApproveCancellation(reservation.id)}
                              disabled={actionLoading === reservation.id}
                              className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="취소 승인"
                            >
                              {actionLoading === reservation.id ? (
                                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {reservation.status === 'approved' && (
                            <button
                              onClick={() => handleForceCancel(reservation.id)}
                              disabled={actionLoading === reservation.id}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="강제 취소"
                            >
                              {actionLoading === reservation.id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mt-3">
                        신청일: {reservation.created_at.toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 예약 상세 모달 */}
      {activeModal === 'reservationDetail' && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">예약 상세 정보</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedReservation.date.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })} • <StatusBadge status={selectedReservation.status} />
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedReservation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 신청자 정보 - 개선된 디자인 */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-emerald-600" />
                    신청자 정보
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-emerald-600 mr-3" />
                        <div>
                          <label className="text-xs text-gray-500 block">단체명</label>
                          <div className="font-bold text-gray-800 text-lg">{selectedReservation.organization_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-blue-600 mr-3" />
                        <div>
                          <label className="text-xs text-gray-500 block">담당자명</label>
                          <div className="font-semibold text-gray-800">{selectedReservation.manager_name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-green-600 mr-3" />
                        <div>
                          <label className="text-xs text-gray-500 block">연락처</label>
                          <div className="font-semibold text-gray-800">{selectedReservation.phone}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-red-600 mr-3" />
                        <div>
                          <label className="text-xs text-gray-500 block">이메일</label>
                          <div className="font-semibold text-gray-800">{selectedReservation.email}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* 예약 시간 슬롯 - 개선된 디자인 */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    예약 시간 및 상세정보
                  </h4>
                  <div className="space-y-4">
                    {selectedReservation.slots.map((slot, index) => (
                      <div key={index} className={`${index === 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'} border p-6 rounded-xl shadow-md`}>
                        {/* 타임 슬롯 헤더 - 더 구분되는 디자인 */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center">
                            <div className={`${index === 0 ? 'bg-blue-600' : 'bg-purple-600'} text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg`}>
                              {index === 0 ? '🥇 첫 번째 타임' : '🥈 두 번째 타임'}
                            </div>
                            <div className="ml-4 text-xl font-bold text-gray-800">
                              {slot.startTime} - {slot.endTime}
                            </div>
                          </div>
                          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-300 shadow-sm">
                            👥 {slot.participantCount}명 참여
                          </div>
                        </div>

                        {/* 상세 정보 그리드 - 더 가독성 높은 카드형 디자인 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white bg-opacity-60 p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-3">
                              <div className={`${index === 0 ? 'bg-blue-100' : 'bg-purple-100'} p-2 rounded-lg mr-3`}>
                                <GraduationCap className={`w-5 h-5 ${index === 0 ? 'text-blue-600' : 'text-purple-600'}`} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium block">대상 학년</label>
                                <div className="font-bold text-gray-800 text-lg">{slot.grade}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-green-100 p-2 rounded-lg mr-3">
                                <Users className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium block">참여 인원</label>
                                <div className="font-bold text-gray-800 text-lg">{slot.participantCount}명</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white bg-opacity-60 p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-3">
                              <div className="bg-red-100 p-2 rounded-lg mr-3">
                                <MapPin className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium block">사용 장소</label>
                                <div className="font-bold text-gray-800 text-lg">{slot.location}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-orange-100 p-2 rounded-lg mr-3">
                                <Timer className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium block">활동 시간</label>
                                <div className="font-bold text-gray-800 text-lg">
                                  {(() => {
                                    const [startHour, startMin] = slot.startTime.split(':').map(Number);
                                    const [endHour, endMin] = slot.endTime.split(':').map(Number);
                                    const startMinutes = startHour * 60 + startMin;
                                    const endMinutes = endHour * 60 + endMin;
                                    const durationMinutes = endMinutes - startMinutes;
                                    const hours = Math.floor(durationMinutes / 60);
                                    const minutes = durationMinutes % 60;
                                    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  {selectedReservation.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedReservation.id)}
                        disabled={actionLoading === selectedReservation.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === selectedReservation.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        <span>승인</span>
                      </button>
                      <button
                        onClick={() => handleReject(selectedReservation.id)}
                        disabled={actionLoading === selectedReservation.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === selectedReservation.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                        <span>거절</span>
                      </button>
                    </>
                  )}

                  {selectedReservation.status === 'cancel_requested' && (
                    <button
                      onClick={() => handleApproveCancellation(selectedReservation.id)}
                      disabled={actionLoading === selectedReservation.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedReservation.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>취소 승인</span>
                    </button>
                  )}

                  {selectedReservation.status === 'approved' && (
                    <button
                      onClick={() => handleForceCancel(selectedReservation.id)}
                      disabled={actionLoading === selectedReservation.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedReservation.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>강제 취소</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 대시보드와 완전히 동일한 달력 스타일 */}
      <style jsx>{`
        .premium-calendar-container {
          @apply rounded-xl overflow-hidden shadow-lg;
        }

        .premium-calendar-container :global(.react-calendar) {
          @apply w-full border-0 bg-white font-sans;
          width: 100%;
        }

        /* 네비게이션 헤더 - 심플하고 깔끔하게 */
        .premium-calendar-container :global(.react-calendar__navigation) {
          @apply bg-white px-6 py-6 flex justify-between items-center border-b border-gray-200;
        }

        .premium-calendar-container :global(.react-calendar__navigation button) {
          @apply text-gray-700 hover:bg-gray-100 rounded-lg px-4 py-2 font-semibold transition-all duration-200;
          min-width: 44px;
          min-height: 40px;
        }

        .premium-calendar-container :global(.react-calendar__navigation__label) {
          @apply text-xl font-bold text-gray-800;
        }

        .premium-calendar-container :global(.react-calendar__navigation__arrow) {
          @apply text-2xl font-normal;
        }

        /* 요일 헤더 - 참조 이미지처럼 깔끔하게 */
        .premium-calendar-container :global(.react-calendar__month-view__weekdays) {
          @apply bg-white border-b border-gray-200;
        }

        .premium-calendar-container :global(.react-calendar__month-view__weekdays__weekday) {
          @apply py-4 text-center text-base font-semibold text-gray-600;
        }

        /* 달력 타일 기본 - 참조 이미지 기반으로 크기와 간격 조정 */
        .premium-calendar-container :global(.react-calendar__tile) {
          @apply relative p-0 text-center transition-all duration-200 border border-gray-100 bg-white hover:bg-gray-50;
          min-height: 100px;
          position: relative;
          cursor: pointer;
        }

        /* 날짜 숫자 - 참조 이미지처럼 크고 읽기 쉽게 */
        .premium-calendar-container :global(.react-calendar__tile abbr) {
          @apply absolute top-3 left-3 text-2xl font-bold text-gray-800 no-underline;
          text-decoration: none !important;
          line-height: 1;
        }

        /* 선택된 날짜 */
        .premium-calendar-container :global(.react-calendar__tile--active) {
          @apply bg-blue-600 text-white shadow-lg border-blue-600;
        }

        .premium-calendar-container :global(.react-calendar__tile--active abbr) {
          @apply text-white;
        }

        .premium-calendar-container :global(.react-calendar__tile--active:hover) {
          @apply bg-blue-700;
        }

        /* 오늘 날짜 - 참조 이미지처럼 눈에 띄게 */
        .premium-calendar-container :global(.react-calendar__tile--now) {
          @apply bg-blue-50 border-2 border-blue-300;
        }

        .premium-calendar-container :global(.react-calendar__tile--now abbr) {
          @apply text-blue-700 font-black;
        }

        /* 예약 가능 - 참조 이미지의 연한 핑크색 스타일 */
        .premium-calendar-container :global(.calendar-day-available) {
          @apply bg-pink-50 hover:bg-pink-100 border-pink-200;
        }

        .premium-calendar-container :global(.calendar-day-available abbr) {
          @apply text-gray-800;
        }

        /* 일부 예약 - 참조 이미지의 핑크색 스타일 */
        .premium-calendar-container :global(.calendar-day-limited) {
          @apply bg-pink-100 hover:bg-pink-150 border-pink-300;
        }

        .premium-calendar-container :global(.calendar-day-limited abbr) {
          @apply text-gray-800;
        }

        /* 예약 마감 - 참조 이미지의 다크 그레이 스타일 */
        .premium-calendar-container :global(.calendar-day-full) {
          @apply bg-gray-600 text-white cursor-not-allowed border-gray-700;
        }

        .premium-calendar-container :global(.calendar-day-full abbr) {
          @apply text-white;
        }

        .premium-calendar-container :global(.calendar-day-full:hover) {
          @apply bg-gray-600;
        }

        /* 예약 불가 - 참조 이미지의 회색 스타일 */
        .premium-calendar-container :global(.calendar-day-blocked) {
          @apply bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300;
        }

        .premium-calendar-container :global(.calendar-day-blocked abbr) {
          @apply text-gray-500;
        }

        .premium-calendar-container :global(.calendar-day-blocked:hover) {
          @apply bg-gray-200;
        }

        /* 접수 종료 - 가독성 개선 */
        .premium-calendar-container :global(.calendar-day-closed) {
          @apply bg-gray-400 text-white cursor-not-allowed border-gray-500;
        }

        .premium-calendar-container :global(.calendar-day-closed abbr) {
          @apply text-white font-bold;
        }

        .premium-calendar-container :global(.calendar-day-closed:hover) {
          @apply bg-gray-400;
        }

        /* 비활성 날짜 (과거 및 다른 달) */
        .premium-calendar-container :global(.react-calendar__month-view__days__day--neighboringMonth) {
          @apply text-gray-300;
        }

        .premium-calendar-container :global(.react-calendar__tile:disabled) {
          @apply bg-gray-100 text-gray-400 cursor-not-allowed;
        }

        .premium-calendar-container :global(.react-calendar__tile:disabled abbr) {
          @apply text-gray-400;
        }

        /* 주말 스타일링 */
        .premium-calendar-container :global(.react-calendar__month-view__days__day--weekend abbr) {
          @apply text-red-600;
        }
      `}</style>
    </div>
  );
}