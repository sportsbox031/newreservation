import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 구조화된 데이터 (JSON-LD) - 검색엔진 최적화
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://ggsportsbox.or.kr/#organization',
        name: '경기도체육회 스포츠박스',
        url: 'https://ggsportsbox.or.kr',
        logo: 'https://static.readdy.ai/image/416007a89256a2717806f7776e859886/110ce5261818cd69133e46ef8c6b097a.png',
        description: '경기도체육회 스포츠박스 프로그램 온라인 예약 시스템',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'KR',
          addressRegion: '경기도',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: '+82-31-250-0474',
            contactType: '남부지역 문의',
            areaServed: 'KR',
            availableLanguage: 'Korean',
          },
          {
            '@type': 'ContactPoint',
            telephone: '+82-31-872-6520',
            contactType: '북부지역 문의',
            areaServed: 'KR',
            availableLanguage: 'Korean',
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://ggsportsbox.or.kr/#website',
        url: 'https://ggsportsbox.or.kr',
        name: '경기도체육회 스포츠박스',
        description: '찾아가는 스포츠교실, 체험존, 이벤트 등 다양한 생활체육 프로그램',
        publisher: {
          '@id': 'https://ggsportsbox.or.kr/#organization',
        },
        inLanguage: 'ko-KR',
      },
    ],
  };

  return (
    <html lang="ko">
      <head>
        <title>경기도체육회 스포츠박스 예약 시스템</title>

        {/* 네이버 서치어드바이저 소유확인 태그 */}
        <meta name="naver-site-verification" content="8b2e89a8b5fd81b532ccd9510f1b0ffe107d2f16" />

        {/* SEO 메타태그 */}
        <meta name="description" content="경기도체육회 스포츠박스는 찾아가는 스포츠 프로그램, 스포츠교실, 스포츠체험존, 스포츠이벤트를 운영하여 모든 경기도민에게 스포츠 서비스를 제공합니다. 지금 바로 온라인으로 예약하세요!" />
        <meta name="keywords" content="경기도체육회, 스포츠박스, 찾아가는 스포츠, 스포츠교실, 스포츠체험존, 스포츠이벤트, 생활체육, 경기도, 체육활동, 스포츠 프로그램, 온라인 예약" />
        <meta name="author" content="경기도체육회" />

        {/* Open Graph 태그 */}
        <meta property="og:title" content="경기도체육회 스포츠박스 - 모두를 위한 스포츠" />
        <meta property="og:description" content="경기도체육회 스포츠박스가 여러분의 건강한 생활을 지원합니다. 찾아가는 스포츠 프로그램으로 모든 도민이 스포츠를 즐길 수 있도록 합니다." />
        <meta property="og:image" content="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/110ce5261818cd69133e46ef8c6b097a.png" />
        <meta property="og:url" content="https://ggsportsbox.or.kr" />
        <meta property="og:type" content="website" />

        {/* Twitter 카드 */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="경기도체육회 스포츠박스" />
        <meta name="twitter:description" content="경기도체육회 스포츠박스가 여러분의 건강한 생활을 지원합니다." />
        <meta name="twitter:image" content="https://static.readdy.ai/image/416007a89256a2717806f7776e859886/110ce5261818cd69133e46ef8c6b097a.png" />

        {/* 표준 링크 정의 */}
        <link rel="canonical" href="https://ggsportsbox.or.kr" />

        {/* 구조화된 데이터 (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
