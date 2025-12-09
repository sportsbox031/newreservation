'use client';

import { useState, useEffect } from 'react';
import { sessionAPI } from '@/lib/supabase';

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
    const checkSession = async () => {
      const result = await checkClientSession();
      
      setIsAuthenticated(result.isValid);
      setUser(result.user || null);
      setSessionError(result.error || '');
      setIsLoading(false);

      if (!result.isValid && result.shouldLogout) {
        await performLogout();
      }
    };

    checkSession();
    
    // 세션 모니터링 시작 (5분마다)
    const intervalId = setInterval(async () => {
      const result = await checkClientSession();
      
      if (!result.isValid && result.shouldLogout) {
        clearInterval(intervalId);
        
        // 사용자에게 알림
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        
        // 자동 로그아웃
        await performLogout();
      }
    }, 5 * 60 * 1000); // 5분

    // 페이지 언로드 시 인터벌 정리
    return () => {
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