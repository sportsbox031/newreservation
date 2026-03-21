'use client';

import { useState, useEffect } from 'react';
import { sessionAPI } from '@/lib/supabase';
import { isTimeoutError } from '@/lib/requestUtils';
import {
  isManualLogoutInProgress,
  markManualLogout,
  resetManualLogout,
} from '@/lib/sessionLogoutState';
import {
  getSessionValidatedAtStorageKey,
  isFreshSessionValidation,
} from '@/lib/sessionCache';

export interface SessionCheckResult {
  isValid: boolean;
  user?: any;
  error?: string;
  shouldLogout?: boolean;
}

const SESSION_VISIBILITY_THROTTLE_MS = 60 * 1000;
const SESSION_WRITE_INTERVAL_MS = 15 * 60 * 1000;
const SESSION_CACHE_TTL_MS = 30 * 1000;

const getCachedCurrentUser = () => {
  try {
    const cachedUser = localStorage.getItem('currentUser');
    return cachedUser ? JSON.parse(cachedUser) : null;
  } catch (error) {
    console.error('캐시된 사용자 정보 파싱 오류:', error);
    return null;
  }
};

// 클라이언트 사이드 세션 검증
export async function checkClientSession(
  refreshActivity: boolean = false,
  forceServerCheck: boolean = false
): Promise<SessionCheckResult> {
  try {
    const sessionToken = localStorage.getItem('session_token');
    const cachedUser = getCachedCurrentUser();
    
    const validationCacheKey = getSessionValidatedAtStorageKey(sessionToken || cachedUser?.id || 'cookie-session')

    if (!forceServerCheck && cachedUser) {
      if (isFreshSessionValidation(localStorage.getItem(validationCacheKey), Date.now(), SESSION_CACHE_TTL_MS)) {
        return {
          isValid: true,
          user: cachedUser
        };
      }
    }

    // 세션 유효성 검증
    const { data: sessionData, error } = await sessionAPI.validateSession(sessionToken || undefined);

    if (error || !sessionData) {
      if (error && isTimeoutError(error)) {
        if (cachedUser) {
          return {
            isValid: true,
            user: cachedUser,
            error: '세션 확인이 지연되고 있습니다.',
            shouldLogout: false
          };
        }
      }

      console.log('세션 검증 실패:', error);
      return {
        isValid: false,
        error: '세션이 만료되었거나 유효하지 않습니다.',
        shouldLogout: true
      };
    }

    if (refreshActivity) {
      await sessionAPI.refreshSession(sessionToken || undefined);
      localStorage.setItem(validationCacheKey, String(Date.now()));
    } else {
      localStorage.setItem(validationCacheKey, String(Date.now()));
    }

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
  markManualLogout();

  try {
    const token = sessionToken || localStorage.getItem('session_token');

    await sessionAPI.logout(token || undefined);

    // 로컬 스토리지 정리
    localStorage.removeItem('session_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminInfo');
    if (token) {
      localStorage.removeItem(getSessionValidatedAtStorageKey(token));
    }
    localStorage.removeItem('sessionValidatedAt');

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
    let lastWriteTime = 0;
    let lastVisibilityCheckTime = 0;

    const checkSession = async (refreshActivity: boolean = false, forceServerCheck: boolean = false) => {
      if (isCheckingSession) return; // 이미 체크 중이면 스킵

      isCheckingSession = true;
      const result = await checkClientSession(refreshActivity, forceServerCheck);

      setIsAuthenticated(result.isValid);
      setUser(result.user || null);
      setSessionError(result.error || '');
      setIsLoading(false);

      if (!result.isValid && result.shouldLogout) {
        // 수동 로그아웃이 아닌 경우에만 "다른 기기" 메시지 표시
        if (!isManualLogoutInProgress()) {
          alert('다른 기기에서 로그인되어 자동 로그아웃되었습니다.');
          await performLogout();
        }
      } else if (result.isValid) {
        resetManualLogout();
      }

      isCheckingSession = false;
    };

    // 초기 세션 체크
    checkSession(false, false);
    const initialToken = localStorage.getItem('session_token');
    lastWriteTime = initialToken
      ? Number(localStorage.getItem(getSessionValidatedAtStorageKey(initialToken)) || Date.now())
      : Date.now();

    const handleVisibilityOrFocus = async () => {
      const now = Date.now();
      if (now - lastVisibilityCheckTime < SESSION_VISIBILITY_THROTTLE_MS) return;

      lastVisibilityCheckTime = now;
      const shouldRefresh = now - lastWriteTime >= SESSION_WRITE_INTERVAL_MS;
      await checkSession(shouldRefresh, true);

      if (shouldRefresh) {
        lastWriteTime = now;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await handleVisibilityOrFocus();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 백업: 15분마다 세션 갱신
    const intervalId = setInterval(async () => {
      lastWriteTime = Date.now();
      await checkSession(true, true);
    }, SESSION_WRITE_INTERVAL_MS);

    // 클린업
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
