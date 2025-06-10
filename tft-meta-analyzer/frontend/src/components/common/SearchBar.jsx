import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchBar() {
  const [region, setRegion] = useState('kr');
  const [summonerInput, setSummonerInput] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!summonerInput.trim() || !summonerInput.includes('#')) {
      alert('소환사명#태그 형식으로 입력해주세요.');
      return;
    }
    
    // ⬇️⬇️⬇️ 이 부분이 새로운 방식으로 변경됩니다 ⬇️⬇️⬇️
    const [gameName, tagLine] = summonerInput.trim().split('#');

    // 쿼리 파라미터를 사용한 새로운 경로를 만듭니다.
    const queryString = new URLSearchParams({ region, gameName, tagLine }).toString();
    navigate(`/summoner?${queryString}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="kr">KR</option>
        <option value="jp1">JP</option>
      </select>
      <input
        type="text"
        value={summonerInput}
        onChange={(e) => setSummonerInput(e.target.value)}
        placeholder="소환사명#태그 (e.g., Hide on bush#KR1)"
      />
      <button type="submit">
        검색
      </button>
    </form>
  );
}

export default SearchBar;