import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SearchBar from '../../components/common/SearchBar';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStatsSummary from '../../components/profile/ProfileStatsSummary';
import MatchHistoryList from '../../components/profile/MatchHistoryList';

export default function SummonerPage() {
  const router = useRouter();
  const { region, name } = router.query;
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!region || !name) return;
    async function fetchData() {
      const res = await fetch(`/api/summoner/${region}/${name}`);
      const data = await res.json();
      setProfile(data.summoner);
      setMatches(data.matches);
    }
    fetchData();
  }, [region, name]);

  if (!profile) return <p className="p-4">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <SearchBar />
      </header>
      <main className="max-w-4xl mx-auto py-6">
        <ProfileHeader
          name={profile.name}
          tierIcon={profile.tierIcon}
          level={profile.summonerLevel}
        />
        <ProfileStatsSummary
          stats={{ winRate: profile.winRate, avgRank: profile.avgRank, top4Rate: profile.top4Rate }}
        />
        <MatchHistoryList matches={matches} />
      </main>
    </div>
  );
}
