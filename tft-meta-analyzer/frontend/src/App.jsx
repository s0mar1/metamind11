import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import SearchBar from './components/common/SearchBar';
import SummonerPage from './pages/summoner/SummonerPage';
import TierListPage from './pages/tierlist/TierListPage'; // ⬅️ 새로 추가된 페이지 import

function App() {
  // --- 스타일 객체들 ---
  const pageStyle = { 
    backgroundColor: '#1A202C', 
    color: '#EAEAEA', 
    minHeight: '100vh', 
  };

  const headerStyle = { 
    padding: '1rem 0', 
    borderBottom: '1px solid #4A5568', 
    backgroundColor: '#2D3748', 
  };

  const navStyle = { 
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '0 2rem', 
    display: 'flex', 
    alignItems: 'center' 
  };

  const linkStyle = { 
    textDecoration: 'none', 
    color: '#EAEAEA', 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
  };

  const mainContainerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
  };

  const mainMessageStyle = { 
    padding: '2rem', 
    textAlign: 'center', 
    fontSize: '1.2rem', 
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <nav style={navStyle}>
          {/* 메인 페이지로 가는 링크 */}
          <Link to="/" style={linkStyle}> 
            TFT Meta Analyzer 
          </Link>
          {/* 덱 티어리스트 페이지로 가는 링크 */}
          <Link to="/tierlist" style={{...linkStyle, fontSize: '1rem', marginLeft: '2rem'}}>
            덱 티어리스트
          </Link>
        </nav>
      </header>
      
      <div style={mainContainerStyle}>
        <main>
          <SearchBar />
          <Routes>
            {/* 기본 경로 */}
            <Route 
              path="/" 
              element={ 
                <div style={mainMessageStyle}> 
                  소환사 이름#태그를 입력하고 검색해 주세요. 
                </div> 
              } 
            />
            {/* 전적 검색 결과 페이지 경로 */}
            <Route 
              path="/summoner" 
              element={<SummonerPage />} 
            />
            {/* 덱 티어리스트 페이지 경로 */}
            <Route 
              path="/tierlist" 
              element={<TierListPage />} 
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;