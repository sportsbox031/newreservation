'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Award, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react';
import { memberAPI } from '@/lib/supabase';

const cities = {
  south: [
    '과천시', '광명시', '광주시', '군포시', '김포시', '부천시', '성남시', 
    '수원시', '시흥시', '안산시', '안성시', '안양시', '여주시', '오산시', 
    '용인시', '의왕시', '이천시', '평택시', '하남시', '화성시', '양평군'
  ],
  north: [
    '고양시', '구리시', '남양주시', '동두천시', '양주시', 
    '의정부시', '파주시', '포천시', '가평군', '연천군'
  ]
};

const registerSchema = z.object({
  organization_name: z.string()
    .min(2, '단체명은 최소 2자 이상이어야 합니다')
    .max(50, '단체명은 50자를 초과할 수 없습니다')
    .regex(/^[가-힣\s]+$/, '단체명은 한글만 입력 가능합니다'),
  password: z.string()
    .min(4, '비밀번호는 최소 4자 이상이어야 합니다')
    .max(20, '비밀번호는 20자를 초과할 수 없습니다'),
  confirmPassword: z.string(),
  manager_name: z.string()
    .min(2, '담당자명은 최소 2자 이상이어야 합니다')
    .max(10, '담당자명은 10자를 초과할 수 없습니다')
    .regex(/^[가-힣]+$/, '담당자명은 한글만 입력 가능합니다'),
  city: z.string().min(1, '시/군을 선택해주세요'),
  phone: z.string()
    .regex(/^010\d{8}$|^010-\d{4}-\d{4}$/, '휴대폰번호는 01012345678 또는 010-1234-5678 형식으로 입력해주세요'),
  email: z.string()
    .email('올바른 이메일 주소를 입력해주세요')
    .max(100, '이메일은 100자를 초과할 수 없습니다'),
  privacy_consent: z.boolean().refine(val => val === true, {
    message: '개인정보 수집 및 이용에 동의해주세요'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      privacy_consent: false
    }
  });

  const selectedCity = watch('city');
  const getRegion = () => {
    if (cities.south.includes(selectedCity)) return 'south';
    if (cities.north.includes(selectedCity)) return 'north';
    return null;
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const { data: result, error } = await memberAPI.register({
        organization_name: data.organization_name,
        password: data.password,
        manager_name: data.manager_name,
        city_name: data.city,
        phone: data.phone,
        email: data.email,
        privacy_consent: data.privacy_consent
      });

      if (error) {
        console.error('회원가입 오류:', error);
        setSubmitStatus('error');
        if (error.code === '23505') { // 중복 키 오류
          setErrorMessage('이미 등록된 단체명입니다.');
        } else {
          setErrorMessage('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
        return;
      }

      console.log('회원가입 성공:', result);
      setSubmitStatus('success');
      
      setTimeout(() => {
        router.push('/auth/login?registered=true');
      }, 2000);
      
    } catch (error) {
      console.error('회원가입 예외:', error);
      setSubmitStatus('error');
      setErrorMessage('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입 완료</h1>
          <p className="text-gray-600 mb-6">
            회원가입이 성공적으로 완료되었습니다.<br />
            관리자 승인 후 로그인하실 수 있습니다.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

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
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
            <p className="text-gray-600">스포츠박스 프로그램 예약을 위한 회원가입</p>
          </div>

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 단체명 */}
            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-2">
                단체명 (아이디) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('organization_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="한글로 입력해주세요"
              />
              {errors.organization_name && (
                <p className="mt-1 text-sm text-red-600">{errors.organization_name.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="4자 이상 입력해주세요"
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

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="비밀번호를 다시 입력해주세요"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* 담당자명 */}
            <div>
              <label htmlFor="manager_name" className="block text-sm font-medium text-gray-700 mb-2">
                담당자명 <span className="text-red-500">*</span>
              </label>
              <input
                {...register('manager_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="담당자 이름을 입력해주세요"
              />
              {errors.manager_name && (
                <p className="mt-1 text-sm text-red-600">{errors.manager_name.message}</p>
              )}
            </div>

            {/* 시/군 */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                시/군 <span className="text-red-500">*</span>
              </label>
              <select
                {...register('city')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">시/군을 선택해주세요</option>
                <optgroup label="경기남부">
                  {cities.south.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </optgroup>
                <optgroup label="경기북부">
                  {cities.north.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </optgroup>
              </select>
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
              {selectedCity && (
                <p className="mt-1 text-sm text-blue-600">
                  선택된 지역: {getRegion() === 'south' ? '경기남부' : '경기북부'}
                </p>
              )}
            </div>

            {/* 연락처 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="01012345678 또는 010-1234-5678"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* 개인정보 수집 동의 */}
            <div>
              <div className="flex items-start">
                <input
                  {...register('privacy_consent')}
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  <span className="text-red-500">*</span> 개인정보 수집 및 이용에 동의합니다.
                  <button 
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-blue-600 hover:underline ml-1"
                  >
                    [상세보기]
                  </button>
                </label>
              </div>
              {errors.privacy_consent && (
                <p className="mt-1 text-sm text-red-600">{errors.privacy_consent.message}</p>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isSubmitting ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                로그인하기
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 개인정보 수집 동의서 모달 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">개인정보 수집 및 이용 동의서</h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. 개인정보 수집·이용 목적</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>스포츠박스 프로그램 예약 및 서비스 제공</li>
                    <li>본인확인, 회원관리 및 서비스 이용문의 처리</li>
                    <li>프로그램 안내 및 참여 확인</li>
                    <li>법령 및 이용약관 위반 회원에 대한 이용제한 조치</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">2. 수집하는 개인정보 항목</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>필수정보: 단체명, 담당자명, 시/군, 연락처, 이메일</li>
                    <li>선택정보: 프로그램 이용 관련 정보</li>
                    <li>자동 생성 정보: 서비스 이용기록, 접속로그, 쿠키, 접속IP정보</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. 개인정보의 보유 및 이용기간</h4>
                  <p className="text-sm">
                    회원탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.<br />
                    단, 관계법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">4. 개인정보의 제3자 제공</h4>
                  <p className="text-sm">
                    회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.<br />
                    다만, 법령에 의해 요구되는 경우 관련 법령에 따라 제공할 수 있습니다.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">5. 개인정보 처리의 위탁</h4>
                  <p className="text-sm">
                    서비스 향상을 위해 개인정보 처리업무를 외부 전문업체에 위탁할 수 있습니다.<br />
                    위탁 시에는 관계 법령에 따라 위탁계약서 등을 통하여 개인정보가 안전하게 처리될 수 있도록 관리하고 있습니다.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">6. 동의를 거부할 권리</h4>
                  <p className="text-sm">
                    귀하는 개인정보 수집·이용에 동의하지 않을 권리가 있습니다.<br />
                    다만, 동의하지 않을 경우 스포츠박스 서비스 이용에 제한이 있을 수 있습니다.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}