module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/sportsbox-reservation/src/lib/supabase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adminAPI",
    ()=>adminAPI,
    "announcementAPI",
    ()=>announcementAPI,
    "memberAPI",
    ()=>memberAPI,
    "popupAPI",
    ()=>popupAPI,
    "reservationAPI",
    ()=>reservationAPI,
    "reservationConcurrencyAPI",
    ()=>reservationConcurrencyAPI,
    "sessionAPI",
    ()=>sessionAPI,
    "settingsAPI",
    ()=>settingsAPI,
    "supabase",
    ()=>supabase,
    "tierAPI",
    ()=>tierAPI,
    "utilityAPI",
    ()=>utilityAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/uuid/dist-node/v4.js [app-ssr] (ecmascript) <export default as v4>");
;
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://edwsgsgewuqxgghhuvnj.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd3Nnc2dld3VxeGdnaGh1dm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDU1MzUsImV4cCI6MjA3MjIyMTUzNX0.xEa-JhKOpLavaY-LyiSGIaIewCqt2q6zF44nbt9FMbI");
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false
    }
});
// Helper function to hash password (simple implementation - use bcrypt in production)
const hashPassword = (password)=>{
    // This is a very simple hash - in production, use bcrypt or similar
    // Use Buffer.from to handle UTF-8 characters properly
    try {
        return btoa(unescape(encodeURIComponent(password + 'sportsbox_salt')));
    } catch (error) {
        console.error('Password encoding error:', error);
        // Fallback: use a simple transformation for problematic characters
        const safePassword = (password + 'sportsbox_salt').replace(/[^\x00-\x7F]/g, '_');
        return btoa(safePassword);
    }
};
// Helper function to generate session token
const generateSessionToken = ()=>{
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])() + '_' + Date.now() + '_' + Math.random().toString(36).substring(2);
};
// Helper function to get user agent and IP
const getClientInfo = (request)=>{
    return {
        user_agent: request?.headers.get('user-agent') || 'Unknown',
        ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'Unknown'
    };
};
// Helper function to get city_id from city name
const getCityId = async (cityName)=>{
    const { data, error } = await supabase.from('cities').select('id').eq('name', cityName).single();
    if (error) {
        console.error('City lookup error:', error);
        return null;
    }
    return data.id;
};
const memberAPI = {
    // 회원가입
    async register (userData) {
        // Get city_id from city name
        const cityId = await getCityId(userData.city_name);
        if (!cityId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 시/군입니다.'
                }
            };
        }
        // Hash password
        const password_hash = hashPassword(userData.password);
        const { data, error } = await supabase.from('users').insert([
            {
                organization_name: userData.organization_name,
                password_hash,
                manager_name: userData.manager_name,
                city_id: cityId,
                phone: userData.phone,
                email: userData.email,
                privacy_consent: userData.privacy_consent,
                status: 'pending'
            }
        ]).select();
        return {
            data,
            error
        };
    },
    // 로그인 (동시 접속 제한 포함)
    async login (organization_name, password, request) {
        const { data, error } = await supabase.from('users').select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `).eq('organization_name', organization_name).eq('status', 'approved').single();
        if (error) return {
            data: null,
            error
        };
        // Verify password
        const hashedInput = hashPassword(password);
        if (data.password_hash !== hashedInput) {
            return {
                data: null,
                error: {
                    message: '비밀번호가 일치하지 않습니다.'
                }
            };
        }
        // 기존 활성 세션 비활성화 (한 계정 한 세션 제한)
        await supabase.from('user_sessions').update({
            is_active: false
        }).eq('user_id', data.id).eq('is_active', true);
        // 새 세션 생성
        const sessionToken = generateSessionToken();
        const clientInfo = getClientInfo(request);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
        ;
        // 디버깅을 위한 로그 추가
        console.log('세션 생성 시도:', {
            user_id: data.id,
            user_id_type: typeof data.id,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString()
        });
        const { data: sessionData, error: sessionError } = await supabase.from('user_sessions').insert([
            {
                user_id: data.id,
                session_token: sessionToken,
                user_agent: clientInfo.user_agent,
                ip_address: clientInfo.ip_address,
                expires_at: expiresAt.toISOString(),
                is_active: true
            }
        ]).select();
        if (sessionError) {
            console.error('세션 생성 오류 상세:', {
                error: sessionError,
                code: sessionError.code,
                message: sessionError.message,
                details: sessionError.details,
                hint: sessionError.hint
            });
            return {
                data: null,
                error: {
                    message: `로그인 처리 중 오류가 발생했습니다: ${sessionError.message}`
                }
            };
        }
        // Remove password_hash from response for security
        const { password_hash, ...userWithoutPassword } = data;
        return {
            data: {
                ...userWithoutPassword,
                session_token: sessionToken,
                session_expires: expiresAt
            },
            error: null
        };
    },
    // 승인 대기 회원 목록 조회
    async getPendingMembers (regionCode) {
        let query = supabase.from('users').select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `).eq('status', 'pending');
        if (regionCode) {
            query = query.eq('cities.regions.code', regionCode);
        }
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 승인된 회원 목록 조회
    async getApprovedMembers (regionCode) {
        let query = supabase.from('users').select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `).eq('status', 'approved');
        if (regionCode) {
            query = query.eq('cities.regions.code', regionCode);
        }
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 모든 회원 조회 (관리자용)
    async getAllMembers () {
        const { data, error } = await supabase.from('users').select(`
        *,
        cities(name, regions(name))
      `).order('created_at', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 지역별 회원 조회 (관리자용)
    async getAllMembersForRegion (regionCode) {
        let query = supabase.from('users').select(`
        *,
        cities!inner(name, regions!inner(name, code))
      `).eq('cities.regions.code', regionCode).order('created_at', {
            ascending: false
        });
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 지역별 대기 중인 회원 목록 조회 (편의 함수)
    async getPendingMembersForRegion (regionCode) {
        return await this.getPendingMembers(regionCode);
    },
    // 지역별 승인된 회원 목록 조회 (편의 함수)
    async getApprovedMembersForRegion (regionCode) {
        return await this.getApprovedMembers(regionCode);
    },
    // 회원 승인/거부
    async updateMemberStatus (userId, status) {
        const { data, error } = await supabase.from('users').update({
            status
        }).eq('id', userId).select();
        return {
            data,
            error
        };
    },
    // 비밀번호 초기화 (관리자용)
    async resetPassword (userId, newPassword) {
        const password_hash = hashPassword(newPassword);
        const { data, error } = await supabase.from('users').update({
            password_hash
        }).eq('id', userId).select();
        return {
            data,
            error
        };
    },
    // 사용자 정보 업데이트
    async updateUserInfo (userId, updateData) {
        const { data, error } = await supabase.from('users').update(updateData).eq('id', userId).select();
        return {
            data,
            error
        };
    },
    // 비밀번호 변경 (현재 비밀번호 확인 필요)
    async changePassword (userId, currentPassword, newPassword) {
        // 현재 비밀번호 확인
        const { data: user, error: fetchError } = await supabase.from('users').select('password_hash').eq('id', userId).single();
        if (fetchError) {
            return {
                data: null,
                error: {
                    message: '사용자 정보를 찾을 수 없습니다.'
                }
            };
        }
        // 현재 비밀번호 검증
        const currentPasswordHash = hashPassword(currentPassword);
        if (user.password_hash !== currentPasswordHash) {
            return {
                data: null,
                error: {
                    message: '현재 비밀번호가 일치하지 않습니다.'
                }
            };
        }
        // 새 비밀번호로 업데이트
        const newPasswordHash = hashPassword(newPassword);
        const { data, error } = await supabase.from('users').update({
            password_hash: newPasswordHash
        }).eq('id', userId).select();
        return {
            data,
            error
        };
    }
};
const settingsAPI = {
    // 지역 ID 조회 헬퍼
    async getRegionId (regionCode) {
        const { data, error } = await supabase.from('regions').select('id').eq('code', regionCode).single();
        if (error) return null;
        return data.id;
    },
    // 차단된 날짜 목록 조회
    async getBlockedDates (regionCode) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('blocked_dates').select(`
        *,
        regions!inner(name, code)
      `).eq('region_id', regionId);
        return {
            data,
            error
        };
    },
    // 모든 차단된 날짜 조회 (Super Admin용)
    async getAllBlockedDates () {
        const { data, error } = await supabase.from('blocked_dates').select(`
        *,
        regions(name, code)
      `).order('date', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 차단된 날짜 추가 (지역별)
    async addBlockedDate (date, reason, regionCode) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('blocked_dates').insert([
            {
                region_id: regionId,
                date,
                reason
            }
        ]).select();
        return {
            data,
            error
        };
    },
    // 차단된 날짜 제거 (ID로)
    async removeBlockedDate (dateId) {
        const { data, error } = await supabase.from('blocked_dates').delete().eq('id', dateId);
        return {
            data,
            error
        };
    },
    // 예약 설정 조회
    async getReservationSettings (regionCode, year, month) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('reservation_settings').select('*').eq('region_id', regionId).eq('year', year).eq('month', month).single();
        // 데이터가 없으면 기본값 생성
        if (error && error.code === 'PGRST116') {
            // 설정이 없으면 자동으로 기본값 생성 (로그 제거)
            // 기본 설정 생성
            const { data: newData, error: createError } = await this.updateReservationSettings(regionCode, year, month, {
                is_open: false,
                max_reservations_per_day: 2,
                max_days_per_month: 4
            });
            if (createError) {
                console.error('기본 설정 생성 실패:', createError);
                return {
                    data: {
                        is_open: false,
                        max_reservations_per_day: 2,
                        max_days_per_month: 4
                    },
                    error: null
                };
            }
            return {
                data: newData?.[0] || {
                    is_open: false,
                    max_reservations_per_day: 2,
                    max_days_per_month: 4
                },
                error: null
            };
        }
        // 다른 오류가 있는 경우 기본값 반환
        if (error) {
            console.error('예약 설정 조회 오류:', error);
            return {
                data: {
                    is_open: false,
                    max_reservations_per_day: 2,
                    max_days_per_month: 4
                },
                error: null
            };
        }
        return {
            data,
            error
        };
    },
    // 예약 설정 업데이트
    async updateReservationSettings (regionCode, year, month, settings) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        try {
            const { data, error } = await supabase.from('reservation_settings').upsert([
                {
                    region_id: regionId,
                    year,
                    month,
                    is_open: settings.is_open ?? false,
                    max_reservations_per_day: settings.max_reservations_per_day ?? 2,
                    max_days_per_month: settings.max_days_per_month ?? 4
                }
            ], {
                onConflict: 'region_id,year,month'
            }).select();
            return {
                data,
                error
            };
        } catch (err) {
            console.error('예약 설정 업데이트 예외:', err);
            return {
                data: null,
                error: {
                    message: '예약 설정 업데이트 중 오류가 발생했습니다.'
                }
            };
        }
    },
    // 특정 날짜의 예약 현황 조회
    async getDateReservationStatus (regionCode, date) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        // 해당 날짜의 현재 예약 수 조회
        const { data: reservations, error: reservationError } = await supabase.from('reservations').select('id').eq('region_id', regionId).eq('date', date).in('status', [
            'pending',
            'approved'
        ]);
        if (reservationError) {
            return {
                data: null,
                error: reservationError
            };
        }
        const currentReservations = reservations?.length || 0;
        // 먼저 해당 날짜의 특정 제한이 있는지 확인
        const { data: dailyLimit } = await this.getDailyReservationLimit(regionCode, date);
        let maxReservationsPerDay;
        let isOpen;
        if (dailyLimit) {
            // 특정 날짜 설정이 있으면 그것을 사용
            maxReservationsPerDay = dailyLimit.max_reservations;
            isOpen = dailyLimit.max_reservations > 0; // 0이면 예약 금지
        } else {
            // 특정 설정이 없으면 월별 기본 설정 확인
            const targetDate = new Date(date);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const { data: settings } = await this.getReservationSettings(regionCode, year, month);
            maxReservationsPerDay = settings?.max_reservations_per_day || 2;
            isOpen = settings?.is_open ?? true; // 기본값은 예약 오픈
        }
        return {
            data: {
                current_reservations: currentReservations,
                max_reservations_per_day: maxReservationsPerDay,
                is_full: currentReservations >= maxReservationsPerDay,
                available_slots: Math.max(0, maxReservationsPerDay - currentReservations),
                is_open: isOpen
            },
            error: null
        };
    },
    // 월별 예약 현황 일괄 조회 (성능 최적화)
    async getMonthReservationStatus (regionCode, year, month) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        // 해당 월의 모든 예약 수 조회 (한 번의 쿼리로)
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const { data: reservations, error: reservationError } = await supabase.from('reservations').select('date').eq('region_id', regionId).gte('date', startDate).lte('date', endDate).in('status', [
            'pending',
            'approved'
        ]);
        if (reservationError) {
            return {
                data: null,
                error: reservationError
            };
        }
        // 날짜별 예약 수 집계
        const reservationCounts = {};
        reservations?.forEach((reservation)=>{
            const date = reservation.date;
            reservationCounts[date] = (reservationCounts[date] || 0) + 1;
        });
        // 월별 기본 설정 조회
        const { data: settings } = await this.getReservationSettings(regionCode, year, month);
        const defaultMaxReservations = settings?.max_reservations_per_day || 2;
        // 월별 개별 설정 적용 - 각 월마다 관리자가 별도로 예약 시작/종료 제어
        const defaultIsOpen = settings?.is_open || false // DB 설정값 사용, 없으면 false
        ;
        // 디버깅을 위한 로그
        console.log(`getMonthReservationStatus ${regionCode} ${year}년 ${month}월:`, {
            settings,
            defaultIsOpen,
            defaultMaxReservations
        });
        // 특정 날짜별 제한 설정 조회 (한 번의 쿼리로)
        const { data: dailyLimits } = await supabase.from('daily_reservation_limits').select('date, max_reservations').eq('region_id', regionId).gte('date', startDate).lte('date', endDate).gt('max_reservations', 0);
        // 특정 날짜별 제한을 맵으로 변환
        const dailyLimitMap = {};
        dailyLimits?.forEach((limit)=>{
            dailyLimitMap[limit.date] = limit.max_reservations;
        });
        // 결과 생성
        const result = {};
        for(let day = 1; day <= lastDay; day++){
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const currentReservations = reservationCounts[dateString] || 0;
            const maxReservations = dailyLimitMap[dateString] || defaultMaxReservations;
            // 예약 상태 결정 로직
            let isOpen = false;
            // 기존 전체 예약 시스템 제거 - 티어별 제어로 대체됨
            // 달력 표시용으로만 사용 (실제 예약 가능 여부는 티어별로 체크)
            isOpen = true; // 기본적으로 달력은 열려있음 (티어별 체크에서 실제 제어)
            // 개별 날짜 설정만 적용 (예약불가 날짜)
            if (dailyLimitMap[dateString] && maxReservations === 0) {
                isOpen = false; // 관리자가 특정 날짜를 막은 경우만 닫힘
            }
            // 달력 상태 설정 완료
            result[dateString] = {
                current_reservations: currentReservations,
                max_reservations_per_day: maxReservations,
                is_full: currentReservations >= maxReservations,
                available_slots: Math.max(0, maxReservations - currentReservations),
                is_open: isOpen
            };
        }
        return {
            data: result,
            error: null
        };
    },
    // 일별 예약 제한 수 동적 설정
    async updateDailyLimit (regionCode, date, maxReservations) {
        const targetDate = new Date(date);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        return await this.updateReservationSettings(regionCode, year, month, {
            max_reservations_per_day: maxReservations
        });
    },
    // 특정 날짜 예약 제한 설정
    async setDailyReservationLimit (regionCode, date, maxReservations) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('daily_reservation_limits').upsert([
            {
                region_id: regionId,
                date,
                max_reservations: maxReservations,
                updated_at: new Date().toISOString()
            }
        ], {
            onConflict: 'region_id,date'
        }).select();
        return {
            data,
            error
        };
    },
    // 특정 날짜 예약 제한 조회
    async getDailyReservationLimit (regionCode, date) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('daily_reservation_limits').select('*').eq('region_id', regionId).eq('date', date);
        // 데이터가 없는 것은 정상 (특정날짜 설정이 없음을 의미)
        if (!data || data.length === 0) {
            return {
                data: null,
                error: null
            };
        }
        return {
            data: data[0],
            error
        };
    },
    // 지역의 모든 특정 날짜 예약 제한 조회
    async getAllDailyReservationLimits (regionCode) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('daily_reservation_limits').select('*').eq('region_id', regionId).gt('max_reservations', 0) // 0개 제한은 제외 (삭제된 것으로 간주)
        .order('date');
        return {
            data,
            error
        };
    },
    // 특정 날짜 예약 제한 제거
    async removeDailyReservationLimit (regionCode, date) {
        const regionId = await this.getRegionId(regionCode);
        if (!regionId) {
            return {
                data: null,
                error: {
                    message: '존재하지 않는 지역입니다.'
                }
            };
        }
        const { data, error } = await supabase.from('daily_reservation_limits').delete().eq('region_id', regionId).eq('date', date);
        return {
            data,
            error
        };
    }
};
const reservationAPI = {
    // 승인 대기 예약 목록 조회
    async getPendingReservations (regionCode) {
        let query = supabase.from('reservations').select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `).eq('status', 'pending');
        if (regionCode) {
            query = query.eq('users.cities.regions.code', regionCode);
        }
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 승인된 예약 목록 조회
    async getApprovedReservations (regionCode) {
        let query = supabase.from('reservations').select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `).eq('status', 'approved');
        if (regionCode) {
            query = query.eq('users.cities.regions.code', regionCode);
        }
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 모든 예약 조회 (관리자용)
    async getAllReservations () {
        const { data, error } = await supabase.from('reservations').select(`
        *,
        users(
          id,
          organization_name,
          manager_name,
          phone,
          email,
          cities(name, regions(name))
        ),
        reservation_slots(
          id,
          start_time,
          end_time,
          grade,
          participant_count,
          location,
          slot_order
        )
      `).order('created_at', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 지역별 모든 예약 조회 (관리자용)
    async getAllReservationsForRegion (regionCode) {
        let query = supabase.from('reservations').select(`
        *,
        users!inner(
          id,
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(
          id,
          start_time,
          end_time,
          grade,
          participant_count,
          location,
          slot_order
        )
      `).eq('users.cities.regions.code', regionCode).order('created_at', {
            ascending: false
        });
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 지역별 대기 중인 예약 목록 조회 (편의 함수)
    async getPendingReservationsForRegion (regionCode) {
        return await this.getPendingReservations(regionCode);
    },
    // 지역별 승인된 예약 목록 조회 (편의 함수)
    async getApprovedReservationsForRegion (regionCode) {
        return await this.getApprovedReservations(regionCode);
    },
    // 예약 승인/거부/취소
    async updateReservationStatus (reservationId, status) {
        const { data, error } = await supabase.from('reservations').update({
            status
        }).eq('id', reservationId).select();
        return {
            data,
            error
        };
    },
    // 예약 완전 삭제 (거절, 취소 시 사용)
    async deleteReservation (reservationId) {
        const { data, error } = await supabase.from('reservations').delete().eq('id', reservationId).select();
        return {
            data,
            error
        };
    },
    // 관리자 예약 강제 취소
    async forceCancel (reservationId) {
        // 먼저 단순 업데이트만 수행
        const { error: updateError } = await supabase.from('reservations').update({
            status: 'cancelled'
        }).eq('id', reservationId);
        if (updateError) {
            return {
                data: null,
                error: updateError
            };
        }
        // 업데이트 성공 후 데이터 조회
        const { data, error } = await supabase.from('reservations').select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `).eq('id', reservationId).single();
        return {
            data,
            error
        };
    },
    // 특정 날짜의 모든 예약 조회 (관리자용)
    async getReservationsByDate (regionCode, date) {
        let query = supabase.from('reservations').select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `).eq('date', date).in('status', [
            'pending',
            'approved'
        ]);
        if (regionCode) {
            query = query.eq('users.cities.regions.code', regionCode);
        }
        const { data, error } = await query.order('created_at', {
            ascending: true
        });
        return {
            data,
            error
        };
    },
    // 사용자 예약 목록 조회
    async getUserReservations (userId) {
        const { data, error } = await supabase.from('reservations').select(`
        *,
        reservation_slots(*)
      `).eq('user_id', userId).order('date', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 예약 취소 요청 (승인된 예약의 경우)
    async requestCancellation (reservationId) {
        const { data, error } = await supabase.from('reservations').update({
            status: 'cancel_requested'
        }).eq('id', reservationId).select();
        return {
            data,
            error
        };
    },
    // 취소 요청 예약 목록 조회
    async getCancellationRequests (regionCode) {
        let query = supabase.from('reservations').select(`
        *,
        users!inner(
          organization_name,
          manager_name,
          phone,
          email,
          cities!inner(name, regions!inner(name, code))
        ),
        reservation_slots(*),
        regions!inner(name, code)
      `).eq('status', 'cancel_requested');
        if (regionCode) {
            query = query.eq('users.cities.regions.code', regionCode);
        }
        const { data, error } = await query;
        return {
            data,
            error
        };
    },
    // 예약 생성 시 제한 확인
    async createReservationWithValidation (userId, regionId, date, slots) {
        const regionCode = regionId === 1 ? 'south' : 'north';
        // 1. 관리자 설정값 조회
        const selectedDateObj = new Date(date);
        const year = selectedDateObj.getFullYear();
        const month = selectedDateObj.getMonth() + 1;
        const { data: settings, error: settingsError } = await settingsAPI.getReservationSettings(regionCode, year, month);
        if (settingsError) {
            return {
                data: null,
                error: {
                    message: '예약 설정을 확인할 수 없습니다.'
                }
            };
        }
        // 기존 전체 예약 시스템 체크 제거 - 티어별 제어로 대체됨
        // 2. 사용자 월별 예약 제한 체크 (4일/월)
        const maxDaysPerMonth = settings.max_days_per_month || 4;
        // 해당 월의 마지막 날짜 계산 (정확한 날짜)
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
        const { data: reservations } = await supabase.from('reservations').select('date').eq('user_id', userId).gte('date', startDate).lte('date', endDate).in('status', [
            'pending',
            'approved'
        ]);
        const uniqueDatesThisMonth = new Set(reservations?.map((r)=>r.date) || []);
        if (uniqueDatesThisMonth.size >= maxDaysPerMonth) {
            return {
                data: null,
                error: {
                    message: `월 예약 한도를 초과했습니다. (${uniqueDatesThisMonth.size}/${maxDaysPerMonth}일)`
                }
            };
        }
        // 3. 해당 날짜의 예약 현황 확인 (동시성 제어)
        const { data: dateStatus, error: statusError } = await settingsAPI.getDateReservationStatus(regionCode, date);
        if (statusError) {
            return {
                data: null,
                error: statusError
            };
        }
        // 티어 시스템이 예약 가능 여부를 검증하므로 기존 is_open 체크는 제거
        // if (!dateStatus?.is_open) {
        //   return { data: null, error: { message: '해당 날짜는 예약이 종료되었습니다.' } }
        // }
        if (dateStatus?.is_full) {
            return {
                data: null,
                error: {
                    message: `해당 날짜는 예약이 마감되었습니다. (최대 ${dateStatus.max_reservations_per_day}개)`
                }
            };
        }
        // 4. 동시성 제어를 위한 트랜잭션으로 예약 생성
        try {
            // PostgreSQL 트랜잭션 시작 및 FOR UPDATE로 행 잠금
            const { data: lockCheck } = await supabase.from('reservations').select('id').eq('region_id', regionId).eq('date', date).in('status', [
                'pending',
                'approved'
            ]);
            // 다시 한번 정원 체크 (동시 요청 방지)
            const currentCount = lockCheck?.length || 0;
            const maxReservations = dateStatus.max_reservations_per_day;
            if (currentCount >= maxReservations) {
                return {
                    data: null,
                    error: {
                        message: `해당 날짜는 예약이 마감되었습니다. (최대 ${maxReservations}개)`
                    }
                };
            }
            // 예약 생성
            const { data: reservation, error: reservationError } = await supabase.from('reservations').insert([
                {
                    user_id: userId,
                    region_id: regionId,
                    date,
                    status: 'pending'
                }
            ]).select().single();
            if (reservationError) {
                return {
                    data: null,
                    error: reservationError
                };
            }
            // 슬롯 생성
            const slotsWithReservationId = slots.map((slot)=>({
                    ...slot,
                    reservation_id: reservation.id
                }));
            const { data: createdSlots, error: slotsError } = await supabase.from('reservation_slots').insert(slotsWithReservationId).select();
            if (slotsError) {
                // 예약 롤백
                await supabase.from('reservations').delete().eq('id', reservation.id);
                return {
                    data: null,
                    error: slotsError
                };
            }
            return {
                data: {
                    ...reservation,
                    reservation_slots: createdSlots
                },
                error: null
            };
        } catch (error) {
            console.error('예약 생성 중 예외:', error);
            return {
                data: null,
                error: {
                    message: '예약 생성 중 오류가 발생했습니다.'
                }
            };
        }
    }
};
const utilityAPI = {
    // 모든 지역 조회
    async getRegions () {
        const { data, error } = await supabase.from('regions').select('*').order('name');
        return {
            data,
            error
        };
    },
    // 지역별 시/군 조회
    async getCitiesByRegion (regionCode) {
        const { data, error } = await supabase.from('cities').select(`
        *,
        regions!inner(name, code)
      `).eq('regions.code', regionCode).order('name');
        return {
            data,
            error
        };
    },
    // 모든 시/군 조회
    async getAllCities () {
        const { data, error } = await supabase.from('cities').select(`
        *,
        regions!inner(name, code)
      `).order('name');
        return {
            data,
            error
        };
    }
};
const announcementAPI = {
    // 사용자용: 공지사항 목록 조회 (지역별 필터링 적용)
    async getAnnouncementsForUser (userId) {
        try {
            // 먼저 사용자의 지역 정보를 조회
            const { data: userData } = await supabase.from('users').select('cities!inner(region_id)').eq('id', userId).single();
            const userRegionId = userData?.cities?.region_id;
            let query = supabase.from('announcements').select(`
          *,
          admins(username),
          regions(name)
        `).eq('is_published', true);
            // userRegionId가 있으면 지역별 필터링 적용, 없으면 전체 공지만
            if (userRegionId) {
                query = query.or(`target_type.eq.all,and(target_type.eq.region,target_region_id.eq.${userRegionId})`);
            } else {
                query = query.eq('target_type', 'all');
            }
            const { data, error } = await query.order('is_important', {
                ascending: false
            }).order('created_at', {
                ascending: false
            });
            return {
                data,
                error
            };
        } catch (error) {
            console.error('getAnnouncementsForUser 오류:', error);
            return {
                data: null,
                error
            };
        }
    },
    // 공개 공지사항만 조회 (로그인하지 않은 사용자용)
    async getPublicAnnouncements () {
        // 홈페이지에서는 전체 공지와 지역 공지 모두 표시 (배지 색상으로 구분)
        const { data, error } = await supabase.from('announcements').select(`
        *,
        admins(username),
        regions(name)
      `).eq('is_published', true)// target_type 필터 제거 - 모든 공지사항 표시
        .order('is_important', {
            ascending: false
        }).order('created_at', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 관리자용: 공지사항 목록 조회
    async getAnnouncementsForAdmin (adminRole, adminRegionId) {
        let query = supabase.from('announcements').select(`
        *,
        admins(username),
        regions(name)
      `);
        // 모든 관리자가 모든 공지사항을 볼 수 있음 (수정/삭제 권한만 제한)
        const { data, error } = await query.order('is_important', {
            ascending: false
        }).order('created_at', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 공지사항 상세 조회
    async getAnnouncementById (id) {
        const { data, error } = await supabase.from('announcements').select(`
        *,
        admins(username),
        regions(name)
      `).eq('id', id).single();
        return {
            data,
            error
        };
    },
    // 공지사항 생성
    async createAnnouncement (announcementData) {
        try {
            const response = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(announcementData)
            });
            const result = await response.json();
            if (!response.ok) {
                return {
                    data: null,
                    error: {
                        message: result.error || 'Failed to create announcement'
                    }
                };
            }
            return {
                data: result.data,
                error: null
            };
        } catch (error) {
            console.error('API call error:', error);
            return {
                data: null,
                error: {
                    message: 'Network error'
                }
            };
        }
    },
    // 공지사항 수정
    async updateAnnouncement (id, updateData) {
        const response = await fetch(`/api/admin/announcements?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            return {
                data: null,
                error: {
                    message: errorData.error
                }
            };
        }
        const data = await response.json();
        return {
            data: data.data,
            error: null
        };
    },
    // 공지사항 삭제
    async deleteAnnouncement (id) {
        const response = await fetch(`/api/admin/announcements?id=${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            return {
                data: null,
                error: {
                    message: errorData.error
                }
            };
        }
        const data = await response.json();
        return {
            data,
            error: null
        };
    },
    // 공지사항 조회수 증가
    async incrementViewCount (announcementId, userId) {
        // 중복 조회 방지를 위한 체크
        const { data: existingView } = await supabase.from('announcement_views').select('id').eq('announcement_id', announcementId).eq('user_id', userId).single();
        if (!existingView) {
            // 조회 기록 추가
            await supabase.from('announcement_views').insert([
                {
                    announcement_id: announcementId,
                    user_id: userId
                }
            ]);
            // 조회수 증가
            const { data, error } = await supabase.rpc('increment_view_count', {
                announcement_id: announcementId
            });
            return {
                data,
                error
            };
        }
        return {
            data: null,
            error: null
        };
    }
};
const popupAPI = {
    // 활성화된 팝업 조회 (홈페이지용)
    async getActivePopups () {
        const currentTime = new Date().toISOString();
        const { data, error } = await supabase.from('homepage_popups').select(`
        *,
        admins(username)
      `).eq('is_active', true).lte('start_date', currentTime).or(`end_date.is.null,end_date.gte.${currentTime}`).order('display_order', {
            ascending: true
        }).order('created_at', {
            ascending: false
        });
        return {
            data,
            error
        };
    },
    // 모든 팝업 조회 (관리자용)
    async getAllPopups () {
        try {
            const response = await fetch('/api/admin/popups');
            if (!response.ok) {
                const errorData = await response.json();
                return {
                    data: null,
                    error: {
                        message: errorData.error || 'Failed to fetch popups'
                    }
                };
            }
            const result = await response.json();
            return {
                data: result.data,
                error: null
            };
        } catch (error) {
            console.error('팝업 조회 중 예외:', error);
            return {
                data: null,
                error: {
                    message: '팝업 조회 중 오류가 발생했습니다.'
                }
            };
        }
    },
    // 팝업 생성
    async createPopup (popupData) {
        try {
            const response = await fetch('/api/admin/popups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(popupData)
            });
            const result = await response.json();
            if (!response.ok) {
                return {
                    data: null,
                    error: result.error ? {
                        message: result.error
                    } : {
                        message: 'Failed to create popup'
                    }
                };
            }
            return {
                data: result.data,
                error: null
            };
        } catch (error) {
            console.error('팝업 생성 중 예외:', error);
            return {
                data: null,
                error: {
                    message: '팝업 생성 중 오류가 발생했습니다.'
                }
            };
        }
    },
    // 팝업 수정
    async updatePopup (id, updateData) {
        const response = await fetch(`/api/admin/popups?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            return {
                data: null,
                error: {
                    message: errorData.error
                }
            };
        }
        const data = await response.json();
        return {
            data: data.data,
            error: null
        };
    },
    // 팝업 삭제
    async deletePopup (id) {
        const response = await fetch(`/api/admin/popups?id=${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            return {
                data: null,
                error: {
                    message: errorData.error
                }
            };
        }
        const data = await response.json();
        return {
            data,
            error: null
        };
    },
    // 팝업 활성화/비활성화
    async togglePopupStatus (id, isActive) {
        try {
            const response = await fetch(`/api/admin/popups?id=${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    is_active: isActive
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                return {
                    data: null,
                    error: {
                        message: errorData.error || 'Failed to toggle popup status'
                    }
                };
            }
            const data = await response.json();
            return {
                data: data.data,
                error: null
            };
        } catch (error) {
            console.error('팝업 상태 변경 중 예외:', error);
            return {
                data: null,
                error: {
                    message: '팝업 상태 변경 중 오류가 발생했습니다.'
                }
            };
        }
    }
};
const sessionAPI = {
    // 세션 유효성 검사
    async validateSession (sessionToken) {
        const { data, error } = await supabase.from('user_sessions').select(`
        *,
        users!inner(*)
      `).eq('session_token', sessionToken).eq('is_active', true).gte('expires_at', new Date().toISOString()).single();
        return {
            data,
            error
        };
    },
    // 세션 갱신 (활동 시간 업데이트)
    async refreshSession (sessionToken) {
        const { data, error } = await supabase.from('user_sessions').update({
            last_activity: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 연장
        }).eq('session_token', sessionToken).eq('is_active', true);
        return {
            data,
            error
        };
    },
    // 로그아웃 (세션 비활성화)
    async logout (sessionToken) {
        const { data, error } = await supabase.from('user_sessions').update({
            is_active: false
        }).eq('session_token', sessionToken);
        return {
            data,
            error
        };
    },
    // 사용자의 모든 세션 비활성화
    async logoutAllSessions (userId) {
        const { data, error } = await supabase.from('user_sessions').update({
            is_active: false
        }).eq('user_id', userId).eq('is_active', true);
        return {
            data,
            error
        };
    },
    // 다중 로그인 감지
    async detectMultipleLogins (userId) {
        const { data, error } = await supabase.from('user_sessions').select('*').eq('user_id', userId).eq('is_active', true).gte('expires_at', new Date().toISOString());
        return {
            data: data || [],
            error,
            hasMultipleSessions: (data?.length || 0) > 1
        };
    }
};
const reservationConcurrencyAPI = {
    // 하루 최대예약개수 조회
    async getReservationCapacity (date, timeSlot) {
        const { data, error } = await supabase.from('daily_reservation_limits').select('*').eq('date', date).single();
        return {
            data,
            error
        };
    },
    // 하루 최대예약개수 설정 (관리자용)
    async setDailyReservationLimit (regionId, date, maxReservations) {
        const { data, error } = await supabase.from('daily_reservation_limits').upsert([
            {
                region_id: regionId,
                date: date,
                max_reservations: maxReservations
            }
        ], {
            onConflict: 'region_id,date'
        });
        return {
            data,
            error
        };
    },
    // 하루 최대예약개수 체크 (동시성 제어)
    async checkDailyReservationLimit (userId, regionId, date, maxReservationsPerDay = 2) {
        const { data, error } = await supabase.rpc('check_daily_reservation_limit', {
            p_user_id: userId,
            p_region_id: regionId,
            p_date: date,
            p_max_reservations_per_day: maxReservationsPerDay
        });
        return {
            data,
            error
        };
    },
    // 사용자 월별 예약 제한 체크
    async checkUserMonthlyLimit (userId, year, month, maxDaysPerMonth = 4) {
        const { data, error } = await supabase.rpc('check_user_monthly_limit', {
            p_user_id: userId,
            p_year: year,
            p_month: month,
            p_max_days_per_month: maxDaysPerMonth
        });
        return {
            data,
            error
        };
    },
    // 예약 취소 시 하루 최대예약개수 감소는 실제 예약 삭제 시 자동 처리
    // 예약 대기열 조회
    async getReservationQueue (date, timeSlot) {
        const { data, error } = await supabase.from('reservation_transactions').select(`
        *,
        users(organization_name, manager_name)
      `).eq('reservation_date', date).eq('time_slot', timeSlot).eq('status', 'pending').order('created_at', {
            ascending: true
        });
        return {
            data,
            error
        };
    },
    // 일별 예약 현황 조회
    async getDailyReservationStatus (date) {
        const { data, error } = await supabase.from('daily_reservation_limits').select('*').eq('date', date);
        return {
            data,
            error
        };
    },
    // 월별 예약 현황 조회 (관리자용)
    async getMonthlyReservationStats (yearMonth) {
        const startDate = `${yearMonth}-01`;
        const endDate = `${yearMonth}-31`;
        const { data, error } = await supabase.from('daily_reservation_limits').select('*').gte('date', startDate).lte('date', endDate).order('date');
        return {
            data,
            error
        };
    }
};
const tierAPI = {
    // Get all available tiers
    async getAllTiers () {
        const { data, error } = await supabase.from('member_tiers').select('*').eq('is_active', true).order('tier_level');
        return {
            data,
            error
        };
    },
    // Get user's tier information with details
    async getUserTier (userId) {
        const { data, error } = await supabase.from('users').select(`
        tier_id,
        member_tiers!inner(
          id,
          tier_name,
          tier_level,
          description,
          advance_reservation_days,
          monthly_reservation_limit,
          daily_slot_limit
        )
      `).eq('id', userId).single();
        return {
            data,
            error
        };
    },
    // Update member tier (Admin only)
    async updateMemberTier (userId, tierId) {
        const { data, error } = await supabase.from('users').update({
            tier_id: tierId
        }).eq('id', userId).select(`
        *,
        member_tiers!inner(tier_name, tier_level)
      `);
        return {
            data,
            error
        };
    },
    // Bulk update member tiers (Admin only)
    async bulkUpdateMemberTiers (userIds, tierId) {
        const { data, error } = await supabase.from('users').update({
            tier_id: tierId
        }).in('id', userIds);
        return {
            data,
            error
        };
    },
    // Get tier reservation settings for specific region/month
    async getTierReservationSettings (regionCode, yearMonth) {
        const { data, error } = await supabase.from('tier_reservation_settings').select(`
        *,
        member_tiers!inner(tier_name, tier_level, advance_reservation_days)
      `).eq('region_code', regionCode).eq('year_month', yearMonth).order('tier_id');
        return {
            data,
            error
        };
    },
    // Update tier reservation status (Admin only)
    async updateTierReservationStatus (regionCode, yearMonth, tierId, isOpen, adminId) {
        // 현재 날짜로 설정 (수동 제어)
        const reservationStartDate = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.from('tier_reservation_settings').upsert([
            {
                region_code: regionCode,
                year_month: yearMonth,
                tier_id: tierId,
                is_open: isOpen,
                reservation_start_date: reservationStartDate,
                created_by: adminId
            }
        ], {
            onConflict: 'region_code,year_month,tier_id'
        }).select(`
        *,
        member_tiers!inner(tier_name, tier_level)
      `);
        return {
            data,
            error
        };
    },
    // Helper: Get tier by ID
    async getTierById (tierId) {
        const { data, error } = await supabase.from('member_tiers').select('*').eq('id', tierId).single();
        return {
            data,
            error
        };
    },
    // Check if user can make reservation based on tier
    async canUserReserveByTier (userId, regionCode, targetDate) {
        // Get user's tier information
        const userTier = await this.getUserTier(userId);
        if (!userTier.data) {
            return {
                canReserve: false,
                reason: '사용자 티어 정보를 찾을 수 없습니다.'
            };
        }
        const yearMonth = targetDate.substring(0, 7) // Extract YYYY-MM from YYYY-MM-DD
        ;
        // Get tier reservation settings for the region and month
        const { data: settings, error } = await supabase.from('tier_reservation_settings').select('*').eq('region_code', regionCode).eq('year_month', yearMonth).eq('tier_id', userTier.data.tier_id).single();
        // 설정이 없으면 기본적으로 예약 종료 상태
        if (error || !settings) {
            const tierName = userTier.data.member_tiers?.tier_name || 'Standard';
            const startDate = tierName === 'Priority' ? '20일' : '21일';
            return {
                canReserve: false,
                reason: `예약기간이 아닙니다. ${tierName} 회원은 매월 ${startDate} 예약을 시작합니다. ${startDate}이 주말일경우 이전 영업일에 시작합니다.`
            };
        }
        // Check if tier reservation is open (admin must have started it)
        if (!settings.is_open) {
            const tierName = userTier.data.member_tiers?.tier_name || 'Standard';
            const startDate = tierName === 'Priority' ? '20일' : '21일';
            return {
                canReserve: false,
                reason: `예약기간이 아닙니다. ${tierName} 회원은 매월 ${startDate} 예약을 시작합니다. ${startDate}이 주말일경우 이전 영업일에 시작합니다.`
            };
        }
        // 관리자가 티어별 예약을 시작한 경우 예약 가능
        return {
            canReserve: true
        };
    },
    // Get tier settings for all tiers in a region/month (Admin use)
    async getAllTierSettingsForMonth (regionCode, yearMonth) {
        const { data, error } = await supabase.from('tier_reservation_settings').select(`
        *,
        member_tiers!inner(*)
      `).eq('region_code', regionCode).eq('year_month', yearMonth).order('tier_id');
        return {
            data,
            error
        };
    }
};
const adminAPI = {
    // 관리자 로그인
    async login (username, password) {
        try {
            // 관리자 조회
            const { data: admin, error: fetchError } = await supabase.from('admins').select('*').eq('username', username).single();
            if (fetchError || !admin) {
                return {
                    data: null,
                    error: {
                        message: '등록되지 않은 관리자 계정입니다.'
                    }
                };
            }
            // 비밀번호 검증
            const passwordHash = hashPassword(password);
            if (admin.password_hash !== passwordHash) {
                return {
                    data: null,
                    error: {
                        message: '비밀번호가 일치하지 않습니다.'
                    }
                };
            }
            // 지역 ID 가져오기 (role이 south/north인 경우)
            let region_id = null;
            if (admin.role === 'south' || admin.role === 'north') {
                const regionCode = admin.role === 'south' ? 'south' : 'north';
                const regionIdResult = await this.getRegionIdByCode(regionCode);
                region_id = regionIdResult;
            }
            // 로그인 성공
            return {
                data: {
                    id: admin.id,
                    username: admin.username,
                    role: admin.role,
                    region_id: region_id,
                    phone: admin.phone,
                    email: admin.email,
                    isAuthenticated: true
                },
                error: null
            };
        } catch (error) {
            console.error('관리자 로그인 오류:', error);
            return {
                data: null,
                error: {
                    message: '로그인 중 오류가 발생했습니다.'
                }
            };
        }
    },
    // 지역 코드로 지역 ID 조회
    async getRegionIdByCode (code) {
        const { data, error } = await supabase.from('regions').select('id').eq('code', code).single();
        if (error) return null;
        return data.id;
    },
    // 관리자 정보 업데이트
    async updateAdminInfo (adminId, updates) {
        try {
            console.log('📥 updateAdminInfo 호출:', {
                adminId,
                updates
            });
            const { data, error } = await supabase.from('admins').update(updates).eq('id', adminId).select();
            console.log('📤 Supabase 응답:', {
                data,
                error,
                errorType: error ? typeof error : 'null',
                errorKeys: error ? Object.keys(error) : []
            });
            if (error) {
                console.error('DB 업데이트 오류:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    fullError: JSON.stringify(error)
                });
            }
            return {
                data,
                error
            };
        } catch (error) {
            console.error('예외 발생:', error);
            return {
                data: null,
                error: {
                    message: '업데이트 중 예외가 발생했습니다.'
                }
            };
        }
    },
    // 관리자 비밀번호 변경
    async changeAdminPassword (adminId, currentPassword, newPassword) {
        // 현재 비밀번호 확인
        const { data: admin, error: fetchError } = await supabase.from('admins').select('password_hash').eq('id', adminId).single();
        if (fetchError) {
            return {
                data: null,
                error: {
                    message: '관리자 정보를 찾을 수 없습니다.'
                }
            };
        }
        // 현재 비밀번호 검증
        const currentPasswordHash = hashPassword(currentPassword);
        if (admin.password_hash !== currentPasswordHash) {
            return {
                data: null,
                error: {
                    message: '현재 비밀번호가 일치하지 않습니다.'
                }
            };
        }
        // 새 비밀번호로 업데이트
        const newPasswordHash = hashPassword(newPassword);
        const { data, error } = await supabase.from('admins').update({
            password_hash: newPasswordHash
        }).eq('id', adminId).select();
        return {
            data,
            error
        };
    },
    // 관리자 ID로 조회
    async getAdminById (adminId) {
        const { data, error } = await supabase.from('admins').select('*').eq('id', adminId).single();
        return {
            data,
            error
        };
    }
};
}),
"[project]/sportsbox-reservation/src/components/RichTextEditor.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RichTextEditor,
    "sanitizeHtml",
    ()=>sanitizeHtml
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bold$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bold$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/bold.js [app-ssr] (ecmascript) <export default as Bold>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$italic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Italic$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/italic.js [app-ssr] (ecmascript) <export default as Italic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$underline$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Underline$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/underline.js [app-ssr] (ecmascript) <export default as Underline>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/link-2.js [app-ssr] (ecmascript) <export default as Link2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__List$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/list.js [app-ssr] (ecmascript) <export default as List>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$ordered$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ListOrdered$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/list-ordered.js [app-ssr] (ecmascript) <export default as ListOrdered>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$type$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Type$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/type.js [app-ssr] (ecmascript) <export default as Type>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Code$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/code.js [app-ssr] (ecmascript) <export default as Code>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/file-text.js [app-ssr] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
'use client';
;
;
;
const sanitizeHtml = (html)=>{
    // 위험한 태그들 제거 (스타일 태그는 허용)
    const dangerousTags = /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|<object[^>]*>.*?<\/object>|<embed[^>]*>|<link[^>]*>|<meta[^>]*>/gi;
    let sanitized = html.replace(dangerousTags, '');
    // 위험한 속성들 제거 (보다 정교한 패턴)
    const dangerousAttributes = /\s*(on\w+|javascript:|vbscript:|mocha:|livescript:|expression\()="?[^"\s>]*"?/gi;
    sanitized = sanitized.replace(dangerousAttributes, '');
    // 허용된 태그 대폭 확장 (스타일 태그 포함)
    const allowedTags = /^<\/?(?:p|br|strong|em|u|h[1-6]|ul|ol|li|a|code|pre|blockquote|div|span|style|body|html|head|title)(?:\s[^>]*)?>/i;
    const htmlTags = sanitized.match(/<[^>]+>/g) || [];
    // 위험한 태그만 제거 (허용된 태그는 유지)
    htmlTags.forEach((tag)=>{
        if (!allowedTags.test(tag)) {
            // script, iframe 등만 제거
            if (/<\/?(?:script|iframe|object|embed|link|meta)/i.test(tag)) {
                sanitized = sanitized.replace(tag, '');
            }
        }
    });
    return sanitized;
};
function RichTextEditor({ value, onChange, placeholder }) {
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('text');
    const [showPreview, setShowPreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Markdown을 HTML로 변환하는 간단한 함수
    const markdownToHtml = (markdown)=>{
        let html = markdown;
        // 헤딩
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        // 볼드
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        // 이탤릭
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        // 링크
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        // 코드
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // 리스트
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        // 줄바꿈
        html = html.replace(/\n/g, '<br>');
        return html;
    };
    // 텍스트 포맷팅 도구 함수들
    const applyFormat = (tag)=>{
        const textarea = document.querySelector('#content-editor');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        let newText = value;
        switch(tag){
            case 'bold':
                newText = value.substring(0, start) + `<strong>${selectedText}</strong>` + value.substring(end);
                break;
            case 'italic':
                newText = value.substring(0, start) + `<em>${selectedText}</em>` + value.substring(end);
                break;
            case 'underline':
                newText = value.substring(0, start) + `<u>${selectedText}</u>` + value.substring(end);
                break;
            case 'link':
                const url = prompt('링크 URL을 입력하세요:');
                if (url) {
                    newText = value.substring(0, start) + `<a href="${url}">${selectedText || url}</a>` + value.substring(end);
                }
                break;
            case 'ul':
                newText = value.substring(0, start) + `<ul><li>${selectedText}</li></ul>` + value.substring(end);
                break;
            case 'ol':
                newText = value.substring(0, start) + `<ol><li>${selectedText}</li></ol>` + value.substring(end);
                break;
            case 'code':
                newText = value.substring(0, start) + `<code>${selectedText}</code>` + value.substring(end);
                break;
        }
        onChange(newText);
    };
    const getDisplayValue = ()=>{
        if (mode === 'text') {
            // 텍스트 모드에서는 <br>을 줄바꿈으로 변환하여 표시
            return value.replace(/<br\s*\/?>/gi, '\n');
        } else {
            // HTML, 마크다운 모드에서는 그대로 표시
            return value;
        }
    };
    const handleContentChange = (newValue)=>{
        if (mode === 'html') {
            // HTML 모드에서는 새니타이징 적용
            const sanitized = sanitizeHtml(newValue);
            onChange(sanitized);
        } else if (mode === 'markdown') {
            // 마크다운 모드에서는 HTML로 변환해서 저장
            const htmlContent = markdownToHtml(newValue);
            onChange(htmlContent);
        } else if (mode === 'text') {
            // 텍스트 모드에서는 줄바꿈을 <br>로 변환하여 저장
            const htmlContent = newValue.replace(/\n/g, '<br>');
            onChange(htmlContent);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "border border-gray-300 rounded-lg overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-gray-50 border-b border-gray-300 p-3",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setMode('text'),
                                    className: `px-3 py-1 text-sm rounded ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$type$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Type$3e$__["Type"], {
                                            className: "w-4 h-4 inline mr-1"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                            lineNumber: 174,
                                            columnNumber: 15
                                        }, this),
                                        "텍스트"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 165,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setMode('html'),
                                    className: `px-3 py-1 text-sm rounded ${mode === 'html' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Code$3e$__["Code"], {
                                            className: "w-4 h-4 inline mr-1"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                            lineNumber: 186,
                                            columnNumber: 15
                                        }, this),
                                        "HTML"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 177,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setMode('markdown'),
                                    className: `px-3 py-1 text-sm rounded ${mode === 'markdown' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                            className: "w-4 h-4 inline mr-1"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                            lineNumber: 198,
                                            columnNumber: 15
                                        }, this),
                                        "마크다운"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 189,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                            lineNumber: 164,
                            columnNumber: 11
                        }, this),
                        false && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('bold'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "굵게",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bold$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bold$3e$__["Bold"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 212,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 206,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('italic'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "기울임",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$italic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Italic$3e$__["Italic"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 220,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 214,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('underline'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "밑줄",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$underline$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Underline$3e$__["Underline"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 228,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 222,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-px h-6 bg-gray-300 mx-1"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 230,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('link'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "링크",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 237,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 231,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('ul'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "순서 없는 목록",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__List$3e$__["List"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 245,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 239,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('ol'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "순서 있는 목록",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$ordered$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ListOrdered$3e$__["ListOrdered"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 253,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 247,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>applyFormat('code'),
                                    className: "p-2 hover:bg-gray-200 rounded",
                                    title: "코드",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Code$3e$__["Code"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                        lineNumber: 261,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 255,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                            lineNumber: 205,
                            columnNumber: 13
                        }, this),
                        mode === 'html' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-1 text-amber-600",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 269,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs",
                                    children: "HTML 코드는 보안을 위해 필터링됩니다"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                    lineNumber: 270,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                            lineNumber: 268,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                    lineNumber: 162,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                lineNumber: 161,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-h-[200px]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    id: "content-editor",
                    value: getDisplayValue(),
                    onChange: (e)=>handleContentChange(e.target.value),
                    className: "w-full h-64 p-4 resize-none focus:outline-none text-sm",
                    style: {
                        fontFamily: mode === 'text' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'monospace'
                    },
                    placeholder: mode === 'text' ? '공지사항 내용을 입력하세요...' : mode === 'html' ? 'HTML 코드를 입력하세요...\n\n예시:\n<div style="padding: 20px;">\n  <h1>제목</h1>\n  <p>내용</p>\n</div>' : '마크다운을 입력하세요...\n\n예시:\n# 제목\n**굵은글씨**\n*기울임*\n[링크](http://example.com)\n- 목록'
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                    lineNumber: 278,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                lineNumber: 277,
                columnNumber: 7
            }, this),
            showPreview && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-t border-gray-300",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700",
                        children: "미리보기"
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                        lineNumber: 299,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 prose prose-sm max-w-none",
                        dangerouslySetInnerHTML: {
                            __html: sanitizeHtml(mode === 'markdown' ? markdownToHtml(value) : value)
                        }
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                        lineNumber: 302,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                lineNumber: 298,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-gray-50 border-t border-gray-300 px-4 py-2 flex justify-between items-center text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setShowPreview(!showPreview),
                                className: "text-blue-600 hover:text-blue-800",
                                children: showPreview ? '미리보기 숨기기' : '미리보기'
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                lineNumber: 314,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-500",
                                children: [
                                    value.length,
                                    " 문자"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                                lineNumber: 321,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                        lineNumber: 313,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-gray-500",
                        children: [
                            mode === 'text' && '텍스트 모드',
                            mode === 'html' && 'HTML 모드 (보안 필터링 적용)',
                            mode === 'markdown' && '마크다운 모드'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                        lineNumber: 326,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
                lineNumber: 312,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sportsbox-reservation/src/components/RichTextEditor.tsx",
        lineNumber: 159,
        columnNumber: 5
    }, this);
}
}),
"[project]/sportsbox-reservation/src/components/HomepagePopup.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomepagePopupComponent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$RichTextEditor$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/components/RichTextEditor.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function HomepagePopupComponent() {
    const [popups, setPopups] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [currentPopupIndex, setCurrentPopupIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [showPopup, setShowPopup] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadPopups();
    }, []);
    const loadPopups = async ()=>{
        try {
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["popupAPI"].getActivePopups();
            if (error) {
                console.error('팝업 로드 오류:', error);
                setLoading(false);
                return;
            }
            const activePopups = data || [];
            if (activePopups.length > 0) {
                // 24시간 내에 또 보지 않음 옵션을 확인
                const hasSeenToday = checkPopupSeenToday(activePopups[0].id);
                if (!hasSeenToday) {
                    setPopups(activePopups);
                    setCurrentPopupIndex(0);
                    setShowPopup(true);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error('팝업 로드 예외:', error);
            setLoading(false);
        }
    };
    // 24시간 내 팝업 본 여부 확인
    const checkPopupSeenToday = (popupId)=>{
        const seenPopups = JSON.parse(localStorage.getItem('seenPopups') || '{}');
        const today = new Date().toDateString();
        return seenPopups[popupId] === today;
    };
    // 24시간 내 팝업 본 것으로 표시
    const markPopupAsSeen = (popupId)=>{
        const seenPopups = JSON.parse(localStorage.getItem('seenPopups') || '{}');
        const today = new Date().toDateString();
        seenPopups[popupId] = today;
        localStorage.setItem('seenPopups', JSON.stringify(seenPopups));
    };
    // 팝업 닫기
    const closePopup = ()=>{
        if (popups[currentPopupIndex]) {
            markPopupAsSeen(popups[currentPopupIndex].id);
        }
        setShowPopup(false);
    };
    // 다음 팝업으로 이동
    const nextPopup = ()=>{
        if (popups[currentPopupIndex]) {
            markPopupAsSeen(popups[currentPopupIndex].id);
        }
        if (currentPopupIndex < popups.length - 1) {
            setCurrentPopupIndex(currentPopupIndex + 1);
        } else {
            setShowPopup(false);
        }
    };
    // ESC 키로 닫기
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const handleKeyDown = (event)=>{
            if (event.key === 'Escape' && showPopup) {
                closePopup();
            }
        };
        if (showPopup) {
            document.addEventListener('keydown', handleKeyDown);
            // 배경 스크롤 방지
            document.body.style.overflow = 'hidden';
        }
        return ()=>{
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [
        showPopup
    ]);
    // 마크다운을 HTML로 변환하는 간단한 함수
    const markdownToHtml = (markdown)=>{
        let html = markdown;
        // 헤딩
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        // 볼드
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        // 이탤릭
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        // 링크
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        // 코드
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // 리스트
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        // 줄바꿈
        html = html.replace(/\n/g, '<br>');
        return html;
    };
    const renderContent = (popup)=>{
        if (popup.content_type === 'html') {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "prose max-w-none",
                dangerouslySetInnerHTML: {
                    __html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$RichTextEditor$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sanitizeHtml"])(popup.content)
                }
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                lineNumber: 156,
                columnNumber: 9
            }, this);
        } else if (popup.content_type === 'markdown') {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "prose max-w-none",
                dangerouslySetInnerHTML: {
                    __html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$RichTextEditor$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sanitizeHtml"])(markdownToHtml(popup.content))
                }
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                lineNumber: 165,
                columnNumber: 9
            }, this);
        } else {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "prose max-w-none whitespace-pre-wrap",
                children: popup.content
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                lineNumber: 174,
                columnNumber: 9
            }, this);
        }
    };
    if (loading || !showPopup || popups.length === 0) {
        return null;
    }
    const currentPopup = popups[currentPopupIndex];
    if (!currentPopup) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sticky top-0 bg-white border-b border-gray-200 p-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-start gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xl font-bold text-gray-900 mb-2",
                                        children: currentPopup.title
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                        lineNumber: 198,
                                        columnNumber: 15
                                    }, this),
                                    popups.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-gray-500",
                                                children: [
                                                    currentPopupIndex + 1,
                                                    " / ",
                                                    popups.length
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                                lineNumber: 203,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex gap-1",
                                                children: popups.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `w-2 h-2 rounded-full ${index === currentPopupIndex ? 'bg-blue-600' : 'bg-gray-300'}`
                                                    }, index, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                                        lineNumber: 208,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                                lineNumber: 206,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                        lineNumber: 202,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                lineNumber: 197,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: closePopup,
                                className: "text-gray-400 hover:text-gray-600 text-2xl font-semibold p-1 hover:bg-gray-100 rounded-full transition-colors",
                                title: "닫기 (ESC)",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "w-6 h-6"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                    lineNumber: 226,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                lineNumber: 221,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                        lineNumber: 196,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                    lineNumber: 195,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-6",
                    children: renderContent(currentPopup)
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                    lineNumber: 232,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sticky bottom-0 bg-white border-t border-gray-200 p-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex items-center text-sm text-gray-600",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "checkbox",
                                        onChange: (e)=>{
                                            if (e.target.checked) {
                                                closePopup();
                                            }
                                        },
                                        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                        lineNumber: 240,
                                        columnNumber: 15
                                    }, this),
                                    "24시간 내 다시 보지 않기"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                lineNumber: 239,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3",
                                children: popups.length > 1 && currentPopupIndex < popups.length - 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: closePopup,
                                            className: "px-4 py-2 text-gray-600 hover:text-gray-800 font-medium",
                                            children: "닫기"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                            lineNumber: 255,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: nextPopup,
                                            className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors",
                                            children: "다음"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                            lineNumber: 261,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: closePopup,
                                    className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors",
                                    children: "확인"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                    lineNumber: 269,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                                lineNumber: 252,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                        lineNumber: 238,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
                    lineNumber: 237,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
            lineNumber: 193,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/sportsbox-reservation/src/components/HomepagePopup.tsx",
        lineNumber: 192,
        columnNumber: 5
    }, this);
}
}),
"[project]/sportsbox-reservation/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/bell.js [app-ssr] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$HomepagePopup$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/components/HomepagePopup.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
function Home() {
    const [announcements, setAnnouncements] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showModal, setShowModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadAnnouncements();
    }, []);
    const loadAnnouncements = async ()=>{
        try {
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["announcementAPI"].getPublicAnnouncements();
            if (error) {
                console.error('공지사항 로드 오류:', error);
            } else {
                // 중요 공지를 최상단에 표시하고, 그 다음 최신순으로 정렬
                const sortedData = (data || []).sort((a, b)=>{
                    // 1순위: 중요 공지 우선
                    if (a.is_important !== b.is_important) {
                        return b.is_important ? 1 : -1;
                    }
                    // 2순위: 최신순
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }).slice(0, 5);
                setAnnouncements(sortedData);
            }
        } catch (error) {
            console.error('공지사항 로드 예외:', error);
        } finally{
            setLoading(false);
        }
    };
    const handleAnnouncementClick = (announcement)=>{
        setSelectedAnnouncement(announcement);
        setShowModal(true);
    };
    const formatDate = (dateString)=>{
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };
    const stripHtml = (html)=>{
        if (!html) return '';
        // 향상된 HTML 및 CSS 제거 - 미리보기용
        return html// CSS 스타일 블록 완전 제거 (스타일 태그와 내용)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')// 스크립트 태그와 내용 제거
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')// 모든 HTML 태그 제거
        .replace(/<[^>]*>/g, '')// CSS 선언 (body { font-family 등) 제거
        .replace(/[a-zA-Z-]+\s*\{\s*[^}]*\}/g, '')// CSS 속성 (font-family:, color: 등) 제거
        .replace(/[a-zA-Z-]+\s*:\s*[^;]+;/g, '')// HTML 엔터티 디코딩
        .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[^;]+;/g, ' ')// 연속된 공백을 하나로 정리
        .replace(/\s+/g, ' ').trim();
    };
    const truncateContent = (content, maxLength = 80)=>{
        // HTML 태그를 제거한 후 텍스트만 추출
        const textOnly = stripHtml(content);
        if (textOnly.length <= maxLength) return textOnly;
        return textOnly.substring(0, maxLength) + '...';
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-white",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "fixed w-full bg-white shadow-sm z-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-6 py-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center space-x-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: "https://static.readdy.ai/image/416007a89256a2717806f7776e859886/110ce5261818cd69133e46ef8c6b097a.png",
                                        alt: "경기도체육회 로고",
                                        className: "h-10"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 118,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-2xl font-bold text-[#0066CC]",
                                        children: "스포츠박스"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 123,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 117,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                className: "hidden md:flex items-center space-x-8",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "#notices",
                                        className: "text-gray-700 hover:text-[#0066CC] py-2",
                                        children: "공지사항"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 126,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "#intro",
                                        className: "text-gray-700 hover:text-[#0066CC] py-2",
                                        children: "사업소개"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 127,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "#programs",
                                        className: "text-gray-700 hover:text-[#0066CC] py-2",
                                        children: "운영프로그램"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 128,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "#process",
                                        className: "text-gray-700 hover:text-[#0066CC] py-2",
                                        children: "신청절차"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 129,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "#faq",
                                        className: "text-gray-700 hover:text-[#0066CC] py-2",
                                        children: "자주 묻는 질문"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 130,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/auth/login",
                                        className: "bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90",
                                        children: "회원가입/로그인"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 131,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 125,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 116,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                    lineNumber: 115,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                lineNumber: 114,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "pt-20",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "relative h-[600px] bg-cover bg-no-repeat",
                        style: {
                            backgroundImage: "url('https://raw.githubusercontent.com/sportsbox031/sports/main/메인사진2.png')",
                            backgroundPosition: 'center 20%',
                            backgroundSize: 'cover'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 bg-black/30"
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 152,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "container mx-auto px-6 relative h-full flex items-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "max-w-2xl",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: "text-6xl font-bold mb-6 text-white drop-shadow-lg",
                                            children: "SPORTS BOX"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 155,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-4xl font-bold mb-6 text-[#0066CC] drop-shadow",
                                            children: "모두를 위한 스포츠"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 156,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xl mb-8 text-white drop-shadow-lg",
                                            children: "경기도체육회 스포츠박스가 여러분의 건강한 생활을 지원합니다"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 157,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/auth/login",
                                            className: "rounded-lg bg-[#0066CC] text-white px-8 py-3 text-lg hover:bg-[#0066CC]/90 inline-block",
                                            children: "예약하기"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 158,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 154,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 153,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 144,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "intro",
                        className: "py-20 bg-gray-50",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto px-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-12",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-3xl font-bold mb-8",
                                                children: "사업소개"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 174,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mb-6",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: "https://static.readdy.ai/image/416007a89256a2717806f7776e859886/37e4760851bd5a23c2838ccd027fd4f3.png",
                                                    className: "w-full h-auto rounded-lg shadow-lg",
                                                    alt: "스포츠박스 활동"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 176,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 175,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-2xl font-bold mb-4",
                                                        children: "찾아가는 스포츠 프로그램"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-gray-600 leading-relaxed mb-6",
                                                        children: "스포츠박스는 경기도민의 건강한 생활을 위해 찾아가는 스포츠 프로그램을 운영합니다. 스포츠 취약계층을 위한 맞춤형 프로그램과 다양한 체험 기회를 제공하여 모든 도민이 스포츠를 즐길 수 있도록 지원합니다."
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 184,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex space-x-4",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center space-x-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        className: "ri-user-heart-line text-[#0066CC] text-xl"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                        lineNumber: 191,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: "취약계층 지원"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                        lineNumber: 192,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                lineNumber: 190,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center space-x-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        className: "ri-community-line text-[#0066CC] text-xl"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                        lineNumber: 195,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: "생활체육 활성화"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                        lineNumber: 196,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                lineNumber: 194,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 189,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 182,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 173,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        id: "notices",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between items-center mb-8",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                    className: "text-3xl font-bold",
                                                    children: "공지사항"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 205,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 204,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "bg-white rounded-lg shadow-lg p-6 max-h-[500px] overflow-y-auto",
                                                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "animate-pulse space-y-4",
                                                    children: [
                                                        1,
                                                        2,
                                                        3
                                                    ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "h-16 bg-gray-200 rounded"
                                                        }, i, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 211,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 21
                                                }, this) : announcements.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center py-8 text-gray-500",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                                            className: "w-8 h-8 mx-auto mb-2 text-gray-400"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm",
                                                            children: "등록된 공지사항이 없습니다."
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 217,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 215,
                                                    columnNumber: 21
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-4",
                                                    children: announcements.map((announcement)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            onClick: ()=>handleAnnouncementClick(announcement),
                                                            className: `
                            notice-item cursor-pointer border border-gray-200 p-4 rounded-lg hover:shadow-md transition-all duration-200
                            ${announcement.is_important ? 'bg-orange-50 border-orange-200' : ''}
                          `,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-start gap-3",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center gap-2 mb-2",
                                                                            children: [
                                                                                announcement.is_important && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium",
                                                                                    children: "중요"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                                    lineNumber: 234,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: `text-xs px-2 py-1 rounded-full font-medium ${announcement.target_type === 'all' ? 'bg-blue-100 text-blue-800' : announcement.regions?.name === '경기남부' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`,
                                                                                    children: announcement.target_type === 'all' ? '전체 공지' : `${announcement.regions?.name || '지역'} 공지`
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                                    lineNumber: 238,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                            lineNumber: 232,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                                            className: "font-semibold text-gray-900 mb-2 line-clamp-1",
                                                                            children: announcement.title
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                            lineNumber: 248,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-gray-600 text-sm line-clamp-2 mb-2",
                                                                            children: truncateContent(announcement.content, 80)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                            lineNumber: 251,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center gap-4 text-xs text-gray-500",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    children: formatDate(announcement.created_at)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                                    lineNumber: 255,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    children: [
                                                                                        "작성자: ",
                                                                                        announcement.admins.username
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                                    lineNumber: 256,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                            lineNumber: 254,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                    lineNumber: 231,
                                                                    columnNumber: 29
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                lineNumber: 230,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, announcement.id, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 222,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 220,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 207,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 203,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 171,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 170,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 169,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "programs",
                        className: "py-20",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto px-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-3xl font-bold text-center mb-16",
                                    children: "운영프로그램"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 273,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid md:grid-cols-3 gap-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "program-card relative rounded-lg overflow-hidden shadow-lg",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: "https://static.readdy.ai/image/416007a89256a2717806f7776e859886/32c46d527cf6d2a7c9d564083dfe5195.png",
                                                    className: "w-full h-[300px] object-cover",
                                                    alt: "스포츠교실"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 276,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "p-6 bg-white",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold mb-3",
                                                            children: "스포츠교실"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 282,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600 mb-4",
                                                            children: "전문 강사진이 직접 찾아가는 뉴스포츠 프로그램"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 283,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: "https://www.youtube.com/watch?v=ui3qOANOOTI",
                                                            target: "_blank",
                                                            className: "inline-block bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90",
                                                            children: "자세히보기"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 284,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 281,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 275,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "program-card relative rounded-lg overflow-hidden shadow-lg",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: "https://static.readdy.ai/image/416007a89256a2717806f7776e859886/44959af536d5400000e12357a5586b8f.png",
                                                    className: "w-full h-[300px] object-cover",
                                                    alt: "스포츠체험존"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 294,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "p-6 bg-white",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold mb-3",
                                                            children: "스포츠체험존"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 300,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600 mb-4",
                                                            children: "경기도 내 스포츠대회 및 지자체 축제 연계 체험존 운영"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 301,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: "https://www.youtube.com/watch?v=cdOh5nLmQ-o",
                                                            target: "_blank",
                                                            className: "inline-block bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90",
                                                            children: "자세히보기"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 302,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 299,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 293,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "program-card relative rounded-lg overflow-hidden shadow-lg",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                    src: "https://static.readdy.ai/image/416007a89256a2717806f7776e859886/ca135fc96b572c92d6c08bfcc5782da7.png",
                                                    className: "w-full h-[300px] object-cover",
                                                    alt: "스포츠이벤트"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 312,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "p-6 bg-white",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold mb-3",
                                                            children: "스포츠이벤트"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 318,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600 mb-4",
                                                            children: "수상레저스포츠, 스키교실 등 특별 프로그램 운영"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 319,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: "https://www.youtube.com/watch?v=4nyB-iATP5k",
                                                            target: "_blank",
                                                            className: "inline-block bg-[#0066CC] text-white px-4 py-2 rounded-lg hover:bg-[#0066CC]/90",
                                                            children: "자세히보기"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 320,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 317,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 311,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 274,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 272,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 271,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "process",
                        className: "py-20 bg-gray-50",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto px-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-3xl font-bold text-center mb-16",
                                    children: "신청절차"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 336,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-4 gap-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-[#0066CC] hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-[#0066CC] text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "1"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 342,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "회원가입"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 345,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 341,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "✏️"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 348,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "관리자 승인 대기"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 349,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 347,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 340,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-blue-400 hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-blue-400 text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "2"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 355,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "로그인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 358,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 354,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "🔑"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 361,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "승인완료 후 로그인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 362,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 360,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 353,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-indigo-400 hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-indigo-400 text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "3"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 368,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "날짜/시간 선택"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 371,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 367,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "📅"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 374,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "희망 일정 예약"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 375,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 373,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 366,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-purple-400 hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-purple-400 text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 381,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "승인 대기"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 384,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 380,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "⏳"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 387,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "관리자 검토 중"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 388,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 386,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 379,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-green-400 hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-green-400 text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 395,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "관리자 승인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 398,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 394,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "✅"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 401,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "예약 승인 완료"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 402,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 400,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 393,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-yellow-400 hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-yellow-400 text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "6"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 408,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "예약확정"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 411,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 407,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "🎫"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 414,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "서비스 이용 가능"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 415,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 413,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 406,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-white rounded-xl p-6 shadow-lg border-t-4 border-orange-400 hover:shadow-xl transition-all duration-300",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center mb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-12 h-12 bg-orange-400 text-white rounded-full flex items-center justify-center text-xl font-bold",
                                                            children: "7"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 421,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xl font-bold ml-3",
                                                            children: "예약 정보확인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 424,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 420,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-center mt-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-3xl mb-3",
                                                            children: "📋"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 427,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "대시보드에서 확인"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 428,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 426,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 419,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-gradient-to-r from-[#0066CC] to-[#0066CC]/80 rounded-xl p-6 shadow-lg flex flex-col justify-center items-center text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-4xl mb-4",
                                                    children: "🚀"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 434,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "text-xl font-bold mb-2",
                                                    children: "지금 바로 시작하세요!"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 435,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mb-4 text-white/80 text-center",
                                                    children: "예약 및 관리가 편리합니다"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 436,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/auth/login",
                                                    className: "bg-white text-[#0066CC] font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-md",
                                                    children: "시작하기"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 437,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 433,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 338,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 335,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 334,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "faq",
                        className: "py-20 bg-white",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto px-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-3xl font-bold text-center mb-16",
                                    children: "자주 묻는 질문"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 451,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "max-w-3xl mx-auto",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-8 bg-gray-50 rounded-xl overflow-hidden shadow-sm",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-6",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-xl font-bold text-gray-800 mb-4 flex items-center",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "bg-[#0066CC] text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0",
                                                                children: "Q"
                                                            }, void 0, false, {
                                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                lineNumber: 457,
                                                                columnNumber: 21
                                                            }, this),
                                                            "요일을 지정해서 정기적으로 운영해주실 수 있나요?"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 456,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "pl-11",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "정기 운영은 현재 어렵습니다. 저희는 더 많은 아이들에게 공평한 혜택을 제공하기 위해 매월 선착순 접수 방식으로 운영하고 있습니다."
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 461,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 460,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 455,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 454,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-8 bg-gray-50 rounded-xl overflow-hidden shadow-sm",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-6",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-xl font-bold text-gray-800 mb-4 flex items-center",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "bg-[#0066CC] text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0",
                                                                children: "Q"
                                                            }, void 0, false, {
                                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                lineNumber: 470,
                                                                columnNumber: 21
                                                            }, this),
                                                            "스포츠체험존은 어떻게 운영되나요?"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 469,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "pl-11",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "스포츠체험존은 도내 공직유관단체 및 지자체에서 진행하는 행사를 대상으로 운영됩니다. 체험존에서는 한궁체험, 후크볼, 배팅체험, 탁구(스파이더볼) 등 다양한 스포츠 활동을 체험하실 수 있습니다."
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 474,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 473,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 468,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 467,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-8 bg-gray-50 rounded-xl overflow-hidden shadow-sm",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-6",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-xl font-bold text-gray-800 mb-4 flex items-center",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "bg-[#0066CC] text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0",
                                                                children: "Q"
                                                            }, void 0, false, {
                                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                                lineNumber: 483,
                                                                columnNumber: 21
                                                            }, this),
                                                            "스포츠이벤트는 누구나 신청 가능한가요?"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 482,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "pl-11",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-600",
                                                            children: "스포츠이벤트는 스포츠교실 참여자에 한하여 신청 가능합니다. 계절에 따라 여름에는 수상레저스포츠, 겨울에는 스키교실을 운영하고 있으니 많은 관심 부탁드립니다."
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 487,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 486,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 481,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 480,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 452,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 450,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 449,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                        className: "bg-gray-900 text-white py-12",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto px-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid md:grid-cols-4 gap-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "text-lg font-bold mb-4",
                                                    children: "스포츠박스"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 500,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-gray-400",
                                                    children: "경기도체육회"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 501,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 499,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "text-lg font-bold mb-4",
                                                    children: "연락처"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 504,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-gray-400",
                                                    children: "전화: 031-250-0474~7"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 505,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-gray-400",
                                                    children: [
                                                        "이메일: ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                            href: "mailto:hoseok0119@ggsc.or.kr",
                                                            className: "hover:text-white",
                                                            children: "hoseok0119@ggsc.or.kr"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 506,
                                                            columnNumber: 51
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 506,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 503,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "text-lg font-bold mb-4",
                                                    children: "운영시간"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 509,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-gray-400",
                                                    children: "평일: 09:00 - 18:00"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 510,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-gray-400",
                                                    children: "주말 및 공휴일 휴무"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 511,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 508,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "text-lg font-bold mb-4",
                                                    children: "SNS"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 514,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex space-x-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "https://www.youtube.com/@%EC%8A%A4%ED%8F%AC%EC%B8%A0%EB%B0%95%EC%8A%A4-l7e",
                                                        target: "_blank",
                                                        className: "text-gray-400 hover:text-white",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            className: "ri-youtube-fill text-xl"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                            lineNumber: 521,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 516,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                    lineNumber: 515,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                            lineNumber: 513,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 498,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "border-t border-gray-800 mt-8 pt-8 text-center text-gray-400",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: "© 2025 경기도체육회 스포츠박스. All rights reserved."
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 527,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 526,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 497,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                        lineNumber: 496,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                lineNumber: 142,
                columnNumber: 7
            }, this),
            showModal && selectedAnnouncement && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sticky top-0 bg-white border-b border-gray-200 p-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between items-start gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 mb-2",
                                                children: [
                                                    selectedAnnouncement.is_important && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full",
                                                        children: "중요"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 542,
                                                        columnNumber: 23
                                                    }, this),
                                                    selectedAnnouncement.target_type === 'all' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full",
                                                        children: "전체 공지"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 547,
                                                        columnNumber: 23
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${selectedAnnouncement.regions?.name === '경기남부' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`,
                                                        children: [
                                                            selectedAnnouncement.regions?.name || '지역',
                                                            " 공지"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 551,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 540,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-xl font-bold text-gray-900 mb-2",
                                                children: selectedAnnouncement.title
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 560,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4 text-sm text-gray-500",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "작성자: ",
                                                            selectedAnnouncement.admins.username
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 564,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "작성일: ",
                                                            formatDate(selectedAnnouncement.created_at)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                        lineNumber: 565,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                                lineNumber: 563,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 539,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShowModal(false),
                                        className: "text-gray-400 hover:text-gray-600 text-xl font-semibold",
                                        children: "×"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                        lineNumber: 568,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 538,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 537,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "p-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "prose max-w-none",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-gray-700 leading-relaxed",
                                    dangerouslySetInnerHTML: {
                                        __html: selectedAnnouncement.content
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                    lineNumber: 579,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                                lineNumber: 578,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                            lineNumber: 577,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                    lineNumber: 536,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                lineNumber: 535,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$HomepagePopup$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
                lineNumber: 592,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sportsbox-reservation/src/app/page.tsx",
        lineNumber: 112,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3021de57._.js.map