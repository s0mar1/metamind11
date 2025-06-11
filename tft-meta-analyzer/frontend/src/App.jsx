import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import SummonerPage from './pages/summoner/SummonerPage';
import TierListPage from './pages/tierlist/TierListPage';
import RankingPage from './pages/ranking/RankingPage'; // ⬅️ 새로 만들 페이지 import

// 임시 페이지 컴포넌트들
const AIChatPage = () => <div className="p-8 text-center">AI 질문하기 기능은 현재 개발 중입니다.</div>;
const AboutPage = () => <div className="p-8 text-center">MetaMind 프로젝트 소개 페이지입니다.</div>;

function App() {
  return (
    <div className="bg-background-base min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/summoner/:region" element={<SummonerPage />} />
          <Route path="/tierlist" element={<TierListPage />} />
          
          {/* ⬇️⬇️⬇️ 랭킹 페이지 경로를 실제 컴포넌트로 연결 ⬇️⬇️⬇️ */}
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;