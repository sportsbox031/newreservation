# 알리고 프록시 서버 (Fly.io)

Vercel에서 알리고 API를 호출하기 위한 고정 IP 프록시 서버

## 배포 방법

```bash
# Fly.io 로그인
flyctl auth login

# 앱 생성 및 배포
flyctl launch

# 환경 변수 설정
flyctl secrets set ALIGO_API_KEY=your_key
flyctl secrets set ALIGO_USER_ID=your_id
flyctl secrets set ALIGO_SENDER_KEY=your_sender_key
flyctl secrets set ALIGO_SENDER_PHONE=010-XXXX-XXXX

# 재배포
flyctl deploy
```

## API 엔드포인트

### Health Check
```
GET /health
```

### 알리고 프록시
```
POST /proxy/aligo
Content-Type: application/json

{
  "tplCode": "UE_6684",
  "receiver": "010-1234-5678",
  "subject": "제목",
  "message": "메시지",
  "failover": true
}
```
