// frontend/src/pages/LeaderboardPage.jsx

import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../api/userApi';
import { getLevelFromXP } from '../utils/levelUtils';
import ChallengeLoader from '../components/common/ChallengeLoader';

const medalColors = [
  'from-yellow-400 to-yellow-600 border-yellow-400', // Gold
  'from-gray-300 to-gray-400 border-gray-400',      // Silver
  'from-orange-400 to-orange-600 border-orange-400' // Bronze
];
const medalText = ['#FFD700', '#C0C0C0', '#CD7F32'];

const timeRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' }
];
const sports = ['Football', 'Basketball'];

const LeaderboardPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [sport, setSport] = useState('Football');

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line
  }, [timeRange, sport]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      // You may want to pass timeRange and sport as filters if your API supports it
      const response = await getLeaderboard({ sport: sport.toLowerCase() });
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatHeight = (height) => {
    if (!height) return 'N/A';
    const feet = Math.floor(height / 12);
    const inches = height % 12;
    return `${feet}'${inches}" (${Math.round(height * 2.54)} cm)`;
  };
  const formatWeight = (weight) => {
    if (!weight) return 'N/A';
    return `${weight} lbs (${Math.round(weight * 0.453592)} kg)`;
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-screen">
        <ChallengeLoader />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
        <button onClick={fetchLeaderboard} className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Try Again</button>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-5xl font-extrabold text-center text-red-600 mb-2 tracking-tight">LEADERBOARD</h1>
      <h2 className="text-2xl font-semibold text-center text-gray-400 mb-8 tracking-wide">#BeHEARD</h2>

      {/* Top 3 Cards */}
      <div className="flex flex-row justify-center items-start gap-8 mb-8">
        {/* #1 Athlete - left side */}
        {top3[0] && (
          <div className="relative bg-white shadow-lg rounded-3xl flex flex-col items-center text-center h-[620px] min-w-[520px] w-[520px] p-8">
            {/* Country code (first 3 letters, italic, top right) */}
            <div className="absolute top-6 right-8 text-gray-400 text-lg italic font-semibold tracking-widest">{(top3[0].country || '').slice(0,3).toUpperCase()}</div>
            {/* Profile Pic + Medal (top center) */}
            <div className="relative mb-2 mt-2 flex justify-center w-full">
              <img
                src={top3[0].profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(top3[0].name || 'U')}
                alt={top3[0].name}
                className="w-32 h-32 rounded-full object-cover border-8 border-yellow-400 shadow mx-auto"
                style={{ zIndex: 1 }}
              />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-14 z-10 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-4 border-yellow-400 bg-white flex items-center justify-center">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 flex items-center justify-center text-2xl font-bold border-4 border-white">1</span>
                </div>
              </div>
            </div>
            {/* Name */}
            <h2 className="text-4xl font-extrabold mb-1 tracking-tight w-full truncate">{top3[0].name}</h2>
            {/* Info line */}
            <div className="text-lg text-gray-400 italic font-semibold mb-2 w-full flex justify-center items-center gap-2">
              <span>Age: {top3[0].age ?? 'N/A'}</span>
              <span className="mx-1">.</span>
              <span>Level {getLevelFromXP(top3[0].xpTotal)}</span>
              <span className="mx-1">.</span>
              <span>{top3[0].position || 'N/A'}</span>
            </div>
            {/* XP bar */}
            <div className="w-full flex flex-col mb-2">
              <div className="relative w-full h-2.5 rounded-full bg-gray-200">
                <div className="absolute left-0 top-0 h-2.5 rounded-full bg-red-500" style={{ width: `${Math.min((top3[0].xpTotal || 0) / 2000 * 100, 100)}%` }}></div>
              </div>
            </div>
            {/* Height/Weight */}
            <div className="flex justify-between w-full text-gray-600 text-base font-medium mb-2">
              <span>Height: {top3[0].height ? formatHeight(top3[0].height) : 'N/A'}</span>
              <span>Weight: {top3[0].weight ? formatWeight(top3[0].weight) : 'N/A'}</span>
            </div>
            {/* Stats (center, stacked) */}
            <div className="flex flex-col gap-1 w-full my-4 items-center text-lg">
              <div className="flex items-center gap-2 justify-center"><span className="text-2xl">✔️</span> <span className="font-bold">{top3[0].challengesSubmitted ?? 0}</span> <span className="italic font-semibold text-gray-700">Challenges Submitted</span></div>
              <div className="flex items-center gap-2 justify-center"><span className="text-2xl">🧑‍🏫</span> <span className="font-bold">{top3[0].coachApprovals ?? 0}</span> <span className="italic font-semibold text-gray-700">Coach Approvals</span></div>
              <div className="flex items-center gap-2 justify-center"><span className="text-2xl">🔥</span> <span className="font-bold">{top3[0].streak ?? 0}</span> <span className="italic font-semibold text-gray-700">Streak {top3[0].streak ?? 0} days Active</span></div>
            </div>
            {/* Grinder of the Week */}
            <div className="w-full flex justify-center mb-2 mt-2">
              <span className="w-full text-center bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 font-bold text-lg px-6 py-2 rounded-xl shadow">Grinder of the Week</span>
            </div>
            {/* View Profile Button */}
            <button className="w-full border border-gray-400 rounded-xl py-3 mt-2 text-lg font-semibold hover:bg-gray-100 transition">View Full Profile</button>
          </div>
        )}
        {/* #2 and #3 - right side, stacked */}
        <div className="flex flex-col gap-4" style={{height: 820, minWidth: 520, width: 520}}>
          {[top3[1], top3[2]].filter(Boolean).map((user, idx) => (
            <div key={user.id} className={`relative bg-white shadow-lg rounded-3xl flex flex-row items-stretch h-[400px] min-w-[520px] w-[520px] p-0`}>
              {/* Profile Pic + Medal (left column) */}
              <div className="relative flex flex-col items-center justify-start w-[180px] pt-8 pl-8">
                <img
                  src={user.profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'U')}
                  alt={user.name}
                  className={`w-32 h-32 rounded-full object-cover border-8 ${idx === 0 ? 'border-gray-400' : 'border-orange-400'} shadow`}
                  style={{ zIndex: 1 }}
                />
                <div className={`absolute top-4 left-4 w-12 h-12 z-10 flex items-center justify-center`}>
                  <div className={`w-12 h-12 rounded-full border-4 ${idx === 0 ? 'border-gray-400' : 'border-orange-400'} bg-white flex items-center justify-center`}>
                    <span className={`w-8 h-8 rounded-full ${idx === 0 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' : 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900'} flex items-center justify-center text-xl font-bold border-4 border-white`}>{idx + 2}</span>
                  </div>
                </div>
              </div>
              {/* Card Content (right column) */}
              <div className="flex-1 flex flex-col justify-between pl-2 pr-8 py-8">
                {/* Country code (top right) */}
                <div className="absolute top-6 right-8 text-gray-400 text-2xl italic font-semibold tracking-widest">{(user.country || '').slice(0,3).toUpperCase()}</div>
                {/* Name */}
                <h2 className="text-4xl font-extrabold mb-1 tracking-tight text-left">{user.name}</h2>
                {/* Info line */}
                <div className="text-2xl text-gray-400 italic font-semibold mb-2 text-left">
                  Age: {user.age ?? 'N/A'} <span className="mx-1">•</span> Level {getLevelFromXP(user.xpTotal)} <span className="mx-1">•</span> {user.position || 'N/A'}
                </div>
                {/* XP bar and Height/Weight */}
                <div className="flex flex-row items-center mb-2">
                  <div className="flex-1 flex flex-col">
                    <div className="relative w-full h-3 rounded-full bg-gray-200 mb-1">
                      <div className="absolute left-0 top-0 h-3 rounded-full bg-red-500" style={{ width: `${Math.min((user.xpTotal || 0) / 2000 * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="flex flex-col text-gray-700 text-lg font-medium ml-6">
                    <span>Height: {user.height ? formatHeight(user.height) : 'N/A'}</span>
                    <span>Weight: {user.weight ? formatWeight(user.weight) : 'N/A'}</span>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex flex-col gap-1 w-full my-2 text-xl">
                  <div className="flex items-center gap-4 text-left"><span className="text-2xl">✔️</span> <span className="font-bold">{user.challengesSubmitted ?? 0}</span> <span className="font-bold italic">Challenges Submitted</span></div>
                  <div className="flex items-center gap-4 text-left"><span className="text-2xl">🧑‍🏫</span> <span className="font-bold">{user.coachApprovals ?? 0}</span> <span className="font-bold italic">Coach Approvals</span></div>
                  <div className="flex items-center gap-4 text-left"><span className="text-2xl">🔥</span> <span className="font-bold">{user.streak ?? 0}</span> <span className="font-bold italic">Streak {user.streak ?? 0} days Active</span></div>
                </div>
                {/* View Profile Button */}
                <button className="w-full border border-gray-400 rounded-xl py-3 mt-4 text-2xl font-semibold hover:bg-gray-100 transition">View Full Profile</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center">
        <div className="flex gap-2">
          {timeRanges.map((t) => (
            <button
              key={t.value}
              className={`px-5 py-2 rounded-lg shadow font-semibold text-base transition border ${timeRange === t.value ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setTimeRange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div>
          <select
            className="px-5 py-2 rounded-lg shadow font-semibold text-base border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            value={sport}
            onChange={e => setSport(e.target.value)}
          >
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Leaderboard List (4th and below) */}
      <div className="bg-white rounded-2xl shadow-lg p-0 overflow-hidden">
        {rest.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No users found matching your filters.</p>
          </div>
        ) : (
          <div>
            {rest.map((user, idx) => (
              <div key={user.id} className="flex items-center gap-4 border-b last:border-b-0 px-4 py-5 hover:bg-gray-50 transition">
                <div className="text-2xl font-bold w-8 text-center text-gray-400">{idx + 4}</div>
                <img
                  src={user.profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'U')}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-gray-800 truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Age: {user.age || 'N/A'} &bull; {user.position || ''} &bull; {user.country || ''} &bull; Level: {getLevelFromXP(user.xpTotal)}
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[120px]">
                  <div className="text-xs text-gray-500">Height: {formatHeight(user.height)}</div>
                  <div className="text-xs text-gray-500">Weight: {formatWeight(user.weight)}</div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full mt-2 relative">
                    <div className="absolute left-0 top-0 h-2 rounded-full bg-red-500" style={{ width: `${Math.min((user.challengesSubmitted || 0) / 150 * 100, 100)}%` }}></div>
                  </div>
                  <div className="text-xs text-right text-gray-700 font-semibold mt-1">{user.challengesSubmitted || 0} Challenges</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;