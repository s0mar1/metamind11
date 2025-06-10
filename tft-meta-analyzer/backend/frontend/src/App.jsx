import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SearchBar from "./components/common/SearchBar";
import SummonerPage from "./pages/SummonerPage";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 20 }}>
        <SearchBar />
        <Routes>
          <Route path="/summoner/:region/:name/:tag" element={<SummonerPage />} />
          <Route path="*" element={<p>소환사 이름#태그를 입력하고 검색해 주세요.</p>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
