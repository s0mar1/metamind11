import React from 'react';

export default function MatchCard({ match }) {
  const borderColor = {
    1: 'border-yellow-400',
    2: 'border-gray-400',
    3: 'border-orange-400',
    4: 'border-blue-400'
  }[match.rank] || 'border-gray-200';

  return (
    <div className={`flex items-center p-4 border-l-4 ${borderColor} bg-white rounded shadow`}>
      <div className="flex-1">
        <p className="font-semibold">Rank: {match.rank}</p>
        <p className="text-gray-500 text-sm">{new Date(match.timestamp).toLocaleString()}</p>
      </div>
      <div className="flex gap-2">
        {match.champions.map(ch => (
          <img
            key={ch.id}
            src={ch.icon}
            alt={ch.name}
            className="w-8 h-8 rounded"
          />
        ))}
      </div>
    </div>
  );
}
