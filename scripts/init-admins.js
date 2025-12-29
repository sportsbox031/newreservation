// 관리자 계정 초기화 스크립트
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local 파일 읽기
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  });
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 비밀번호 해시 함수 (supabase.ts와 동일)
const hashPassword = (password) => {
  try {
    return btoa(unescape(encodeURIComponent(password + 'sportsbox_salt')));
  } catch (error) {
    console.error('Password encoding error:', error);
    const safePassword = (password + 'sportsbox_salt').replace(/[^\x00-\x7F]/g, '_');
    return btoa(safePassword);
  }
};

async function initAdmins() {
  console.log('🔍 기존 관리자 계정 확인 중...\n');

  // 기존 관리자 조회
  const { data: existingAdmins, error: fetchError } = await supabase
    .from('admins')
    .select('*')
    .order('created_at');

  if (fetchError) {
    console.error('❌ 관리자 조회 오류:', fetchError);
    return;
  }

  console.log(`📋 현재 관리자 수: ${existingAdmins?.length || 0}\n`);

  if (existingAdmins && existingAdmins.length > 0) {
    console.log('현재 관리자 목록:');
    existingAdmins.forEach(admin => {
      console.log(`  - ${admin.username} (${admin.role})`);
    });
    console.log('');
  }

  // 초기 비밀번호
  const defaultPassword = 'admin123';
  const passwordHash = hashPassword(defaultPassword);

  const adminsToCreate = [
    { username: 'admin', role: 'super', phone: '', email: '' },
    { username: 'admin_south', role: 'south', phone: '', email: '' },
    { username: 'admin_north', role: 'north', phone: '', email: '' }
  ];

  console.log('🔄 관리자 계정 초기화 중...\n');

  for (const admin of adminsToCreate) {
    // 기존 계정 확인
    const existing = existingAdmins?.find(a => a.username === admin.username);

    if (existing) {
      console.log(`✅ ${admin.username} - 이미 존재함 (업데이트 건너뜀)`);
    } else {
      // 새 계정 생성
      const { error: insertError } = await supabase
        .from('admins')
        .insert({
          username: admin.username,
          password_hash: passwordHash,
          role: admin.role,
          phone: admin.phone,
          email: admin.email
        });

      if (insertError) {
        console.error(`❌ ${admin.username} 생성 실패:`, insertError);
      } else {
        console.log(`✨ ${admin.username} - 새로 생성됨`);
      }
    }
  }

  // 최종 확인
  console.log('\n🔍 최종 관리자 목록:\n');
  const { data: finalAdmins } = await supabase
    .from('admins')
    .select('*')
    .order('created_at');

  if (finalAdmins) {
    finalAdmins.forEach(admin => {
      console.log(`  ✓ ${admin.username} (${admin.role}) - ID: ${admin.id}`);
    });
  }

  console.log('\n✅ 초기화 완료!');
  console.log('\n📌 기본 계정 정보:');
  console.log('  - admin / admin123 (전체 관리자)');
  console.log('  - admin_south / admin123 (남부 관리자)');
  console.log('  - admin_north / admin123 (북부 관리자)');
}

initAdmins().catch(console.error);
