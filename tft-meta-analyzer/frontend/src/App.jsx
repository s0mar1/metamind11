import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer'; // 풋터 컴포넌트 import
import HomePage from './pages/HomePage';
import SummonerPage from './pages/summoner/SummonerPage';
import TierListPage from './pages/tierlist/TierListPage';
import RankingPage from './pages/ranking/RankingPage';
import AiQnaPage from './pages/AiQnaPage/AiQnaPage.jsx';
import DeckBuilderPage from './pages/DeckBuilderPage/DeckBuilderPage';
import GuideListPage from './pages/GuideListPage/GuideListPage';
import GuideDetailPage from './pages/GuideDetailPage/GuideDetailPage';
import GuideEditorPage from './pages/GuideEditorPage/GuideEditorPage';
import { useTFTData } from './context/TFTDataContext';
import ChampionTooltip from './components/common/ChampionTooltip';
import AboutPage from './pages/AboutPage/AboutPage.jsx';

function App() {
  const { tooltip } = useTFTData();

  return (
    <div className="bg-background-base min-h-screen flex flex-col">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/summoner/:region" element={<SummonerPage />} />
          <Route path="/tierlist" element={<TierListPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/ai-chat" element={<AiQnaPage />} />
          <Route path="/deck-builder" element={<DeckBuilderPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/guides" element={<GuideListPage />} />
          <Route path="/guides/:id" element={<GuideDetailPage />} />
          <Route path="/guides/new" element={<GuideEditorPage />} />
        </Routes>
      </main>
      {tooltip.visible && <ChampionTooltip champion={tooltip.data} position={tooltip.position} />}
      <Footer />
    </div>
  );
}

export default App;
