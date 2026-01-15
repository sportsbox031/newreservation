'use client';

import { useState, useEffect } from 'react';
import { sessionAPI } from '@/lib/supabase';

// 로그아웃 진행 중 플래그 (수동 로그아웃과 강제 로그아웃 구분용)
let isManualLogout = false;

export interface SessionCheckResult {
  isValid: boolean;
  user?: any;
  error?: string;
  shouldLogout?: boolean;
}

// 클라이언트 사이드 세션 검증
export async function checkClientSession(): Promise<SessionCheckResult> {
  try {
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken) {
      return {
        isValid: false,
        error: '세션 토큰이 없습니다.',
        shouldLogout: true
      };
    }

    // 세션 유효성 검증
    const { data: sessionData, error } = await sessionAPI.validateSession(sessionToken);

    if (error || !sessionData) {
      console.log('세션 검증 실패:', error);
      return {
        isValid: false,
        error: '세션이 만료되었거나 유효하지 않습니다.',
        shouldLogout: true
      };
    }

    // 세션 갱신 (활동 시간 업데이트)
    await sessionAPI.refreshSession(sessionToken);

    return {
      isValid: true,
      user: sessionData.users
    };

  } catch (error) {
    console.error('세션 검증 중 오류:', error);
    return {
      isValid: false,
      error: '세션 검증 중 오류가 발생했습니다.',
      shouldLogout: true
    };
  }
}

// 로그아웃 처리
export async function performLogout(sessionToken?: string): Promise<void> {
  // 수동 로그아웃 플래그 설정 (세션 체크에서 "다른 기기" 메시지 방지)
  isManualLogout = true;

  try {
    const token = sessionToken || localStorage.getItem('session_token');

    if (token) {
      // 서버에서 세션 비활성화
      await sessionAPI.logout(token);
    }

    // 로컬 스토리지 정리
    localStorage.removeItem('session_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminInfo');

    // 페이지 리디렉션
    window.location.href = '/auth/login';

  } catch (error) {
    console.error('로그아웃 처리 오류:', error);
    // 오류가 발생해도 로컬 정보는 정리하고 로그인 페이지로 이동
    localStorage.clear();
    window.location.href = '/auth/login';
  }
}

// 다중 로그인 감지
export async function detectMultipleLogins(userId: string): Promise<{
  hasMultiple: boolean;
  sessions: any[];
}> {
  try {
    const { data, hasMultipleSessions } = await sessionAPI.detectMultipleLogins(userId);
    
    return {
      hasMultiple: hasMultipleSessions,
      sessions: data || []
    };
  } catch (error) {
    console.error('다중 로그인 감지 오류:', error);
    return {
      hasMultiple: false,
      sessions: []
    };
  }
}

// React Hook으로 세션 상태 관리
export function useSessionCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string>('');

  useEffect(() => {
    let isCheckingSession = false; // 중복 체크 방지
    let lastCheckTime = 0; // 마지막 체크 시간

    const checkSession = async () => {
      if (isCheckingSession) return; // 이미 체크 중이면 스킵

      isCheckingSession = true;
      const result = await checkClientSession();

      setIsAuthenticated(result.isValid);
      setUser(result.user || null);
      setSessionError(result.error || '');
      setIsLoading(false);

      if (!result.isValid && result.shouldLogout) {
        // 수동 로그아웃이 아닌 경우에만 "다른 기기" 메시지 표시
        if (!isManualLogout) {
          alert('다른 기기에서 로그인되어 자동 로그아웃되었습니다.');
          await performLogout();
        }
      }

      isCheckingSession = false;
    };

    // 초기 세션 체크
    checkSession();

    // 사용자 활동 감지 시 즉시 세션 체크 (Throttle: 1초에 최대 1회)
    const handleUserActivity = async () => {
      const now = Date.now();
      if (now - lastCheckTime < 1000) return; // 1초 이내 중복 체크 방지

      lastCheckTime = now;
      await checkSession();
    };

    // 전역 이벤트 리스너 등록
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);

    // 백업: 30초마다 세션 체크 (사용자 활동이 없을 때를 대비)
    const intervalId = setInterval(async () => {
      await checkSession();
    }, 30 * 1000); // 30초

    // 클린업
    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
      clearInterval(intervalId);
    };

  }, []);

  const logout = async () => {
    await performLogout();
  };

  return { 
    isAuthenticated, 
    user, 
    isLoading, 
    sessionError, 
    logout 
  };
}