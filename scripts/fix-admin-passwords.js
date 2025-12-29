// 관리자 비밀번호 해시 수정 스크립트
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

async function fixPasswords() {
  console.log('🔧 관리자 비밀번호 해시 수정 중...\n');

  // 모든 관리자 조회
  const { data: admins, error: fetchError } = await supabase
    .from('admins')
    .select('*');

  if (fetchError) {
    console.error('❌ 관리자 조회 오류:', fetchError);
    return;
  }

  console.log(`📋 총 ${admins.length}명의 관리자 발견\n`);

  // 기본 비밀번호
  const defaultPassword = 'admin123';
  const correctHash = hashPassword(defaultPassword);

  console.log(`🔑 올바른 해시 값: ${correctHash}\n`);

  // 각 관리자의 비밀번호 해시 확인 및 수정
  for (const admin of admins) {
    console.log(`\n👤 ${admin.username}:`);
    console.log(`   현재 password_hash: ${admin.password_hash}`);
    
    if (admin.password_hash !== correctHash) {
      console.log(`   ⚠️  해시가 올바르지 않음. 수정 중...`);
      
      const { error: updateError } = await supabase
        .from('admins')
        .update({ password_hash: correctHash })
        .eq('id', admin.id);

      if (updateError) {
        console.error(`   ❌ 업데이트 실패:`, updateError);
      } else {
        console.log(`   ✅ 비밀번호 해시 업데이트 완료`);
      }
    } else {
      console.log(`   ✅ 해시가 올바름`);
    }
  }

  // 최종 확인
  console.log('\n\n🔍 최종 확인:\n');
  const { data: finalAdmins } = await supabase
    .from('admins')
    .select('username, password_hash');

  if (finalAdmins) {
    finalAdmins.forEach(admin => {
      const isCorrect = admin.password_hash === correctHash;
      console.log(`  ${isCorrect ? '✅' : '❌'} ${admin.username}: ${admin.password_hash}`);
    });
  }

  console.log('\n✅ 완료!');
}

fixPasswords().catch(console.error);
