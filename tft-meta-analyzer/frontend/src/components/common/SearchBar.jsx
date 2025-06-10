import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [region, setRegion] = useState("kr");
  const [input, setInput]   = useState("");
  const nav = useNavigate();

  const onSubmit = e => {
    e.preventDefault();
    const [name, tag] = input.split("#");
    if (!name || !tag) {
      alert("‘이름#태그’ 형식으로 입력해야 합니다.");
      return;
    }
    nav(`/summoner/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  };

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: 12 }}>
      <select value={region} onChange={e => setRegion(e.target.value)}>
        <option value="kr">KR</option>
        <option value="na">NA</option>
        <option value="euw">EUW</option>
        <option value="eun">EUN</option>
        {/* 필요시 추가 */}
      </select>
      <input
        placeholder="소환사이름#태그"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ width: 200 }}
      />
      <button>검색</button>
    </form>
  );
}
