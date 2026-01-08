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
"[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AccountManagementModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/user.js [app-ssr] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/mail.js [app-ssr] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/phone.js [app-ssr] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Building$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/building.js [app-ssr] (ecmascript) <export default as Building>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/lib/supabase.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function AccountManagementModal({ isOpen, onClose, userType }) {
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        organization_name: '',
        manager_name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        city_id: '',
        current_password: ''
    });
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showPasswordFields, setShowPasswordFields] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isOpen) {
            loadCurrentUserData();
        }
    }, [
        isOpen,
        userType
    ]);
    const loadCurrentUserData = ()=>{
        try {
            const storageKey = userType === 'admin' ? 'adminInfo' : 'currentUser';
            const userData = localStorage.getItem(storageKey);
            if (userData) {
                const parsed = JSON.parse(userData);
                setFormData({
                    organization_name: parsed.organization_name || '',
                    manager_name: parsed.manager_name || parsed.username || '',
                    phone: parsed.phone || '',
                    email: parsed.email || '',
                    password: '',
                    confirmPassword: '',
                    city_id: parsed.city_id || '',
                    current_password: ''
                });
            }
        } catch (error) {
            console.error('사용자 데이터 로드 오류:', error);
        }
    };
    const handleSubmit = async (e)=>{
        e.preventDefault();
        if (showPasswordFields && formData.password !== formData.confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
        setLoading(true);
        try {
            // 관리자 계정 업데이트
            if (userType === 'admin') {
                const storageKey = 'adminInfo';
                const adminData = localStorage.getItem(storageKey);
                if (!adminData) {
                    alert('로그인 정보를 찾을 수 없습니다.');
                    return;
                }
                const parsed = JSON.parse(adminData);
                console.log('📦 localStorage에서 가져온 adminInfo:', parsed);
                const adminId = parsed.id;
                console.log('🆔 추출한 adminId:', adminId, '(타입:', typeof adminId, ')');
                if (!adminId || typeof adminId !== 'string' || adminId.length < 30) {
                    alert('관리자 ID가 유효하지 않습니다. 다시 로그인해주세요.');
                    localStorage.removeItem('adminInfo');
                    window.location.href = '/auth/login';
                    return;
                }
                // 1. 일반 정보 업데이트 (username은 로그인 ID이므로 변경하지 않음)
                console.log('🔍 업데이트 요청 데이터:', {
                    adminId,
                    phone: formData.phone,
                    email: formData.email
                });
                const updatePayload = {
                    phone: formData.phone || '',
                    email: formData.email || ''
                };
                const { data: updatedAdmin, error: updateError } = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["adminAPI"].updateAdminInfo(adminId, updatePayload);
                console.log('📊 업데이트 응답:', {
                    data: updatedAdmin,
                    error: updateError
                });
                if (updateError) {
                    console.error('정보 업데이트 오류:', updateError);
                    console.error('오류 타입:', typeof updateError);
                    console.error('오류 키:', Object.keys(updateError));
                    alert('정보 업데이트 중 오류가 발생했습니다.');
                    return;
                }
                console.log('✅ 관리자 정보 업데이트 성공:', updatedAdmin);
                // 2. 비밀번호 변경 (선택사항)
                if (showPasswordFields && formData.current_password && formData.password) {
                    const { data: passwordData, error: passwordError } = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["adminAPI"].changeAdminPassword(adminId, formData.current_password, formData.password);
                    if (passwordError) {
                        console.error('비밀번호 변경 오류:', passwordError);
                        alert(passwordError.message || '비밀번호 변경 중 오류가 발생했습니다.');
                        return;
                    }
                }
                // 3. 로컬스토리지 업데이트
                if (updatedAdmin && updatedAdmin.length > 0) {
                    const updated = {
                        ...parsed,
                        username: updatedAdmin[0].username,
                        phone: updatedAdmin[0].phone,
                        email: updatedAdmin[0].email
                    };
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                }
                alert('계정 정보가 업데이트되었습니다.');
                onClose();
                return;
            }
            // 일반 사용자는 DB 업데이트
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                alert('로그인 정보를 찾을 수 없습니다.');
                return;
            }
            const userData = JSON.parse(currentUser);
            const userId = userData.id;
            // 1. 일반 정보 업데이트
            const { data: updatedUser, error: updateError } = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memberAPI"].updateUserInfo(userId, {
                manager_name: formData.manager_name,
                phone: formData.phone,
                email: formData.email
            });
            if (updateError) {
                console.error('정보 업데이트 오류:', updateError);
                alert('정보 업데이트 중 오류가 발생했습니다.');
                return;
            }
            // 2. 비밀번호 변경 (선택사항)
            if (showPasswordFields && formData.current_password && formData.password) {
                const { data: passwordData, error: passwordError } = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memberAPI"].changePassword(userId, formData.current_password, formData.password);
                if (passwordError) {
                    console.error('비밀번호 변경 오류:', passwordError);
                    alert(passwordError.message || '비밀번호 변경 중 오류가 발생했습니다.');
                    return;
                }
            }
            // 3. 로컬스토리지 업데이트
            if (updatedUser && updatedUser.length > 0) {
                const updated = {
                    ...userData,
                    manager_name: updatedUser[0].manager_name,
                    phone: updatedUser[0].phone,
                    email: updatedUser[0].email
                };
                localStorage.setItem('currentUser', JSON.stringify(updated));
            }
            alert('계정 정보가 업데이트되었습니다.');
            onClose();
        } catch (error) {
            console.error('계정 업데이트 오류:', error);
            alert('계정 정보 업데이트 중 오류가 발생했습니다.');
        } finally{
            setLoading(false);
        }
    };
    const handleInputChange = (field, value)=>{
        setFormData((prev)=>({
                ...prev,
                [field]: value
            }));
    };
    if (!isOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-xl font-bold text-gray-900",
                                children: "계정 관리"
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 216,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                className: "text-gray-400 hover:text-gray-600",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "w-6 h-6"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                    lineNumber: 221,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 217,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                        lineNumber: 215,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: handleSubmit,
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-sm font-medium text-gray-700 mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Building$3e$__["Building"], {
                                                className: "w-4 h-4 inline mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 229,
                                                columnNumber: 17
                                            }, this),
                                            userType === 'admin' ? '관리자명' : '단체명'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 228,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        value: formData.organization_name,
                                        disabled: true,
                                        className: "w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 232,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-500 mt-1",
                                        children: "이 필드는 수정할 수 없습니다."
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 238,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 227,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-sm font-medium text-gray-700 mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                className: "w-4 h-4 inline mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 244,
                                                columnNumber: 17
                                            }, this),
                                            userType === 'admin' ? '사용자명 (로그인 ID)' : '담당자명'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 243,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        value: formData.manager_name,
                                        onChange: (e)=>handleInputChange('manager_name', e.target.value),
                                        disabled: userType === 'admin',
                                        required: true,
                                        className: `w-full px-3 py-2 border border-gray-300 rounded-lg ${userType === 'admin' ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 247,
                                        columnNumber: 15
                                    }, this),
                                    userType === 'admin' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-500 mt-1",
                                        children: "로그인 ID는 변경할 수 없습니다."
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 260,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 242,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-sm font-medium text-gray-700 mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                                className: "w-4 h-4 inline mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 267,
                                                columnNumber: 17
                                            }, this),
                                            "전화번호"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 266,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "tel",
                                        value: formData.phone,
                                        onChange: (e)=>handleInputChange('phone', e.target.value),
                                        required: true,
                                        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 270,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 265,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-sm font-medium text-gray-700 mb-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                                className: "w-4 h-4 inline mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 282,
                                                columnNumber: 17
                                            }, this),
                                            "이메일"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 281,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "email",
                                        value: formData.email,
                                        onChange: (e)=>handleInputChange('email', e.target.value),
                                        required: true,
                                        className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 285,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 280,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-t pt-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "flex items-center",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            checked: showPasswordFields,
                                            onChange: (e)=>setShowPasswordFields(e.target.checked),
                                            className: "mr-2"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                            lineNumber: 297,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm text-gray-700",
                                            children: "비밀번호 변경"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                            lineNumber: 303,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                    lineNumber: 296,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 295,
                                columnNumber: 13
                            }, this),
                            showPasswordFields && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "현재 비밀번호"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 311,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "password",
                                                value: formData.current_password,
                                                onChange: (e)=>handleInputChange('current_password', e.target.value),
                                                required: showPasswordFields,
                                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 314,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 310,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "새 비밀번호"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 323,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "password",
                                                value: formData.password,
                                                onChange: (e)=>handleInputChange('password', e.target.value),
                                                required: showPasswordFields,
                                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 326,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 322,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "새 비밀번호 확인"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 335,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "password",
                                                value: formData.confirmPassword,
                                                onChange: (e)=>handleInputChange('confirmPassword', e.target.value),
                                                required: showPasswordFields,
                                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                                lineNumber: 338,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 334,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 309,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex space-x-3 pt-4 border-t",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: onClose,
                                        className: "flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50",
                                        children: "취소"
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 350,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "submit",
                                        disabled: loading,
                                        className: "flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors",
                                        children: loading ? '저장 중...' : '저장'
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                        lineNumber: 357,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                                lineNumber: 349,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                        lineNumber: 225,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
                lineNumber: 214,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
            lineNumber: 213,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx",
        lineNumber: 212,
        columnNumber: 5
    }, this);
}
}),
"[project]/sportsbox-reservation/src/components/AdminNavigation.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminNavigation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/users.js [app-ssr] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/calendar.js [app-ssr] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/bell.js [app-ssr] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/settings.js [app-ssr] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/log-out.js [app-ssr] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/house.js [app-ssr] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/monitor.js [app-ssr] (ecmascript) <export default as Monitor>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$cog$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCog$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/user-cog.js [app-ssr] (ecmascript) <export default as UserCog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$AccountManagementModal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/components/AccountManagementModal.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
function AdminNavigation({ adminRole = 'super' }) {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const [showAccountModal, setShowAccountModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleLogout = ()=>{
        localStorage.removeItem('adminInfo');
        window.location.href = '/auth/login';
    };
    const handleAccountManagement = ()=>{
        setShowAccountModal(true);
    };
    const navItems = [
        {
            href: '/admin',
            label: '대시보드',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"],
            roles: [
                'super',
                'south',
                'north'
            ]
        },
        {
            href: '/admin/announcements',
            label: '공지사항 관리',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"],
            roles: [
                'super',
                'south',
                'north'
            ]
        },
        {
            href: '/admin/popups',
            label: '팝업 관리',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__["Monitor"],
            roles: [
                'super',
                'south',
                'north'
            ]
        },
        {
            href: '/admin/members',
            label: '회원 관리',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
            roles: [
                'super',
                'south',
                'north'
            ]
        },
        {
            href: '/admin/reservations',
            label: '예약 관리',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"],
            roles: [
                'super',
                'south',
                'north'
            ]
        },
        {
            href: '/admin/settings',
            label: '설정',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
            roles: [
                'super',
                'south',
                'north'
            ]
        }
    ];
    const filteredNavItems = navItems.filter((item)=>item.roles.includes(adminRole));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "bg-white shadow-sm border-b border-gray-200",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-between items-center h-16",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center space-x-8",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/admin",
                                    className: "flex items-center space-x-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                                                className: "w-5 h-5 text-white"
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                                lineNumber: 85,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 84,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold text-gray-900",
                                            children: "관리자"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 87,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                    lineNumber: 83,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex space-x-4",
                                    children: filteredNavItems.map((item)=>{
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            href: item.href,
                                            className: `
                      flex items-center space-x-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
                    `,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                    className: "w-3 h-3"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                                    lineNumber: 107,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "hidden sm:inline",
                                                    children: item.label
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                                    lineNumber: 108,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, item.href, true, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 96,
                                            columnNumber: 19
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                    lineNumber: 90,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                            lineNumber: 82,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center space-x-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-gray-600 hidden md:inline",
                                    children: [
                                        adminRole === 'super' && '전체',
                                        adminRole === 'south' && '남부',
                                        adminRole === 'north' && '북부'
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                    lineNumber: 116,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleAccountManagement,
                                    className: "flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$cog$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCog$3e$__["UserCog"], {
                                            className: "w-3 h-3"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 125,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs hidden sm:inline",
                                            children: "계정"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 126,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                    lineNumber: 121,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleLogout,
                                    className: "flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                            className: "w-3 h-3"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 132,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs hidden sm:inline",
                                            children: "로그아웃"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                            lineNumber: 133,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                                    lineNumber: 128,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                            lineNumber: 115,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                    lineNumber: 81,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                lineNumber: 80,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$AccountManagementModal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                isOpen: showAccountModal,
                onClose: ()=>setShowAccountModal(false),
                userType: "admin"
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
                lineNumber: 139,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sportsbox-reservation/src/components/AdminNavigation.tsx",
        lineNumber: 79,
        columnNumber: 5
    }, this);
}
}),
"[project]/sportsbox-reservation/src/app/admin/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/users.js [app-ssr] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/calendar.js [app-ssr] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/bell.js [app-ssr] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/monitor.js [app-ssr] (ecmascript) <export default as Monitor>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/settings.js [app-ssr] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/clock.js [app-ssr] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-ssr] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-ssr] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/sportsbox-reservation/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$AdminNavigation$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sportsbox-reservation/src/components/AdminNavigation.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
function AdminDashboard() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [adminInfo, setAdminInfo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [stats, setStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        pendingMembers: 0,
        approvedMembers: 0,
        pendingReservations: 0,
        approvedReservations: 0,
        totalAnnouncements: 0,
        activeAnnouncements: 0
    });
    const [recentActivities, setRecentActivities] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        checkAuth();
    }, []);
    const checkAuth = ()=>{
        const adminAuth = localStorage.getItem('adminInfo');
        if (!adminAuth) {
            router.push('/auth/login');
            return;
        }
        const adminData = JSON.parse(adminAuth);
        setAdminInfo(adminData);
        loadDashboardData(adminData);
    };
    const loadDashboardData = async (adminData)=>{
        try {
            // 통계 데이터 로드
            const [membersResult, reservationsResult, announcementsResult] = await Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memberAPI"].getPendingMembers(),
                __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["reservationAPI"].getPendingReservations(),
                __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["announcementAPI"].getPublicAnnouncements()
            ]);
            // 승인된 회원 수 조회
            const approvedMembersResult = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memberAPI"].getApprovedMembers();
            const approvedReservationsResult = await __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["reservationAPI"].getApprovedReservations();
            setStats({
                pendingMembers: membersResult.data?.length || 0,
                approvedMembers: approvedMembersResult.data?.length || 0,
                pendingReservations: reservationsResult.data?.length || 0,
                approvedReservations: approvedReservationsResult.data?.length || 0,
                totalAnnouncements: announcementsResult.data?.length || 0,
                activeAnnouncements: announcementsResult.data?.filter((a)=>a.is_published).length || 0
            });
            // 최근 활동 데이터 구성
            const activities = [
                ...(membersResult.data || []).slice(0, 3).map((member)=>({
                        id: member.id,
                        type: 'member',
                        title: `${member.organization_name} 회원가입 신청`,
                        status: 'pending',
                        created_at: member.created_at
                    })),
                ...(reservationsResult.data || []).slice(0, 3).map((reservation)=>({
                        id: reservation.id,
                        type: 'reservation',
                        title: `${reservation.users?.organization_name} 예약 신청 (${reservation.date})`,
                        status: reservation.status,
                        created_at: reservation.created_at
                    }))
            ].sort((a, b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setRecentActivities(activities.slice(0, 5));
        } catch (error) {
            console.error('대시보드 데이터 로드 오류:', error);
        } finally{
            setLoading(false);
        }
    };
    const formatDate = (dateString)=>{
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const getStatusIcon = (status)=>{
        switch(status){
            case 'pending':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                    className: "w-4 h-4 text-yellow-500"
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                    lineNumber: 129,
                    columnNumber: 16
                }, this);
            case 'approved':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                    className: "w-4 h-4 text-green-500"
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                    lineNumber: 131,
                    columnNumber: 16
                }, this);
            case 'rejected':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                    className: "w-4 h-4 text-red-500"
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                    lineNumber: 133,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                    className: "w-4 h-4 text-gray-500"
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                    lineNumber: 135,
                    columnNumber: 16
                }, this);
        }
    };
    const getStatusText = (status)=>{
        switch(status){
            case 'pending':
                return '대기중';
            case 'approved':
                return '승인됨';
            case 'rejected':
                return '거절됨';
            default:
                return '알 수 없음';
        }
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-gray-50",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$AdminNavigation$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    adminRole: adminInfo?.role
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                    lineNumber: 151,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "animate-pulse space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "h-8 bg-gray-200 rounded w-1/4"
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 154,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                                children: [
                                    1,
                                    2,
                                    3,
                                    4,
                                    5,
                                    6
                                ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-32 bg-gray-200 rounded"
                                    }, i, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 157,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 155,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                        lineNumber: 153,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                    lineNumber: 152,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
            lineNumber: 150,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gray-50",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$src$2f$components$2f$AdminNavigation$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                adminRole: adminInfo?.role
            }, void 0, false, {
                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-bold text-gray-900",
                                children: "관리자 대시보드"
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 173,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-600 mt-2",
                                children: [
                                    adminInfo?.role === 'super' && '전체 시스템을 관리합니다',
                                    adminInfo?.role === 'south' && '경기남부 지역을 관리합니다',
                                    adminInfo?.role === 'north' && '경기북부 지역을 관리합니다'
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 174,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                        lineNumber: 172,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/admin/members",
                                className: "block",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-600",
                                                        children: "대기 중인 회원"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 187,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-2xl font-bold text-gray-900",
                                                        children: stats.pendingMembers
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 188,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-500 mt-1",
                                                        children: [
                                                            "승인된 회원: ",
                                                            stats.approvedMembers,
                                                            "명"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 189,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 186,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-3 bg-blue-50 rounded-full",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                                    className: "w-6 h-6 text-blue-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 192,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 191,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 185,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 184,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 183,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/admin/reservations",
                                className: "block",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-green-500",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-600",
                                                        children: "대기 중인 예약"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 202,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-2xl font-bold text-gray-900",
                                                        children: stats.pendingReservations
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 203,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-500 mt-1",
                                                        children: [
                                                            "승인된 예약: ",
                                                            stats.approvedReservations,
                                                            "건"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 204,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 201,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-3 bg-green-50 rounded-full",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                                    className: "w-6 h-6 text-green-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 207,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 206,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 200,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 199,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 198,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/admin/announcements",
                                className: "block",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-600",
                                                        children: "공지사항"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 217,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-2xl font-bold text-gray-900",
                                                        children: stats.totalAnnouncements
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 218,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-500 mt-1",
                                                        children: [
                                                            "활성: ",
                                                            stats.activeAnnouncements,
                                                            "건"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 219,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 216,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-3 bg-purple-50 rounded-full",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                                    className: "w-6 h-6 text-purple-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 222,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 221,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 215,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 214,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 213,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/admin/popups",
                                className: "block",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-orange-500",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium text-gray-600",
                                                        children: "팝업 관리"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 232,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-2xl font-bold text-gray-900",
                                                        children: "NEW"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 233,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-500 mt-1",
                                                        children: "홈페이지 팝업 설정"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 234,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 231,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-3 bg-orange-50 rounded-full",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__["Monitor"], {
                                                    className: "w-6 h-6 text-orange-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 237,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                lineNumber: 236,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 230,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 229,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 228,
                                columnNumber: 11
                            }, this),
                            adminInfo?.role === 'super' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/admin/settings",
                                    className: "block",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-gray-500",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium text-gray-600",
                                                            children: "시스템 설정"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                            lineNumber: 249,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-2xl font-bold text-gray-900",
                                                            children: "설정"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                            lineNumber: 250,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-gray-500 mt-1",
                                                            children: "예약 규칙 및 시스템"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                            lineNumber: 251,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 248,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "p-3 bg-gray-50 rounded-full",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                                        className: "w-6 h-6 text-gray-600"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                        lineNumber: 254,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 253,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                            lineNumber: 247,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 246,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 245,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                        lineNumber: 182,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-lg shadow",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-6 py-4 border-b border-gray-200",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-gray-900",
                                    children: "최근 활동"
                                }, void 0, false, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 266,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 265,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "divide-y divide-gray-200",
                                children: recentActivities.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "px-6 py-8 text-center text-gray-500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                            className: "w-12 h-12 mx-auto mb-4 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                            lineNumber: 271,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "최근 활동이 없습니다."
                                        }, void 0, false, {
                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                            lineNumber: 272,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                    lineNumber: 270,
                                    columnNumber: 15
                                }, this) : recentActivities.map((activity)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "px-6 py-4 hover:bg-gray-50",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center space-x-3",
                                                    children: [
                                                        getStatusIcon(activity.status),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm font-medium text-gray-900",
                                                                    children: activity.title
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                                    lineNumber: 281,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-gray-500",
                                                                    children: formatDate(activity.created_at)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                                    lineNumber: 284,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                            lineNumber: 280,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sportsbox$2d$reservation$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : activity.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`,
                                                    children: getStatusText(activity.status)
                                                }, void 0, false, {
                                                    fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                                    lineNumber: 289,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                            lineNumber: 277,
                                            columnNumber: 19
                                        }, this)
                                    }, activity.id, false, {
                                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                        lineNumber: 276,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                                lineNumber: 268,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                        lineNumber: 264,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
                lineNumber: 170,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/sportsbox-reservation/src/app/admin/page.tsx",
        lineNumber: 167,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__abf12aab._.js.map