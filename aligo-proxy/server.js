const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS 설정 - Vercel 도메인 허용
app.use(cors({
  origin: [
    /\.vercel\.app$/,
    process.env.ALLOWED_ORIGIN
  ].filter(Boolean)
}));

app.use(express.json());

// 헬스 체크
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Aligo Proxy Server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Outbound IP 확인 (알리고에 등록할 IP)
app.get('/check-ip', async (req, res) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('🌐 Outbound IP:', data.ip);
    res.json({
      outboundIP: data.ip,
      message: '이 IP를 알리고에 등록하세요!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('IP 확인 실패:', error);
    res.status(500).json({
      error: 'IP 확인 실패',
      details: error.message
    });
  }
});

// 알리고 API 프록시
app.post('/proxy/aligo', async (req, res) => {
  try {
    console.log('📨 알리고 API 요청:', new Date().toISOString());

    const { tplCode, receiver, subject, message, failover } = req.body;

    if (!tplCode || !receiver || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다.'
      });
    }

    // 환경 변수 확인
    const apiKey = process.env.ALIGO_API_KEY;
    const userId = process.env.ALIGO_USER_ID;
    const senderKey = process.env.ALIGO_SENDER_KEY;
    const sender = process.env.ALIGO_SENDER_PHONE;

    if (!apiKey || !userId || !senderKey || !sender) {
      console.error('❌ 환경 변수 누락');
      return res.status(500).json({
        success: false,
        error: '서버 환경 변수가 설정되지 않았습니다.'
      });
    }

    // 전화번호 정규화
    const normalizedReceiver = receiver.replace(/-/g, '');
    const normalizedSender = sender.replace(/-/g, '');

    // FormData 생성
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('userid', userId);
    formData.append('senderkey', senderKey);
    formData.append('tpl_code', tplCode);
    formData.append('sender', normalizedSender);
    formData.append('receiver_1', normalizedReceiver);
    formData.append('subject_1', subject);
    formData.append('message_1', message);

    if (failover !== false) {
      formData.append('failover', 'Y');
      formData.append('fsubject_1', subject);
      formData.append('fmessage_1', message);
    }

    console.log('🚀 알리고 API 호출...');

    // 알리고 API 호출
    const response = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('📥 알리고 응답:', result);

    if (result.code === 0) {
      console.log('✅ 알림톡 발송 성공');
      return res.json({
        success: true,
        message: '알림톡이 성공적으로 발송되었습니다.',
        data: result
      });
    } else {
      console.error('❌ 알리고 오류:', result);
      return res.json({
        success: false,
        error: result.message || '알림톡 발송에 실패했습니다.',
        data: result
      });
    }
  } catch (error) {
    console.error('💥 서버 오류:', error);
    return res.status(500).json({
      success: false,
      error: '알림톡 발송 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found'
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 알리고 프록시 서버: http://0.0.0.0:${PORT}`);
});
