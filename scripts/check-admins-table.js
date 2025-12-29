// admins 테이블 구조 확인 스크립트
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

async function checkTable() {
  console.log('🔍 admins 테이블 구조 확인 중...\n');

  // 관리자 데이터 조회
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ 조회 오류:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('📋 테이블 컬럼:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      console.log(`  - ${col}: ${typeof data[0][col]} (${data[0][col] === null ? 'null' : 'has value'})`);
    });
  } else {
    console.log('⚠️ 데이터가 없습니다.');
  }
}

checkTable().catch(console.error);
