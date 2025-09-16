'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Award, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  MapPin, 
  Plus, 
  X, 
  Copy,
  LogOut,
  User,
  List,
  ChevronDown,
  UserCog,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { settingsAPI, reservationAPI, supabase } from '@/lib/supabase';
import AccountManagementModal from '@/components/AccountManagementModal';

type CalendarValue = Date | null | [Date | null, Date | null];

// 예약 상태 타입
type ReservationStatus = 'pending' | 'approved' | 'cancelled' | 'admin_cancelled' | 'cancel_requested';

// 예약 데이터 타입
interface Reservation {
  id: string;
  date: Date;
  status: ReservationStatus;
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
type ModalType = 'reservation' | 'myReservations' | null;

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0); // 이번 달 남은 예약 가능 일수 - 실제 데이터로 계산
  const [reservationSlots, setReservationSlots] = useState([
    {
      startTime: '',
      endTime: '',
      grade: '',
      participantCount: '',
      location: ''
    }
  ]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  
  // 예약 현황 상태
  const [reservationStatus, setReservationStatus] = useState<{
    [date: string]: { current: number; max: number; isFull: boolean; isOpen: boolean }
  }>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [userRegion, setUserRegion] = useState<'south' | 'north'>('south');
  const [isMonthClosed, setIsMonthClosed] = useState(true); // 예약 종료가 기본값 (각 월마다 관리자가 수동으로 열어야 함)
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    organization_name: string;
    region_name: string;
  }>({
    organization_name: '테스트단체',
    region_name: '경기남부'
  });
  
  const router = useRouter();

  // 학년 옵션
  const gradeOptions = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년', '기타'];

  // 시간 선택 옵션 생성 (10분 단위)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // 예약 취소 처리
  const handleCancelReservation = async (reservationId: string, status: ReservationStatus) => {
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (status === 'pending') {
        // 승인 전 - 바로 취소
        const result = await reservationAPI.updateReservationStatus(reservationId, 'cancelled' as any);
        
        if (result.error) {
          alert('예약 취소 실패: ' + result.error.message);
          return;
        }
        
        alert('예약이 취소되었습니다.');
        
        // 승인 전 취소는 즉시 데이터 새로고침 (달력 반영)
        await Promise.all([
          loadMyReservations(),
          loadReservationStatus()
        ]);
        
      } else if (status === 'approved') {
        // 승인 후 - 취소 요청만 전송
        const result = await reservationAPI.requestCancellation(reservationId);
        
        if (result.error) {
          alert('취소 요청 실패: ' + result.error.message);
          return;
        }
        
        alert('취소 요청이 관리자에게 전송되었습니다. 관리자 승인 후 취소됩니다.');
        
        // 승인 후는 예약 목록만 업데이트 (달력은 변경 안됨)
        await loadMyReservations();
      }

    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert('예약 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 사용자 정보 초기화 (컴포넌트 마운트 시에만 실행)
  useEffect(() => {
    // Hot reload나 기타 이유로 localStorage가 일시적으로 사라질 수 있으므로 
    // 약간의 지연 후 다시 확인
    const checkUserAuth = () => {
      const currentUser = localStorage.getItem('currentUser');
      console.log('Dashboard - localStorage 확인:', !!currentUser, currentUser);
      
      if (!currentUser) {
        console.log('Dashboard - localStorage 없음, 기본값 사용');
        // localStorage가 없어도 기본값으로 계속 진행
        setCurrentUserInfo({
          organization_name: '사용자',
          region_name: '경기남부'
        });
        setUserRegion('south');
        return;
      }
      
      // localStorage가 있으면 데이터 처리
      processUserData(currentUser);
    };

    const processUserData = (currentUser: string) => {
      try {
        const userData = JSON.parse(currentUser);
        console.log('Dashboard - 로그인 사용자 데이터:', userData);
        console.log('Dashboard - cities 데이터:', userData.cities);
        console.log('Dashboard - regions 데이터:', userData.cities?.regions);
        
        // 지역 코드 추출 (nested object에서)
        let regionCode = 'south'; // 기본값
        let regionName = '경기남부'; // 기본값
        
        if (userData.cities && userData.cities.regions) {
          regionCode = userData.cities.regions.code;
          regionName = userData.cities.regions.name;
          console.log('Dashboard - 추출된 지역 정보:', { regionCode, regionName });
        } else if (userData.region_code) {
          regionCode = userData.region_code;
          regionName = userData.region_code === 'south' ? '경기남부' : '경기북부';
          console.log('Dashboard - region_code에서 추출:', { regionCode, regionName });
        } else {
          console.log('Dashboard - 기본값 사용:', { regionCode, regionName });
        }
        
        // 사용자 정보 설정
        setCurrentUserInfo({
          organization_name: userData.organization_name || '테스트단체',
          region_name: regionName
        });
        
        setUserRegion(regionCode as 'south' | 'north');
        
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
        console.error('localStorage currentUser 내용:', currentUser);
        
        // 파싱 오류가 발생해도 기본값으로 계속 진행
        setCurrentUserInfo({
          organization_name: '사용자',
          region_name: '경기남부'
        });
        setUserRegion('south');
        
        console.warn('Dashboard - 사용자 데이터 파싱 실패로 기본값 사용');
      }
    };

    // 사용자 인증 확인 시작
    checkUserAuth();
  }, []); // 빈 배열 - 컴포넌트 마운트 시에만 실행

  // 데이터 로드 (월 변경이나 지역 변경 시 실행)
  useEffect(() => {
    if (userRegion) { // userRegion이 설정된 후에만 실행
      loadReservationStatus();
      loadBlockedDates();
      loadMyReservations(); // 내 예약 목록도 로드
    }
  }, [currentMonth, userRegion]);

  // 실시간 설정 변경 감지를 위한 주기적 새로고침 (취소 승인 반영 포함)
  useEffect(() => {
    if (!userRegion) return; // userRegion이 설정되지 않았으면 실행하지 않음
    
    const interval = setInterval(() => {
      loadReservationStatus();
      loadBlockedDates();
      loadMyReservations(); // 취소 승인 상황 실시간 반영
    }, 15000); // 15초마다 새로고침으로 변경 (취소 승인 더 빠르게 반영)

    return () => clearInterval(interval);
  }, [currentMonth, userRegion]);

  // 예약 현황 로드 - 성능 최적화된 버전
  const loadReservationStatus = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      // 월별 일괄 조회로 성능 개선 (31개 API 호출 → 1개 API 호출)
      const { data: monthStatus, error } = await settingsAPI.getMonthReservationStatus(userRegion, year, month);
      
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
        console.log(`${year}년 ${month}월: 전체 ${totalDays}일 중 ${closedDays}일 닫힘, 열린 날 있음: ${hasAnyOpenDay}`);
        
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

  // 차단된 날짜 로드
  const loadBlockedDates = async () => {
    try {
      const { data, error } = await settingsAPI.getBlockedDates(userRegion);
      if (error) {
        console.error('차단된 날짜 로드 오류:', error);
        return;
      }
      
      if (data) {
        const blocked = data.map((item: any) => item.date);
        setBlockedDates(blocked);
      }
    } catch (error) {
      console.error('차단된 날짜 로드 예외:', error);
    }
  };

  // 내 예약 목록 로드
  const loadMyReservations = async () => {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return;

      const userData = JSON.parse(currentUser);
      const userId = userData.id;
      
      if (!userId) return;

      // API에서 사용자의 예약 목록을 가져오기
      const result = await reservationAPI.getUserReservations(userId);
      
      if (result.data) {
        const reservations = result.data.map((res: any) => ({
          id: res.id,
          date: new Date(res.date + 'T00:00:00'), // 시간대 오류 방지를 위해 로컬 시간 지정
          status: res.status,
          slots: res.reservation_slots.map((slot: any) => ({
            startTime: slot.start_time,
            endTime: slot.end_time,
            grade: slot.grade,
            participantCount: slot.participant_count,
            location: slot.location
          })),
          created_at: new Date(res.created_at) // created_at은 timestamp라 그대로 사용
        }));
        
        setMyReservations(reservations);
        
        // 이번 달 예약 횟수 계산
        calculateRemainingReservations(reservations);
      } else {
        setMyReservations([]);
        setRemainingDays(4); // 예약이 없으면 전체 4일
      }
    } catch (error) {
      console.error('내 예약 목록 로드 오류:', error);
    }
  };

  // 이번 달 남은 예약 횟수 계산
  const calculateRemainingReservations = (reservations: Reservation[]) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // 이번 달의 승인된 예약 개수 계산
    const thisMonthReservations = reservations.filter(reservation => {
      const reservationDate = new Date(reservation.date);
      return reservationDate.getFullYear() === currentYear &&
             reservationDate.getMonth() === currentMonth &&
             (reservation.status === 'approved' || reservation.status === 'pending'); // 승인된 것과 대기 중인 것 포함
    });
    
    const usedDays = thisMonthReservations.length;
    const remaining = Math.max(0, 4 - usedDays); // 최대 4일에서 사용한 일수 빼기
    
    setRemainingDays(remaining);
  };

  // 종료시간 자동 계산 (시작시간 + 40분)
  const calculateEndTime = (startTime: string) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 40;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // 시작시간 변경 핸들러
  const handleStartTimeChange = (index: number, startTime: string) => {
    const updatedSlots = [...reservationSlots];
    updatedSlots[index].startTime = startTime;
    updatedSlots[index].endTime = calculateEndTime(startTime);
    setReservationSlots(updatedSlots);
  };

  // 타임 슬롯 추가
  const addTimeSlot = () => {
    if (reservationSlots.length < 2) {
      setReservationSlots([
        ...reservationSlots,
        {
          startTime: '',
          endTime: '',
          grade: '',
          participantCount: '',
          location: ''
        }
      ]);
    }
  };

  // 타임 슬롯 제거
  const removeTimeSlot = (index: number) => {
    if (reservationSlots.length > 1) {
      setReservationSlots(reservationSlots.filter((_, i) => i !== index));
    }
  };

  // 필드 값 복사
  const copyToSlot = (fromIndex: number, toIndex: number) => {
    const updatedSlots = [...reservationSlots];
    const sourceSlot = reservationSlots[fromIndex];
    
    updatedSlots[toIndex] = {
      ...updatedSlots[toIndex],
      grade: sourceSlot.grade,
      participantCount: sourceSlot.participantCount,
      location: sourceSlot.location
    };
    
    setReservationSlots(updatedSlots);
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

  // 달력 날짜 클릭 핸들러
  const handleDateClick = (value: CalendarValue) => {
    if (!value || Array.isArray(value)) return;
    
    const dayStatus = getDayStatus(value);
    
    // 클릭 불가능한 날짜들 처리
    if (dayStatus === 'blocked' || dayStatus === 'full' || dayStatus === 'closed') {
      if (dayStatus === 'full') {
        alert('해당 날짜는 예약이 마감되었습니다.');
      } else if (dayStatus === 'closed') {
        alert('해당 날짜는 예약이 종료되었습니다.');
      } else {
        alert('해당 날짜는 예약할 수 없습니다.');
      }
      return;
    }
    
    // 추가로 예약 오픈 상태 확인
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const status = reservationStatus[dateString];
    
    if (status && !status.isOpen) {
      alert('해당 날짜는 예약이 종료되었습니다.');
      return;
    }
    
    setSelectedDate(value);
    setActiveModal('reservation');
    
    // 예약 폼 초기화
    setReservationSlots([{
      startTime: '',
      endTime: '',
      grade: '',
      participantCount: '',
      location: ''
    }]);
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

  // 달력 타일 내용 설정 - 개선된 디자인
  const getTileContent = ({ date }: { date: Date }) => {
    // 로컬 시간대로 날짜 변환 (시간대 오류 방지)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const status = reservationStatus[dateString];
    const isBlocked = blockedDates.includes(dateString);
    
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
                {/* 예약 숫자 */}
                {status.max > 0 && (
                  <div className={`text-xs font-semibold text-center px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
                    status.current === 0 ? 'text-emerald-700 bg-emerald-100 bg-opacity-80' :
                    status.current >= status.max * 0.7 ? 'text-amber-700 bg-amber-100 bg-opacity-80' :
                    'text-blue-700 bg-blue-100 bg-opacity-80'
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

  // 예약 제출
  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const filteredSlots = reservationSlots.filter(slot => 
        slot.startTime && slot.grade && slot.participantCount && slot.location
      );

      if (filteredSlots.length === 0) {
        alert('최소 한 개의 시간대를 입력해야 합니다.');
        setIsSubmitting(false);
        return;
      }

      if (!selectedDate) {
        alert('날짜를 선택해주세요.');
        setIsSubmitting(false);
        return;
      }

      // 날짜를 문자열로 변환 (시간대 오류 방지)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // 슬롯 데이터 변환
      const slotsData = filteredSlots.map((slot, index) => ({
        start_time: slot.startTime,
        end_time: slot.endTime,
        grade: slot.grade,
        participant_count: parseInt(slot.participantCount),
        location: slot.location,
        slot_order: index + 1
      }));

      // 실제 예약 생성 API 호출
      const regionId = userRegion === 'south' ? 1 : 2;
      
      // 현재 로그인된 사용자 정보 가져오기
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        console.log('예약 제출 시 localStorage 없음');
        alert('예약을 위해 로그인이 필요합니다.');
        setIsSubmitting(false);
        router.push('/auth/login');
        return;
      }

      let userId;
      try {
        const userData = JSON.parse(currentUser);
        userId = userData.id;
        
        if (!userId) {
          alert('사용자 정보가 올바르지 않습니다. 다시 로그인해주세요.');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error('예약 제출 시 사용자 데이터 파싱 오류:', error);
        alert('사용자 정보를 읽을 수 없습니다. 새로고침 후 다시 시도해주세요.');
        setIsSubmitting(false);
        return;
      }
      
      const result = await reservationAPI.createReservationWithValidation(
        userId,
        regionId,
        dateString,
        slotsData
      );

      if (result.error) {
        alert(`예약 신청 실패: ${result.error.message}`);
        return;
      }
      
      // 예약 현황 새로고침
      await loadReservationStatus();
      
      // 내 예약 목록에 추가 및 남은 일수 재계산
      if (result.data) {
        const newReservation: Reservation = {
          id: result.data.id,
          date: selectedDate,
          status: 'pending',
          slots: slotsData.map(slot => ({
            startTime: slot.start_time,
            endTime: slot.end_time,
            grade: slot.grade,
            participantCount: slot.participant_count,
            location: slot.location
          })),
          created_at: new Date()
        };
        
        const updatedReservations = [...myReservations, newReservation];
        setMyReservations(updatedReservations);
        
        // 남은 예약 일수 재계산
        calculateRemainingReservations(updatedReservations);
      }
      
      // 모달 닫기
      setActiveModal(null);
      setSelectedDate(null);
      setReservationSlots([{
        startTime: '',
        endTime: '',
        grade: '',
        participantCount: '',
        location: ''
      }]);
      
      alert('예약이 성공적으로 신청되었습니다!');
      
    } catch (error) {
      console.error('예약 신청 오류:', error);
      alert('예약 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    console.log('로그아웃: localStorage 정리 완료');
    router.push('/');
  };

  // 계정 관리
  const handleAccountManagement = () => {
    setShowAccountModal(true);
  };

  const StatusBadge = ({ status }: { status: ReservationStatus }) => {
    const statusMap = {
      pending: { label: '승인대기', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인완료', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-800' },
      admin_cancelled: { label: '관리자취소', color: 'bg-red-100 text-red-800' },
      cancel_requested: { label: '취소요청', color: 'bg-orange-100 text-orange-800' }
    };
    
    const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 sports-box-gradient rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">스포츠박스</h1>
                <p className="text-sm text-blue-600">예약 대시보드</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{currentUserInfo.organization_name}</span>
                <span className="text-gray-400">|</span>
                <span>{currentUserInfo.region_name}</span>
              </div>
              <button
                onClick={() => setActiveModal('myReservations')}
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
              >
                <List className="w-4 h-4" />
                <span>내 예약</span>
              </button>
              <button
                onClick={handleAccountManagement}
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
              >
                <UserCog className="w-4 h-4" />
                <span>계정 관리</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-700 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 달력 섹션 - 더 확대됨 */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">예약 달력</h2>
                <div className="flex items-center space-x-6">
                  {/* 프리미엄 예약 카운터 */}
                  <div className="flex items-center space-x-3">
                    <div className={`relative inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 ${
                      remainingDays > 2 ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-200' : 
                      remainingDays > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200' : 
                      'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-200'
                    }`}>
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      <span>남은 예약: {remainingDays}일</span>
                      {/* 펄스 애니메이션 */}
                      <div className={`absolute inset-0 rounded-xl animate-pulse ${
                        remainingDays > 2 ? 'bg-emerald-500' : 
                        remainingDays > 0 ? 'bg-amber-500' : 
                        'bg-red-500'
                      } opacity-30`}></div>
                    </div>
                    
                    {/* 진행률 바 */}
                    <div className="flex flex-col items-start">
                      <div className="text-xs text-gray-500 mb-1">이번 달 사용률</div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            remainingDays > 2 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                            remainingDays > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                            'bg-gradient-to-r from-red-400 to-pink-500'
                          }`}
                          style={{ width: `${((4 - remainingDays) / 4) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{4 - remainingDays}/4 사용</div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg shadow-sm">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">{currentUserInfo.region_name}</span>
                  </div>
                </div>
              </div>
              
              {/* 사용자 친화적인 달력 컨테이너 */}
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
                  tileDisabled={({ date }) => {
                    const dayStatus = getDayStatus(date);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateString = `${year}-${month}-${day}`;
                    const status = reservationStatus[dateString];
                    
                    // 예약 불가능한 날짜들만 비활성화 (네비게이션은 항상 가능)
                    return (
                      dayStatus === 'blocked' || 
                      dayStatus === 'full' || 
                      dayStatus === 'closed' ||
                      (status && !status.isOpen)
                    );
                  }}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) {
                      setCurrentMonth(activeStartDate);
                    }
                  }}
                  minDate={new Date()}
                  calendarType="gregory"
                  locale="ko-KR"
                  formatDay={(locale, date) => date.getDate().toString()}
                  formatShortWeekday={(locale, date) => 
                    ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
                  }
                  formatMonthYear={(locale, date) => 
                    `${date.getFullYear()}년 ${date.getMonth() + 1}월`
                  }
                  calendarType="gregory"
                  next2Label={null}
                  prev2Label={null}
                  showNeighboringMonth={false}
                />
                
                {/* 월 전체 예약 종료 오버레이 - 네비게이션은 제외 */}
                {isMonthClosed && !isLoadingCalendar && (
                  <div className="absolute bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-10" 
                       style={{
                         top: '140px', // 네비게이션 + 요일 헤더를 완전히 피하여 달력 그리드만 덮기
                         left: '0',
                         right: '0',
                         bottom: '0',
                         borderRadius: '0 0 1rem 1rem' // 하단 모서리만 둥글게
                       }}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <CalendarIcon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">현재는 예약기간이 아닙니다</h3>
                      <p className="text-gray-600 text-sm">
                        예약을 받지 않고 있습니다.<br/>
                        다른 달로 이동하여 예약 상태를 확인할 수 있습니다.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* 범례 - 참조 이미지 스타일에 맞춰 업데이트 */}
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
              </div>
              
            </div>
          </div>

          {/* 프리미엄 사이드바 */}
          <div className="space-y-6">
            {/* 이용 안내 */}
            <div className="bg-gradient-to-br from-white via-blue-50 to-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <div className="flex items-center mb-4">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
                <h3 className="text-xl font-bold text-gray-900">이용 안내</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center shadow-md">
                    <CalendarIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">월 최대 4일까지</div>
                    <div className="text-xs text-gray-600">예약 가능</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">하루 최대 2타임</div>
                    <div className="text-xs text-gray-600">신청 가능</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">타임당 40분</div>
                    <div className="text-xs text-gray-600">운영 시간</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{userRegion === 'south' ? '경기남부' : '경기북부'}</div>
                    <div className="text-xs text-gray-600">지역 서비스</div>
                  </div>
                </div>
              </div>
              
              {/* 문의하기 버튼 */}
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                      <HelpCircle className="w-4 h-4 text-gray-900" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">궁금한 점이 있으신가요?</h4>
                  <p className="text-xs text-gray-600 mb-3">언제든지 편리하게 문의해보세요</p>
                  <a
                    href="https://open.kakao.com/o/sgewClQh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    톡으로 문의하기
                  </a>
                </div>
              </div>
            </div>

            {/* 최근 예약 현황 */}
            <div className="bg-gradient-to-br from-white via-slate-50 to-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center mb-4">
                <div className="w-2 h-8 bg-gradient-to-b from-slate-500 to-gray-600 rounded-full mr-3"></div>
                <h3 className="text-xl font-bold text-gray-900">최근 예약 현황</h3>
              </div>
              
              {myReservations.length > 0 ? (
                <div className="space-y-3">
                  {myReservations.slice(0, 3).map((reservation, index) => (
                    <div key={reservation.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CalendarIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {reservation.date.toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {reservation.slots.length}개 타임
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>
                  ))}
                  
                  {myReservations.length > 3 && (
                    <div className="text-center text-sm text-gray-500 pt-2">
                      +{myReservations.length - 3}개 더
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                      <CalendarIcon className="w-8 h-8 text-gray-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">예약 내역이 없습니다</h4>
                  <p className="text-sm text-gray-500 mb-4">달력에서 날짜를 선택해<br/>스포츠박스 프로그램을 예약해보세요</p>
                </div>
              )}
              
              <button
                onClick={() => setActiveModal('myReservations')}
                className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center space-x-2">
                  <List className="w-4 h-4" />
                  <span>전체 예약 내역 보기</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 예약 모달 */}
      {activeModal === 'reservation' && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedDate.toLocaleDateString('ko-KR')} 예약 신청
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleReservationSubmit} className="space-y-6">
                {reservationSlots.map((slot, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-900">{index + 1}번째 타임</h4>
                      <div className="flex space-x-2">
                        {reservationSlots.length > 1 && index > 0 && (
                          <button
                            type="button"
                            onClick={() => copyToSlot(0, index)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            위 정보 복사
                          </button>
                        )}
                        {reservationSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          시작시간 *
                        </label>
                        <select
                          value={slot.startTime}
                          onChange={(e) => handleStartTimeChange(index, e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택하세요</option>
                          {timeOptions.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          종료시간
                        </label>
                        <input
                          type="text"
                          value={slot.endTime}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          placeholder="자동 계산"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          학년 *
                        </label>
                        <select
                          value={slot.grade}
                          onChange={(e) => {
                            const updated = [...reservationSlots];
                            updated[index].grade = e.target.value;
                            setReservationSlots(updated);
                          }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택하세요</option>
                          {gradeOptions.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          인원 *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={slot.participantCount}
                          onChange={(e) => {
                            const updated = [...reservationSlots];
                            updated[index].participantCount = e.target.value;
                            setReservationSlots(updated);
                          }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="참여 인원"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        장소 *
                      </label>
                      <input
                        type="text"
                        value={slot.location}
                        onChange={(e) => {
                          const updated = [...reservationSlots];
                          updated[index].location = e.target.value;
                          setReservationSlots(updated);
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="운영 장소를 입력해주세요"
                      />
                    </div>
                  </div>
                ))}

                {reservationSlots.length < 2 && (
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>타임 추가 (최대 2개)</span>
                  </button>
                )}

                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || remainingDays <= 0}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        신청 중...
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-5 h-5 mr-2" />
                        예약 신청
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 내 예약 목록 모달 */}
      {activeModal === 'myReservations' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">내 예약 목록</h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 월별 필터 */}
              <div className="mb-6">
                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}>
                    {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
                  </option>
                </select>
              </div>

              {/* 예약 목록 */}
              <div className="space-y-4">
                {myReservations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">예약 내역이 없습니다.</h4>
                    <p className="text-sm text-gray-500 mb-4">달력에서 날짜를 선택해 스포츠박스 프로그램을 예약해보세요.</p>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      새 예약 만들기
                    </button>
                  </div>
                ) : (
                  myReservations.map((reservation) => (
                    <div key={reservation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-4">
                          <div className="text-lg font-semibold text-gray-900">
                            {reservation.date.toLocaleDateString('ko-KR', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            reservation.status === 'approved' ? 'bg-green-100 text-green-800' :
                            reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            reservation.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            reservation.status === 'admin_cancelled' ? 'bg-red-100 text-red-800' :
                            reservation.status === 'cancel_requested' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {reservation.status === 'approved' ? '승인완료' :
                             reservation.status === 'pending' ? '승인대기' :
                             reservation.status === 'cancelled' ? '취소됨' :
                             reservation.status === 'admin_cancelled' ? '관리자취소' :
                             reservation.status === 'cancel_requested' ? '취소요청' : reservation.status}
                          </span>
                        </div>
                        {(reservation.status === 'pending' || reservation.status === 'approved') && (
                          <button 
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                            onClick={() => handleCancelReservation(reservation.id, reservation.status)}
                          >
                            취소
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {reservation.slots.map((slot, index) => (
                          <div key={index} className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="font-medium text-blue-900">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <span className="text-blue-700">{slot.grade}</span>
                              <span className="text-blue-700">{slot.participantCount}명</span>
                              <span className="text-blue-700">{slot.location}</span>
                            </div>
                          </div>
                        ))}
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

      {/* 참조 이미지 기반 개선된 달력 스타일 */}
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
      
      <AccountManagementModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        userType="user"
      />
    </div>
  );
}