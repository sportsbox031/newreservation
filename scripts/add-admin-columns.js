// admins 테이블에 phone, email 컬럼 추가 스크립트
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

async function addColumns() {
  console.log('🔧 admins 테이블에 컬럼 추가 중...\n');

  // SQL 실행
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '',
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
    `
  });

  if (error) {
    console.error('❌ 컬럼 추가 실패:', error);
    console.log('\n⚠️  Supabase 대시보드에서 수동으로 실행해주세요:');
    console.log('\n  1. Supabase Dashboard → SQL Editor');
    console.log('  2. add-admin-columns.sql 파일 내용 복사/붙여넣기');
    console.log('  3. Run 버튼 클릭\n');
    return;
  }

  console.log('✅ 컬럼 추가 완료!');

  // 확인
  console.log('\n🔍 테이블 구조 확인 중...\n');
  const { data: admins } = await supabase
    .from('admins')
    .select('*')
    .limit(1);

  if (admins && admins.length > 0) {
    console.log('📋 업데이트된 컬럼:');
    Object.keys(admins[0]).forEach(col => {
      console.log(`  - ${col}`);
    });
  }
}

addColumns().catch(console.error);
