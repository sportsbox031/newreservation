'use client';

import { useState, useEffect, useRef } from 'react';
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
import { dashboardAPI, settingsAPI, reservationAPI } from '@/lib/supabase';
import AccountManagementModal from '@/components/AccountManagementModal';
import { useSessionCheck } from '@/hooks/useSessionCheck';
import { shouldStartDashboardRefresh } from '@/lib/dashboardRefresh';
import { applyReservationStatusDelta } from '@/lib/reservationStatus';
import { getInitialDashboardMonth } from '@/lib/reservationActiveMonth';
import { formatYearMonthLabel } from '@/lib/penalty';
import { getPenaltyBanner } from '@/lib/penaltyBanner';
import Spinner from '@/components/Spinner';
import ModalOverlay from '@/components/ModalOverlay';
import {
  EMPTY_RESERVATION_SLOT_FORM,
  getClosedReservationModalState,
  type ReservationSlotFormState,
} from '@/lib/reservationModalState';
import { buildReservationStartTimeOptions } from '@/lib/reservationTimePolicy';
import {
  RESERVATION_DELAYED_PROGRESS_MESSAGE,
  RESERVATION_PROGRESS_MESSAGE,
  RESERVATION_SUCCESS_MESSAGE,
} from '@/lib/reservationMessages';

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

// 티어 타입
interface UserTier {
  tier_id: number;
  member_tiers: {
    id: number;
    tier_name: string;
    tier_level: number;
    description: string;
    advance_reservation_days: number;
    monthly_reservation_limit: number;
    daily_slot_limit: number;
  };
}

export default function DashboardPage() {
  const { isAuthenticated, user, isLoading, sessionError, logout } = useSessionCheck();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => getInitialDashboardMonth(null));
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0); // 이번 달 남은 예약 가능 일수
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
  const [hasLoadedMyReservations, setHasLoadedMyReservations] = useState(false);
  const [isLoadingMyReservations, setIsLoadingMyReservations] = useState(false);
  const [selectedReservationMonth, setSelectedReservationMonth] = useState<string>(
    `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusMessage, setSubmitStatusMessage] = useState('');
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  
  // 예약 현황 상태
  const [reservationStatus, setReservationStatus] = useState<{
    [date: string]: { current: number; max: number; isFull: boolean; isOpen: boolean }
  }>({});
  // 차단 정보: 하루 전체 차단(start_time=null)과 시간대별 차단 구분
  const [blockedDates, setBlockedDates] = useState<{
    date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
  }[]>([]);
  const [userRegion, setUserRegion] = useState<'south' | 'north' | null>(null);
  const [isMonthClosed, setIsMonthClosed] = useState(true); // 예약 종료가 기본값 (각 월마다 관리자가 수동으로 열어야 함)
  // 퇴장(신청 제한) 상태 — 제한월 동안 달력을 가리고 안내 모달을 띄운다
  const [penaltyRestriction, setPenaltyRestriction] = useState<{
    restrictedMonth: string | null;
    resumeMonth: string | null;
    triggeredByWarning: boolean;
  } | null>(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  // '회원 등급' 카드에 표시할 패널티 요약(경고 횟수 등) — 제한 여부와 무관하게 항상 표시
  const [penaltySummary, setPenaltySummary] = useState<{
    restricted: boolean;
    resumeMonth: string | null;
    warningCount: number;
    warningThreshold: number;
  } | null>(null);
  const [hasResolvedActiveMonth, setHasResolvedActiveMonth] = useState(false);
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    organization_name: string;
    region_name: string;
  }>({
    organization_name: '테스트단체',
    region_name: '경기남부'
  });
  
  const router = useRouter();
  const DASHBOARD_REFRESH_INTERVAL_MS = 60 * 1000;
  const DASHBOARD_REFRESH_MIN_INTERVAL_MS = 2 * 1000;
  const dashboardRefreshInFlightRef = useRef(false);
  const dashboardRefreshLastCompletedAtRef = useRef(0);

  // 학년 옵션
  const gradeOptions = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년', '기타'];

  // 시간 선택 옵션 (10:00 ~ 16:30, 10분 단위)
  const timeOptions = buildReservationStartTimeOptions();

  // 예약 취소 처리
  const handleCancelReservation = async (reservationId: string, status: ReservationStatus) => {
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) {
      return;
    }

    try {
      setIsSubmitting(true);
      const targetReservation = myReservations.find(reservation => reservation.id === reservationId);
      const targetDateString = targetReservation
        ? `${targetReservation.date.getFullYear()}-${String(targetReservation.date.getMonth() + 1).padStart(2, '0')}-${String(targetReservation.date.getDate()).padStart(2, '0')}`
        : null;

      if (status === 'pending') {
        // 승인대기 상태 - DB에서 즉시 완전 삭제
        const result = await reservationAPI.deleteReservation(reservationId);

        if (result.error) {
          alert('예약 취소 실패: ' + result.error.message);
          return;
        }

        alert('예약이 취소되었습니다.');

        if (targetDateString) {
          updateReservationStatusForDate(targetDateString, -1);
          dashboardAPI.clearClientCaches(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
          await refreshDashboardData(true, true);
        }
        const updatedReservations = myReservations.filter(reservation => reservation.id !== reservationId);
        setMyReservations(updatedReservations);
        calculateRemainingReservations(updatedReservations);

      } else if (status === 'approved') {
        // 승인 후 - 취소 요청만 전송
        const result = await reservationAPI.requestCancellation(reservationId);
        
        if (result.error) {
          alert('취소 요청 실패: ' + result.error.message);
          return;
        }
        
        alert('취소 요청이 관리자에게 전송되었습니다. 관리자 승인 후 취소됩니다.');
        if (hasLoadedMyReservations) {
          await loadMyReservations();
        }
      }

    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert('예약 취소 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 세션 기반 사용자 정보 설정
  useEffect(() => {
    if (user && isAuthenticated) {
      console.log('Dashboard - 세션 검증된 사용자 데이터:', user);
      
      // 지역 코드 추출
      let regionCode = 'south'; // 기본값
      let regionName = '경기남부'; // 기본값
      
      if (user.cities && user.cities.regions) {
        regionCode = user.cities.regions.code;
        regionName = user.cities.regions.name;
        console.log('Dashboard - 추출된 지역 정보:', { regionCode, regionName });
      } else if (user.region_code) {
        regionCode = user.region_code;
        regionName = user.region_code === 'south' ? '경기남부' : '경기북부';
        console.log('Dashboard - region_code에서 추출:', { regionCode, regionName });
      } else {
        console.log('Dashboard - 기본값 사용:', { regionCode, regionName });
      }
      
      // 사용자 정보 설정
      setCurrentUserInfo({
        organization_name: user.organization_name || '사용자',
        region_name: regionName
      });
      
      setUserRegion(regionCode as 'south' | 'north');

      // 사용자 티어 정보 로드
      loadUserTier();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !userRegion) {
      setHasResolvedActiveMonth(false);
      return;
    }

    let isCancelled = false;

    const resolveActiveMonth = async () => {
      const result = await dashboardAPI.getActiveMonth();
      if (isCancelled) {
        return;
      }

      const activeYearMonth = result.data?.yearMonth ?? null;
      setCurrentMonth(getInitialDashboardMonth(activeYearMonth));
      setHasResolvedActiveMonth(true);
    };

    resolveActiveMonth();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, userRegion]);

  // 실시간 하루 최대예약개수 체크 함수
  const checkReservationCapacity = async (date: Date) => {
    if (!date) return null;
    if (!userRegion) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    try {
      const { data: capacityData, error } = await settingsAPI.getDateReservationStatus(userRegion, dateString);
      
      if (error) {
        console.error('하루 최대예약개수 확인 오류:', error);
        return null;
      }
      
      return capacityData;
    } catch (error) {
      console.error('하루 최대예약개수 확인 중 예외:', error);
      return null;
    }
  };

  const applyDashboardMeData = (meData: any) => {
    if (meData?.user?.region_code) {
      setUserRegion(meData.user.region_code as 'south' | 'north');
    }

    if (meData?.user?.region_name || meData?.user?.organization_name) {
      setCurrentUserInfo({
        organization_name: meData.user.organization_name || '사용자',
        region_name: meData.user.region_name || '경기남부'
      });
    }

    if (meData?.user?.tier) {
      const tierName = meData.user.tier;
      setUserTier({
        tier_id: tierName === 'Priority' ? 1 : 2,
        member_tiers: {
          id: tierName === 'Priority' ? 1 : 2,
          tier_name: tierName,
          tier_level: tierName === 'Priority' ? 1 : 2,
          description: tierName === 'Priority'
            ? 'Priority 회원 (학생수 ≤240 OR 학급수 ≤11)'
            : 'Standard 회원',
          advance_reservation_days: tierName === 'Priority' ? 1 : 0,
          monthly_reservation_limit: 4,
          daily_slot_limit: 2
        }
      });
    }

    if (typeof meData?.remainingDays === 'number') {
      setRemainingDays(meData.remainingDays);
    }
  };

  const applyDashboardCalendarData = (calendarData: any) => {
    if (calendarData?.penalty?.restricted) {
      // 주기적 새로고침 시 모달이 반복해서 뜨지 않도록 기존 상태를 유지한다
      setPenaltyRestriction(prev => prev ?? {
        restrictedMonth: calendarData.penalty.restricted_month ?? null,
        resumeMonth: calendarData.penalty.resume_month ?? null,
        triggeredByWarning: calendarData.penalty.triggered_by_warning === true
      });
    } else {
      setPenaltyRestriction(null);
    }

    // 패널티 상태 배너용 요약(경고 0~1회 등 제한이 아닌 경우도 표시)
    const penalty = calendarData?.penalty;
    setPenaltySummary(penalty ? {
      restricted: penalty.restricted === true,
      resumeMonth: penalty.resume_month ?? null,
      warningCount: typeof penalty.warning_count === 'number' ? penalty.warning_count : 0,
      warningThreshold: typeof penalty.warning_threshold === 'number' ? penalty.warning_threshold : 2,
    } : null);

    const monthGateIsOpen = calendarData?.monthGate?.is_open === true;

    if (calendarData?.reservationStatus) {
      const formattedStatus: Record<string, { current: number; max: number; isFull: boolean; isOpen: boolean }> = {};
      let hasAnyOpenDay = false;

      Object.keys(calendarData.reservationStatus).forEach((dateString) => {
        const status = calendarData.reservationStatus[dateString];
        formattedStatus[dateString] = {
          current: status.current_reservations,
          max: status.max_reservations_per_day,
          isFull: status.is_full,
          isOpen: status.is_open
        };

        if (status.is_open) {
          hasAnyOpenDay = true;
        }
      });

      setReservationStatus(formattedStatus);
      setIsMonthClosed(!(monthGateIsOpen && hasAnyOpenDay));
    } else {
      setReservationStatus({});
      setIsMonthClosed(!monthGateIsOpen);
    }

    if (Array.isArray(calendarData?.blockedDates)) {
      setBlockedDates(calendarData.blockedDates.map((item: any) => ({
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        reason: item.reason
      })));
    } else {
      setBlockedDates([]);
    }

  };

  const refreshDashboardData = async (force = false, bypassCache = false) => {
    if (!isAuthenticated || !user || !userRegion) return;

    const now = Date.now();
    if (!shouldStartDashboardRefresh({
      now,
      inFlight: dashboardRefreshInFlightRef.current,
      lastCompletedAt: dashboardRefreshLastCompletedAtRef.current,
      minIntervalMs: DASHBOARD_REFRESH_MIN_INTERVAL_MS,
      force,
    })) {
      return;
    }

    try {
      dashboardRefreshInFlightRef.current = true;
      setIsLoadingCalendar(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const calendarPromise = dashboardAPI.getCalendar(year, month, { bypassCache });
      const mePromise = force
        ? dashboardAPI.getMe(year, month, { bypassCache })
        : Promise.resolve({ data: null, error: null });
      const [calendarResult, meResult] = await Promise.all([calendarPromise, mePromise]);

      if (calendarResult.error || !calendarResult.data) {
        console.error('대시보드 calendar 오류:', calendarResult.error);
        setIsMonthClosed(true);
        setReservationStatus({});
        setBlockedDates([]);
        setSelectedDate(null);
        setRemainingDays(4);
        return;
      }

      applyDashboardCalendarData(calendarResult.data);
      if (calendarResult.data?.monthGate?.is_open !== true) {
        setSelectedDate(null);
      }

      if (force && (meResult.error || !meResult.data)) {
        console.error('대시보드 me 오류:', meResult.error);
        setRemainingDays(4);
        return;
      }

      if (meResult.data) {
        applyDashboardMeData(meResult.data);
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 예외:', error);
    } finally {
      dashboardRefreshInFlightRef.current = false;
      dashboardRefreshLastCompletedAtRef.current = Date.now();
      setIsLoadingCalendar(false);
    }
  };

  // 데이터 로드 (월 변경이나 지역 변경 시 실행)
  useEffect(() => {
    if (hasResolvedActiveMonth && isAuthenticated && user && userRegion) {
      refreshDashboardData(true);
    }
  }, [currentMonth, hasResolvedActiveMonth, isAuthenticated, user, userRegion]);

  // 퇴장 상태가 처음 감지되면 안내 모달을 띄운다
  useEffect(() => {
    if (penaltyRestriction) {
      setShowPenaltyModal(true);
    }
  }, [penaltyRestriction]);

  // 실시간 설정 변경 감지를 위한 주기적 새로고침 (취소 승인 반영 포함)
  useEffect(() => {
    if (!hasResolvedActiveMonth || !isAuthenticated || !user || !userRegion) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && activeModal !== 'reservation' && !isSubmitting) {
        refreshDashboardData(false);
      }
    };

    const interval = setInterval(refreshIfVisible, DASHBOARD_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [currentMonth, hasResolvedActiveMonth, isAuthenticated, user, userRegion, activeModal, isSubmitting]);

  useEffect(() => {
    if (activeModal === 'myReservations' && !hasLoadedMyReservations) {
      loadMyReservations();
    }
  }, [activeModal, hasLoadedMyReservations]);

  // 사용자 티어 정보 로드
  const loadUserTier = async () => {
    if (!user?.id) return;

    try {
      // 간단한 tier 시스템 사용 (user 객체에서 직접 가져오기)
      const tierName = user.tier || 'Standard';

      // UserTier 인터페이스에 맞게 변환
      const tierData: UserTier = {
        tier_id: tierName === 'Priority' ? 1 : 2,
        member_tiers: {
          id: tierName === 'Priority' ? 1 : 2,
          tier_name: tierName,
          tier_level: tierName === 'Priority' ? 1 : 2,
          description: tierName === 'Priority'
            ? 'Priority 회원 (학생수 ≤240 OR 학급수 ≤11)'
            : 'Standard 회원',
          advance_reservation_days: tierName === 'Priority' ? 1 : 0,
          monthly_reservation_limit: 4,
          daily_slot_limit: 2
        }
      };

      setUserTier(tierData);
    } catch (error) {
      console.error('사용자 티어 정보 로드 중 예외:', error);
    }
  };

  // 예약 현황 로드 - 성능 최적화된 버전
  const loadReservationStatus = async () => {
    try {
      if (!userRegion) return;
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      // 월별 일괄 조회로 성능 개선 (31개 API 호출 → 1개 API 호출)
      const { data: monthStatus, error } = await settingsAPI.getMonthReservationStatus(userRegion, year, month);
      
      if (error) {
        console.error('예약 현황 로드 오류:', error);
        // 오류 발생 시 기본값으로 폴백 (예약 종료 상태가 기본값)
        const endOfMonth = new Date(year, month, 0);
        const fallbackStatus: Record<string, { current: number; max: number; isFull: boolean; isOpen: boolean }> = {};
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
        const formattedStatus: Record<string, { current: number; max: number; isFull: boolean; isOpen: boolean }> = {};
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

  // 차단된 날짜 로드 (하루 전체 차단 + 시간대별 차단 구분)
  const loadBlockedDates = async () => {
    try {
      if (!userRegion) return;
      const { data, error } = await settingsAPI.getBlockedDates(userRegion);
      if (error) {
        console.error('차단된 날짜 로드 오류:', error);
        return;
      }

      if (data) {
        // 전체 차단 정보 저장 (시간대별 차단 구분을 위해)
        const blocked = data.map((item: any) => ({
          date: item.date,
          start_time: item.start_time,
          end_time: item.end_time,
          reason: item.reason
        }));
        setBlockedDates(blocked);
      }
    } catch (error) {
      console.error('차단된 날짜 로드 예외:', error);
    }
  };

  // 내 예약 목록 로드
  const loadMyReservations = async () => {
    try {
      const userId = user?.id;
      if (!userId) return;
      setIsLoadingMyReservations(true);

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
        setHasLoadedMyReservations(true);
        
        // 이번 달 예약 횟수 계산
        calculateRemainingReservations(reservations);
      } else {
        setMyReservations([]);
        setHasLoadedMyReservations(true);
        setRemainingDays(4); // 예약이 없으면 전체 4일
      }
    } catch (error) {
      console.error('내 예약 목록 로드 오류:', error);
    } finally {
      setIsLoadingMyReservations(false);
    }
  };

  // 달력에서 보고 있는 월 기준 남은 예약 횟수 계산
  const calculateRemainingReservations = (reservations: Reservation[]) => {
    // 달력에서 현재 보고 있는 월을 기준으로 계산 (상태 currentMonth 사용)
    const calendarYear = currentMonth.getFullYear();
    const calendarMonthNum = currentMonth.getMonth();

    // 해당 월의 예약 개수 계산 (취소 확정되지 않은 모든 예약)
    const thisMonthReservations = reservations.filter(reservation => {
      const reservationDate = new Date(reservation.date);
      return reservationDate.getFullYear() === calendarYear &&
             reservationDate.getMonth() === calendarMonthNum &&
             (reservation.status === 'approved' || reservation.status === 'pending' || reservation.status === 'cancel_requested'); // 취소 요청 중인 것도 포함
    });

    const usedDays = thisMonthReservations.length;
    const remaining = Math.max(0, 4 - usedDays); // 최대 4일에서 사용한 일수 빼기

    setRemainingDays(remaining);
  };

  const updateReservationStatusForDate = (dateString: string, delta: number) => {
    setReservationStatus(prev => applyReservationStatusDelta(prev, dateString, delta));
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

  // 특정 시간이 차단된 시간대와 겹치는지 확인 (시작시간 + 40분 기준)
  const isTimeBlocked = (startTime: string): boolean => {
    if (!selectedDate) return false;

    const dateYear = selectedDate.getFullYear();
    const dateMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dateDay = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${dateYear}-${dateMonth}-${dateDay}`;

    const endTime = calculateEndTime(startTime);
    if (!endTime) return false;

    // 해당 날짜의 시간대별 차단 목록
    const dateBlockedSlots = blockedDates.filter(
      b => b.date === dateString && b.start_time && b.end_time
    );

    // 시간대 겹침 검사
    for (const blocked of dateBlockedSlots) {
      if (startTime < blocked.end_time! && endTime > blocked.start_time!) {
        return true;
      }
    }
    return false;
  };

  // 선택된 날짜의 차단 시간대 정보 가져오기
  const getBlockedTimeRanges = (): string[] => {
    if (!selectedDate) return [];

    const dateYear = selectedDate.getFullYear();
    const dateMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dateDay = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${dateYear}-${dateMonth}-${dateDay}`;

    return blockedDates
      .filter(b => b.date === dateString && b.start_time && b.end_time)
      .map(b => `${b.start_time?.substring(0, 5)}~${b.end_time?.substring(0, 5)}`);
  };

  // 시작시간 변경 핸들러
  const handleStartTimeChange = (index: number, startTime: string) => {
    const updatedSlots = [...reservationSlots];
    updatedSlots[index].startTime = startTime;
    updatedSlots[index].endTime = calculateEndTime(startTime);
    setReservationSlots(updatedSlots);
  };

  // 두번째 타임 시작시간이 첫번째 타임 종료시간보다 이른지 확인 (두번째 타임에만 적용)
  const isBeforeFirstSlotEnd = (index: number, startTime: string): boolean => {
    if (index !== 1) return false;
    const firstEndTime = reservationSlots[0].endTime;
    if (!firstEndTime) return false;
    return startTime < firstEndTime;
  };

  // 2번째 슬롯이 입력되었는지 확인
  const isSlotFilled = (slot: ReservationSlotFormState) =>
    slot.startTime !== '' || slot.grade !== '' || slot.participantCount !== '' || slot.location !== '';

  // 2번째 슬롯 초기화
  const clearSecondSlot = () => {
    const updatedSlots = [...reservationSlots];
    updatedSlots[1] = { ...EMPTY_RESERVATION_SLOT_FORM };
    setReservationSlots(updatedSlots);
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

    // 주말(토요일=6, 일요일=0)은 예약 불가
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'blocked';

    // 로컬 시간대로 날짜 변환 (시간대 오류 방지)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // 차단된 날짜 체크: 하루 전체 차단(start_time=null)인 경우에만 날짜 자체를 막음
    // 시간대별 차단은 날짜 클릭은 허용하고, 예약 모달에서 해당 시간대만 막음
    const fullDayBlocked = blockedDates.some(
      b => b.date === dateString && !b.start_time && !b.end_time
    );
    if (fullDayBlocked) return 'blocked';
    
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
  const handleDateClick = async (value: CalendarValue) => {
    if (!value || Array.isArray(value)) return;
    if (isMonthClosed) return;

    // 주말 체크 (토요일=6, 일요일=0)
    const dayOfWeek = value.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      alert('주말은 예약할 수 없습니다. 평일만 예약 가능합니다.');
      return;
    }

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
    
    setSelectedDate(value);
    setActiveModal('reservation');
    
    // 예약 폼 초기화
    setReservationSlots([{ ...EMPTY_RESERVATION_SLOT_FORM }, { ...EMPTY_RESERVATION_SLOT_FORM }]);
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
    // 하루 전체 차단(start_time=null)인 경우에만 X 표시
    const isFullDayBlocked = blockedDates.some(
      b => b.date === dateString && !b.start_time && !b.end_time
    );

    // 주말 체크 (토요일=6, 일요일=0)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isLoadingCalendar) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-4 h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full animate-pulse"></div>
        </div>
      );
    }

    // 주말인 경우 "주말" 표시
    if (isWeekend) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-end p-1">
          <div className="px-1.5 py-0.5 bg-gray-400 text-white text-xs font-medium rounded-md">
            주말
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-end p-1 space-y-1">
        {isFullDayBlocked && (
          <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full shadow-sm" title="예약 불가 (하루 전체)">
            <X className="w-3 h-3 text-white" />
          </div>
        )}
        {status && !isFullDayBlocked && (
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
    setSubmitStatusMessage('');
    let delayedStatusTimer: number | null = null;
    const closeReservationModal = () => {
      const resetState = getClosedReservationModalState();
      setActiveModal(resetState.activeModal);
      setSelectedDate(resetState.selectedDate);
      setReservationSlots(resetState.reservationSlots);
    };
    
    try {
      const filteredSlots = reservationSlots.filter(slot => 
        slot.startTime && slot.grade && slot.participantCount && slot.location
      );

      if (filteredSlots.length === 0) {
        alert('최소 한 개의 예약 시간을 입력해야 합니다.');
        setIsSubmitting(false);
        return;
      }

      if (!selectedDate) {
        alert('날짜를 선택해주세요.');
        setIsSubmitting(false);
        setSubmitStatusMessage('');
        return;
      }

      // 날짜를 문자열로 변환 (시간대 오류 방지)
      const dateYear = selectedDate.getFullYear();
      const dateMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dateDay = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${dateYear}-${dateMonth}-${dateDay}`;

      // 시작 시간 중복 검증 (첫 번째 타임과 두 번째 타임이 같으면 안 됨)
      const startTimes = filteredSlots.map(slot => slot.startTime);
      const uniqueStartTimes = new Set(startTimes);

      if (startTimes.length !== uniqueStartTimes.size) {
        alert('시작 시간이 중복됩니다. 각 타임의 시작 시간은 서로 달라야 합니다.');
        setIsSubmitting(false);
        setSubmitStatusMessage('');
        return;
      }

      // 타임 순서 검증 (두번째 타임 시작 시간은 첫번째 타임 종료 시간보다 빠를 수 없음)
      if (filteredSlots.length === 2 && filteredSlots[1].startTime < filteredSlots[0].endTime) {
        alert('두번째 타임의 시작 시간은 첫번째 타임의 종료 시간보다 빠를 수 없습니다.');
        setIsSubmitting(false);
        setSubmitStatusMessage('');
        return;
      }

      // 시간대별 차단 검증 (기존 예약에는 영향 없고, 새 예약만 검증)
      const dateBlockedSlots = blockedDates.filter(b => b.date === dateString && b.start_time && b.end_time);
      for (const slot of filteredSlots) {
        for (const blocked of dateBlockedSlots) {
          // 시간대 겹침 검사: 슬롯 시작 < 차단 종료 AND 슬롯 종료 > 차단 시작
          if (slot.startTime < blocked.end_time! && slot.endTime > blocked.start_time!) {
            alert(`${blocked.start_time?.substring(0, 5)}~${blocked.end_time?.substring(0, 5)} 시간대는 예약이 차단되어 있습니다.\n사유: ${blocked.reason || '관리자 설정'}`);
            setIsSubmitting(false);
            setSubmitStatusMessage('');
            return;
          }
        }
      }

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
      
      // 세션에서 사용자 정보 가져오기
      if (!user || !isAuthenticated) {
        alert('예약을 위해 로그인이 필요합니다.');
        setIsSubmitting(false);
        setSubmitStatusMessage('');
        return;
      }

      if (!user.id) {
        alert('사용자 정보가 올바르지 않습니다. 다시 로그인해주세요.');
        setIsSubmitting(false);
        setSubmitStatusMessage('');
        return;
      }

      setSubmitStatusMessage(RESERVATION_PROGRESS_MESSAGE);

      delayedStatusTimer = window.setTimeout(() => {
        setSubmitStatusMessage(prev => prev ? RESERVATION_DELAYED_PROGRESS_MESSAGE : prev);
      }, 4000);

      console.log('예약 API 호출:', { userId: user.id, regionId, dateString });
      const result = await reservationAPI.submitReservation(
        regionId,
        dateString,
        slotsData
      );

      if (result.error) {
        closeReservationModal();
        alert(`예약 신청 실패: ${result.error.message}`);
        setSubmitStatusMessage('');
        return;
      }

      // API에서 반환된 새 예약 데이터를 즉시 로컬 상태에 추가 (서버 지연 문제 해결)
      if (result.data) {
        const newReservation: Reservation = {
          id: result.data.id,
          date: new Date(dateString + 'T00:00:00'),
          status: 'pending' as const,
          slots: result.data.reservation_slots.map((slot: any) => ({
            startTime: slot.start_time,
            endTime: slot.end_time,
            grade: slot.grade,
            participantCount: slot.participant_count,
            location: slot.location
          })),
          created_at: new Date()
        };

        if (hasLoadedMyReservations) {
          const updatedReservations = [...myReservations, newReservation];
          setMyReservations(updatedReservations);
          calculateRemainingReservations(updatedReservations);
        } else {
          setRemainingDays(prev => Math.max(0, prev - 1));
        }

        updateReservationStatusForDate(dateString, 1);
        dashboardAPI.clearClientCaches(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        await refreshDashboardData(true, true);
      }

      // 모달 닫기
      closeReservationModal();
      
      alert(RESERVATION_SUCCESS_MESSAGE);
      
    } catch (error) {
      console.error('예약 신청 오류:', error);
      closeReservationModal();
      alert('예약 신청 중 오류가 발생했습니다.');
    } finally {
      if (typeof delayedStatusTimer === 'number') {
        window.clearTimeout(delayedStatusTimer);
      }
      setIsSubmitting(false);
      setSubmitStatusMessage('');
    }
  };

  // 세션 기반 로그아웃
  const handleLogout = async () => {
    try {
      await logout(); // useSessionCheck hook의 logout 함수 사용
      console.log('세션 기반 로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 처리 오류:', error);
      // 오류가 발생해도 강제 로그아웃
      localStorage.clear();
      window.location.href = '/auth/login';
    }
  };

  // 계정 관리
  const handleAccountManagement = () => {
    setShowAccountModal(true);
  };

  const handleOpenMyReservations = async () => {
    setActiveModal('myReservations');
    if (!hasLoadedMyReservations) {
      await loadMyReservations();
    }
  };

  // 세션 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않았거나 세션 오류가 있는 경우
  if (!isAuthenticated || sessionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-medium text-red-800 mb-2">인증 실패</h2>
            <p className="text-red-600 mb-4">{sessionError || '세션이 만료되었습니다.'}</p>
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              로그인 페이지로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 sports-box-gradient rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">스포츠박스</h1>
                <p className="text-xs sm:text-sm text-blue-600">예약 대시보드</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* 모바일용 티어 뱃지 */}
              <div className="flex md:hidden">
                {userTier && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    userTier.member_tiers?.tier_name === 'Priority'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {userTier.member_tiers?.tier_name === 'Priority' ? '🟡' : '⚪'}
                  </span>
                )}
              </div>

              {/* 데스크톱용 전체 정보 */}
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{currentUserInfo.organization_name}</span>
                <span className="text-gray-400">|</span>
                <span>{currentUserInfo.region_name}</span>
                {userTier && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      userTier.member_tiers?.tier_name === 'Priority'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userTier.member_tiers?.tier_name === 'Priority' ? '🟡' : '⚪'} {userTier.member_tiers?.tier_name}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={handleOpenMyReservations}
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 p-1 sm:p-0"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">내 예약</span>
              </button>
              <button
                onClick={handleAccountManagement}
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 p-1 sm:p-0"
              >
                <UserCog className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">계정 관리</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-700 hover:text-red-600 p-1 sm:p-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-8">
          {/* 달력 섹션 - 더 확대됨 */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">예약 달력</h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  {/* 프리미엄 예약 카운터 */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <div className={`relative inline-flex items-center px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 ${
                      remainingDays > 2 ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-200' :
                      remainingDays > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200' :
                      'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-red-200'
                    }`}>
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="text-xs sm:text-sm">
                        남은 예약: <span className="font-bold">{remainingDays}일</span>
                      </span>
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
                      <div className="w-full sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            remainingDays > 2 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                            remainingDays > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                            'bg-gradient-to-r from-red-400 to-pink-500'
                          }`}
                          style={{ width: `${((4 - remainingDays) / 4) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        <span className="font-medium">{4 - remainingDays}</span>/4 사용
                      </div>
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
                <div className="mb-4 flex items-center justify-center">
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </div>
                </div>
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
                  activeStartDate={currentMonth}
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
                      setCurrentMonth(currentMonth);
                    }
                  }}
                  minDate={new Date()}
                  calendarType="gregory"
                  locale="ko-KR"
                  showNavigation={false}
                  formatDay={(locale, date) => date.getDate().toString()}
                  formatShortWeekday={(locale, date) => 
                    ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
                  }
                  prevLabel={null}
                  nextLabel={null}
                  next2Label={null}
                  prev2Label={null}
                  showNeighboringMonth={false}
                />
                
                {/* 퇴장(신청 제한) 오버레이 — 달력을 가린다 */}
                {penaltyRestriction && !isLoadingCalendar && (
                  <div className="absolute bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-10"
                       style={{
                         top: '0',
                         left: '0',
                         right: '0',
                         bottom: '0',
                         borderRadius: '1rem'
                       }}>
                    <div className="text-center px-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-3xl">🟥</span>
                      </div>
                      <h3 className="text-xl font-bold text-red-700 mb-2 break-keep">패널티 조치로 신청이 제한되었습니다.</h3>
                      <p className="text-sm text-gray-600 break-keep">
                        {penaltyRestriction.resumeMonth
                          ? `${formatYearMonthLabel(penaltyRestriction.resumeMonth)}부터 신청이 가능합니다.`
                          : '다음달부터 신청이 가능합니다.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 월 전체 예약 종료 오버레이 */}
                {isMonthClosed && !isLoadingCalendar && !penaltyRestriction && (
                  <div className="absolute bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-10"
                       style={{
                         top: '0',
                         left: '0',
                         right: '0',
                         bottom: '0',
                         borderRadius: '1rem'
                       }}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <CalendarIcon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">예약기간이 아닙니다.</h3>
                    </div>
                  </div>
                )}
                
                {/* 범례 - 참조 이미지 스타일에 맞춰 업데이트 */}
                <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-pink-200 rounded-full"></div>
                    <span className="break-keep">예약가능</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-pink-300 rounded-full"></div>
                    <span className="break-keep">일부예약</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-600 rounded-full"></div>
                    <span className="break-keep">예약마감</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-300 rounded-full"></div>
                    <span className="break-keep">예약불가</span>
                  </div>
                  <div className="text-xs text-gray-500 w-full sm:w-auto sm:ml-4 mt-1 sm:mt-0 break-keep">
                    * 숫자는 현재예약수/최대예약수를 나타냅니다
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* 프리미엄 사이드바 */}
          <div className="space-y-4 sm:space-y-6">
            {/* 이용 안내 */}
            <div className="bg-gradient-to-br from-white via-blue-50 to-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-blue-100">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-2 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-2 sm:mr-3"></div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">이용 안내</h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center shadow-md">
                    <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900">월 최대 4일까지</div>
                    <div className="text-xs text-gray-600">예약 가능</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900">하루 최대 2타임</div>
                    <div className="text-xs text-gray-600">신청 가능</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900">타임당 40분</div>
                    <div className="text-xs text-gray-600">운영 시간</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 break-keep">
                      {userRegion === 'south' ? '경기남부' : '경기북부'}
                    </div>
                    <div className="text-xs text-gray-600">지역 서비스</div>
                  </div>
                </div>
              </div>

              {/* 문의하기 버튼 */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl border border-yellow-200">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-900" />
                    </div>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 break-keep">
                    궁금한 점이 있으신가요?
                  </h4>
                  <p className="text-xs text-gray-600 mb-3 break-keep">
                    언제든지 편리하게 문의해보세요
                  </p>
                  <a
                    href={currentUserInfo.region_name === '경기북부'
                      ? 'https://open.kakao.com/o/sFPfe5ai'
                      : 'https://open.kakao.com/o/sgewClQh'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 sm:gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    톡으로 문의하기
                  </a>
                </div>
              </div>
            </div>

            {/* 회원 티어 정보 */}
            {userTier && (
              <div className={`rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border ${
                userTier.member_tiers?.tier_name === 'Priority'
                  ? 'bg-gradient-to-br from-yellow-50 via-yellow-25 to-white border-yellow-200'
                  : 'bg-gradient-to-br from-gray-50 via-gray-25 to-white border-gray-200'
              }`}>
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className={`w-2 h-6 sm:h-8 rounded-full mr-2 sm:mr-3 ${
                    userTier.member_tiers?.tier_name === 'Priority'
                      ? 'bg-gradient-to-b from-yellow-400 to-yellow-600'
                      : 'bg-gradient-to-b from-gray-400 to-gray-600'
                  }`}></div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">회원 등급</h3>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">현재 등급</span>
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                      userTier.member_tiers?.tier_name === 'Priority'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userTier.member_tiers?.tier_name === 'Priority' ? '🟡' : '⚪'} {userTier.member_tiers?.tier_name}
                    </span>
                  </div>

                  <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">등급 혜택</h4>
                    <div className="flex items-start text-xs sm:text-sm text-green-600">
                      <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 mt-0.5 flex-shrink-0" />
                      <div className="break-keep">
                        {userTier.member_tiers?.tier_name === 'Priority' ? (
                          <>
                            <div className="font-medium">매월 20일 예약가능</div>
                            <div className="text-xs text-gray-500 mt-1">
                              20일 또는 21일이 영업일이 아닌경우 이전 영업일에 예약가능
                            </div>
                            <div className="text-xs text-blue-600 mt-1.5 bg-blue-50 p-2 rounded">
                              예시: 전체 예약일인 21일이 토요일인 경우<br />
                              Priority → 19일(목) 예약가능<br />
                              전쳬회원 → 20일(금) 예약가능
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">매월 21일 예약가능</div>
                            <div className="text-xs text-gray-500 mt-1">
                              21일이 영업일이 아닌경우 이전 영업일에 예약가능
                            </div>
                            <div className="text-xs text-blue-600 mt-1.5 bg-blue-50 p-2 rounded">
                              예시: 21일이 토요일인 경우<br />
                              Standard → 20일(금) 예약가능<br />
                              Priority → 19일(목) 예약가능
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {penaltySummary && (() => {
                    const banner = getPenaltyBanner({
                      restricted: penaltySummary.restricted,
                      resumeMonth: penaltySummary.resumeMonth,
                      warningCount: penaltySummary.warningCount,
                      warningThreshold: penaltySummary.warningThreshold,
                    });
                    const styles = {
                      ok: { box: 'bg-green-50 border-green-200', title: 'text-green-800', text: 'text-green-700', icon: '✅' },
                      warning: { box: 'bg-yellow-50 border-yellow-200', title: 'text-yellow-800', text: 'text-yellow-700', icon: '⚠️' },
                      restricted: { box: 'bg-red-50 border-red-200', title: 'text-red-800', text: 'text-red-700', icon: '🟥' },
                    }[banner.level];
                    return (
                      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100">
                        <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">패널티 상태</h4>
                        <div className={`rounded-lg border p-3 ${styles.box}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{styles.icon}</span>
                            <span className={`text-sm sm:text-base font-semibold ${styles.title}`}>{banner.title}</span>
                          </div>
                          <p className={`mt-1 text-xs sm:text-sm break-keep ${styles.text}`}>{banner.detail}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded text-center break-keep">
                    관리자가 예약을 시작하면 예약 가능합니다
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 퇴장(신청 제한) 안내 모달 */}
      {showPenaltyModal && penaltyRestriction && (
        <ModalOverlay onClose={() => setShowPenaltyModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🟥</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 break-keep">패널티 조치 안내</h3>
              <p className="text-sm text-gray-700 mb-2 break-keep">
                {penaltyRestriction.triggeredByWarning
                  ? '경고 2회 누적으로 인해 패널티 조치되었습니다.'
                  : '운영 규정 위반으로 인해 패널티 조치되었습니다.'}
              </p>
              <p className="text-sm text-gray-700 mb-6 break-keep">
                {penaltyRestriction.restrictedMonth && penaltyRestriction.resumeMonth
                  ? `해당 월(${formatYearMonthLabel(penaltyRestriction.restrictedMonth)})은 신청이 제한되며 ${formatYearMonthLabel(penaltyRestriction.resumeMonth)}부터 신청이 가능합니다.`
                  : '해당 월은 신청이 제한됩니다.'}
              </p>
              <button
                onClick={() => setShowPenaltyModal(false)}
                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 예약 모달 */}
      {activeModal === 'reservation' && selectedDate && (
        <ModalOverlay
          padding="p-2 sm:p-4"
          onClose={() => setActiveModal(null)}
          closeOnBackdrop={false}
        >
          <div className="bg-white rounded-lg sm:rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-keep">
                  {selectedDate.toLocaleDateString('ko-KR')} 예약 신청
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <form onSubmit={handleReservationSubmit} className="space-y-4 sm:space-y-6">
                {reservationSlots.map((slot, index) => {
                  const isOptional = index > 0;
                  const isRequired = !isOptional;
                  return (
                  <div
                    key={index}
                    className={`rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 ${
                      isOptional
                        ? 'border-2 border-dashed border-gray-300'
                        : 'border border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                        {index === 0 ? '첫번째 타임' : '두번째 타임'}
                        {isOptional && (
                          <span className="ml-2 text-xs font-normal text-gray-400">(선택)</span>
                        )}
                      </h4>
                      <div className="flex space-x-1 sm:space-x-2">
                        {isOptional && (
                          <button
                            type="button"
                            onClick={() => copyToSlot(0, index)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center p-1"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline break-keep">위 정보 복사</span>
                            <span className="sm:hidden">복사</span>
                          </button>
                        )}
                        {isOptional && isSlotFilled(slot) && (
                          <button
                            type="button"
                            onClick={clearSecondSlot}
                            className="text-xs text-gray-400 hover:text-red-500 flex items-center p-1"
                            title="초기화"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 차단된 시간대 안내 (첫 번째 슬롯에서만 표시) */}
                    {index === 0 && getBlockedTimeRanges().length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                        <p className="text-sm text-red-700 flex items-center">
                          <span className="mr-2">⛔</span>
                          <span>
                            <strong>차단된 시간대:</strong> {getBlockedTimeRanges().join(', ')}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          시작시간 {isRequired && '*'}
                        </label>
                        <select
                          value={slot.startTime}
                          onChange={(e) => handleStartTimeChange(index, e.target.value)}
                          required={isRequired}
                          className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택하세요</option>
                          {timeOptions.map(time => {
                            const blocked = isTimeBlocked(time);
                            const beforeFirstSlotEnd = isBeforeFirstSlotEnd(index, time);
                            const disabled = blocked || beforeFirstSlotEnd;
                            return (
                              <option
                                key={time}
                                value={time}
                                disabled={disabled}
                                className={disabled ? 'text-gray-400 bg-gray-100' : ''}
                              >
                                {time}{blocked ? ' (차단됨)' : beforeFirstSlotEnd ? ' (첫번째 타임 시간)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          종료시간
                        </label>
                        <input
                          type="text"
                          value={slot.endTime}
                          readOnly
                          className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50"
                          placeholder="자동 계산"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          학년 {isRequired && '*'}
                        </label>
                        <select
                          value={slot.grade}
                          onChange={(e) => {
                            const updated = [...reservationSlots];
                            updated[index].grade = e.target.value;
                            setReservationSlots(updated);
                          }}
                          required={isRequired}
                          className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택하세요</option>
                          {gradeOptions.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                        {slot.grade === '기타' && (
                          <p className="mt-1 text-xs sm:text-sm text-orange-600 font-medium">
                            톡으로 학년을 남겨주세요.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          인원 {isRequired && '*'}
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
                          required={isRequired}
                          className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="참여 인원"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        장소 {isRequired && '*'}
                      </label>
                      <input
                        type="text"
                        lang="ko"
                        value={slot.location}
                        onChange={(e) => {
                          const updated = [...reservationSlots];
                          updated[index].location = e.target.value;
                          setReservationSlots(updated);
                        }}
                        required={isRequired}
                        className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="운영 장소를 입력해주세요"
                      />
                    </div>
                  </div>
                  );
                })}

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || remainingDays <= 0}
                    className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm sm:text-base font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                        <span className="break-keep">{submitStatusMessage || '신청 중...'}</span>
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        <span className="break-keep">예약 신청</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 내 예약 목록 모달 */}
      {activeModal === 'myReservations' && (
        <ModalOverlay padding="p-2 sm:p-4" onClose={() => setActiveModal(null)}>
          <div className="bg-white rounded-lg sm:rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-keep">내 예약 목록</h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* 월별 필터 */}
              <div className="mb-4 sm:mb-6">
                <select
                  value={selectedReservationMonth}
                  onChange={(e) => setSelectedReservationMonth(e.target.value)}
                  disabled={isLoadingMyReservations || !hasLoadedMyReservations}
                  className="px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(() => {
                    // 예약이 있는 월들을 추출
                    const monthsWithReservations = new Set<string>();
                    myReservations.forEach(res => {
                      const date = new Date(res.date);
                      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                      monthsWithReservations.add(monthKey);
                    });

                    // 현재 월도 포함
                    const currentMonthKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
                    monthsWithReservations.add(currentMonthKey);

                    // 정렬된 월 목록 생성
                    const sortedMonths = Array.from(monthsWithReservations).sort().reverse();

                    return sortedMonths.map(monthKey => {
                      const [year, month] = monthKey.split('-');
                      return (
                        <option key={monthKey} value={monthKey}>
                          {year}년 {parseInt(month)}월
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              {/* 예약 목록 */}
              <div className="space-y-4">
                {isLoadingMyReservations ? (
                  <div className="text-center py-12 text-gray-500">
                    <Spinner className="mx-auto mb-4" />
                    <p>예약 내역을 불러오는 중...</p>
                  </div>
                ) : (() => {
                  // 선택된 월에 해당하는 예약만 필터링
                  const [year, month] = selectedReservationMonth.split('-');
                  const filteredReservations = myReservations.filter(res => {
                    const resDate = new Date(res.date);
                    const resYear = resDate.getFullYear();
                    const resMonth = (resDate.getMonth() + 1).toString().padStart(2, '0');
                    return resYear.toString() === year && resMonth === month;
                  });

                  return filteredReservations.length === 0 ? (
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
                  filteredReservations.map((reservation) => (
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
                                {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
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
                );
              })()}
              </div>
            </div>
          </div>
        </ModalOverlay>
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
          @apply bg-pink-100 hover:bg-pink-200 border-pink-300;
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
