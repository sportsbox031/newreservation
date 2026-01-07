# Node.js 18 LTS
FROM node:18-alpine

# 작업 디렉토리
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm install --production

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 8080

# 서버 실행
CMD ["node", "server.js"]
