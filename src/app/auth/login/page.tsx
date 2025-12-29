'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Award, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { memberAPI, adminAPI } from '@/lib/supabase';

const loginSchema = z.object({
  organization_name: z.string().min(1, '단체명을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요')
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginFormComponent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isRegistered = searchParams?.get('registered') === 'true';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setLoginError('');

    try {
      // 관리자 계정 확인 (admin으로 시작하는 경우)
      if (data.organization_name.startsWith('admin')) {
        const { data: adminData, error: adminError } = await adminAPI.login(data.organization_name, data.password);

        if (adminError || !adminData) {
          setLoginError(adminError?.message || '관리자 로그인에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }

        // 관리자 정보를 localStorage에 저장
        localStorage.setItem('adminInfo', JSON.stringify(adminData));

        // 역할에 따라 리다이렉트
        if (adminData.role === 'super') {
          router.push('/admin');
        } else if (adminData.role === 'south') {
          router.push('/admin/south');
        } else if (adminData.role === 'north') {
          router.push('/admin/north');
        }
        return;
      }

      // 일반 사용자 로그인 API 호출 (세션 관리 포함)
      const { data: result, error } = await memberAPI.login(data.organization_name, data.password);

      if (error) {
        console.error('로그인 오류:', error);
        if (error.code === 'PGRST116') {
          // 데이터가 없음 - 등록되지 않은 단체명
          setLoginError('등록되지 않은 단체명입니다.');
        } else {
          setLoginError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
        return;
      }

      if (result) {
        // 사용자 상태 확인 (비밀번호 검증은 생략된 상태)
        if (result.status === 'pending') {
          setLoginError('회원가입 승인 대기중입니다. 관리자 승인 후 로그인하실 수 있습니다.');
        } else if (result.status === 'approved') {
          // 로그인 성공 - 사용자 정보와 세션 토큰을 localStorage에 저장
          console.log('로그인 성공:', result);
          localStorage.setItem('currentUser', JSON.stringify(result));
          
          // 세션 토큰 별도 저장 (보안상 분리)
          if (result.session_token) {
            localStorage.setItem('session_token', result.session_token);
          }
          
          console.log('localStorage에 사용자 정보 및 세션 저장 완료');
          router.push('/dashboard');
        } else if (result.status === 'rejected') {
          setLoginError('회원가입이 거부되었습니다. 관리자에게 문의하세요.');
        } else {
          setLoginError('계정 상태를 확인할 수 없습니다.');
        }
      } else {
        setLoginError('등록되지 않은 단체명입니다.');
      }
      
    } catch (error) {
      console.error('로그인 예외:', error);
      setLoginError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 sports-box-gradient rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">경기도체육회</h1>
                <p className="text-sm text-blue-600">스포츠박스 예약시스템</p>
              </div>
            </Link>
            <Link
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              홈으로
            </Link>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          {/* 회원가입 완료 알림 */}
          {isRegistered && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-green-700 text-sm font-medium">회원가입이 완료되었습니다!</p>
                <p className="text-green-600 text-xs mt-1">관리자 승인 후 로그인하실 수 있습니다.</p>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">로그인</h1>
            <p className="text-gray-600">스포츠박스 프로그램 예약을 위한 로그인</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 단체명 (아이디) */}
            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-2">
                단체명 (아이디)
              </label>
              <input
                {...register('organization_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="등록한 단체명을 입력해주세요"
              />
              {errors.organization_name && (
                <p className="mt-1 text-sm text-red-600">{errors.organization_name.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="비밀번호를 입력해주세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  로그인 중...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  로그인
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              아직 계정이 없으신가요?{' '}
              <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
                회원가입하기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <LoginFormComponent />
    </Suspense>
  );
}