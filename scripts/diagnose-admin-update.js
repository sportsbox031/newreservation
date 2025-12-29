// admins 테이블 업데이트 문제 진단 스크립트
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

async function diagnose() {
  console.log('🔍 admins 테이블 업데이트 문제 진단\n');

  // 1. 기존 admin 조회
  console.log('1️⃣ admin 계정 조회 중...');
  const { data: admin, error: fetchError } = await supabase
    .from('admins')
    .select('*')
    .eq('username', 'admin')
    .single();

  if (fetchError) {
    console.error('❌ 조회 오류:', fetchError);
    return;
  }

  console.log('✅ admin 계정 정보:');
  console.log('   - ID:', admin.id);
  console.log('   - Username:', admin.username);
  console.log('   - Phone:', admin.phone);
  console.log('   - Email:', admin.email);
  console.log('');

  // 2. 업데이트 시도 (간단한 테스트)
  console.log('2️⃣ 업데이트 테스트 중...');
  const testUpdate = {
    phone: '010-1234-5678',
    email: 'test@example.com'
  };

  console.log('   업데이트 데이터:', testUpdate);
  
  const { data: updateData, error: updateError } = await supabase
    .from('admins')
    .update(testUpdate)
    .eq('id', admin.id)
    .select();

  console.log('');
  console.log('📊 업데이트 결과:');
  console.log('   - Data:', JSON.stringify(updateData, null, 2));
  console.log('   - Error:', JSON.stringify(updateError, null, 2));
  console.log('');

  if (updateError) {
    console.log('❌ 업데이트 실패!');
    console.log('   오류 세부사항:');
    console.log('   - Message:', updateError.message);
    console.log('   - Details:', updateError.details);
    console.log('   - Hint:', updateError.hint);
    console.log('   - Code:', updateError.code);
  } else if (updateData && updateData.length > 0) {
    console.log('✅ 업데이트 성공!');
    console.log('   업데이트된 데이터:', updateData[0]);
  } else {
    console.log('⚠️ 업데이트 결과가 비어있습니다.');
    console.log('   이것은 RLS 정책 문제일 가능성이 높습니다.');
  }

  // 3. 최종 확인
  console.log('');
  console.log('3️⃣ 최종 데이터 확인 중...');
  const { data: finalData } = await supabase
    .from('admins')
    .select('*')
    .eq('username', 'admin')
    .single();

  if (finalData) {
    console.log('   현재 admin 정보:');
    console.log('   - Phone:', finalData.phone);
    console.log('   - Email:', finalData.email);
  }
}

diagnose().catch(console.error);
