// frontend/src/pages/LeaderboardPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { getLeaderboard } from '../api/userApi';
import { calculateAge, getLevelFromXP, getXPProgress, getXPDetails } from '../utils/levelUtils';
import ChallengeLoader from '../components/common/ChallengeLoader';
import { useNavigate } from 'react-router-dom';
import { createProfileUrl } from '../utils/profileUrlUtils';

const medalColors = [
  'from-yellow-400 to-yellow-600 border-yellow-400', // Gold
  'from-gray-300 to-gray-400 border-gray-400',      // Silver
  'from-orange-400 to-orange-600 border-orange-400' // Bronze
];
const medalText = ['#FFD700', '#C0C0C0', '#CD7F32'];

const timeRanges = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' }
];

const sports = ['All Sports', 'Football', 'Basketball'];

const positions = [
  'All Positions',
  'Striker', 'Left Winger', 'Right Winger', 'Second Striker',
  'Left Back', 'Right Back', 'Center Back', 'Defensive Midfielder',
  'Center Midfielder', 'Attacking Midfielder', 'Goalkeeper',
  'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'
];

const countries = [
  'All Countries',
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy',
  'Brazil', 'Argentina', 'Mexico', 'Japan', 'South Korea', 'China', 'India',
  'Australia', 'Netherlands', 'Belgium', 'Portugal', 'Switzerland', 'Sweden',
  'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Austria',
  'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Turkey', 'Ukraine', 'Russia',
  'South Africa', 'Nigeria', 'Egypt', 'Morocco', 'Kenya', 'Ghana', 'Senegal',
  'Ivory Coast', 'Cameroon', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Ethiopia',
  'Saudi Arabia', 'Iran', 'Iraq', 'Syria', 'Lebanon', 'Jordan', 'Israel',
  'Palestine', 'Kuwait', 'Qatar', 'UAE', 'Oman', 'Yemen', 'Afghanistan',
  'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Myanmar',
  'Thailand', 'Vietnam', 'Cambodia', 'Laos', 'Malaysia', 'Singapore',
  'Indonesia', 'Philippines', 'New Zealand', 'Fiji', 'Papua New Guinea'
];

const sortOptions = [
  { label: 'Experience Points', value: 'xpTotal' },
  { label: 'Height', value: 'height' },
  { label: 'Challenges Submitted', value: 'challengesSubmitted' },
  { label: 'Coach Approvals', value: 'coachApprovals' },
  { label: 'Challenges Created', value: 'challengesCreated' },
  { label: 'Challenges Approved', value: 'challengesApproved' }
];

const LeaderboardPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [sport, setSport] = useState('All Sports');
  const [position, setPosition] = useState('All Positions');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [sortBy, setSortBy] = useState('xpTotal');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [grinderOfWeekId, setGrinderOfWeekId] = useState(null);
  const [activeTab, setActiveTab] = useState('athletes'); // 'athletes' or 'coaches'
  const navigate = useNavigate();

  // Debounced fetch function
  const debouncedFetch = useCallback(
    (() => {
      let timeoutId;
      return (filters) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchLeaderboard(filters);
        }, 500); // 500ms delay
      };
    })(),
    []
  );

  // Apply filters function
  const applyFilters = () => {
    const filters = {
      timeFrame: timeRange,
      sport: sport === 'All Sports' ? undefined : sport,
      position: position === 'All Positions' ? undefined : position,
      ageMin: ageMin || undefined,
      ageMax: ageMax || undefined,
      country: country === 'All Countries' ? undefined : country,
      sortBy,
      sortOrder
    };
    
    setFiltersApplied(true);
    fetchLeaderboard(filters);
  };

  // Clear all filters
  const clearFilters = () => {
    setTimeRange('all');
    setSport('All Sports');
    setPosition('All Positions');
    setAgeMin('');
    setAgeMax('');
    setCountry('All Countries');
    setSortBy('xpTotal');
    setSortOrder('DESC');
    setFiltersApplied(false);
    fetchLeaderboard({});
  };

  useEffect(() => {
    // Always fetch leaderboard when filters or tab change
    const filters = {
      timeFrame: timeRange,
      sport: sport === 'All Sports' ? undefined : sport,
      sortBy,
      sortOrder,
      role: activeTab === 'coaches' ? 'coach' : 'athlete'
    };
    fetchLeaderboard(filters);

    // Fetch Grinder of the Week (athletes only)
    if (activeTab === 'athletes') {
      getLeaderboard({ timeFrame: 'week', sortBy: 'xpTotal', sortOrder: 'DESC', limit: 1, role: 'athlete' })
        .then(res => {
          if (res.data && res.data.users && res.data.users.length > 0) {
            setGrinderOfWeekId(res.data.users[0].id);
          } else {
            setGrinderOfWeekId(null);
          }
        })
        .catch(() => setGrinderOfWeekId(null));
    } else {
      setGrinderOfWeekId(null);
    }
  }, [timeRange, sport, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    // Initial load
    fetchLeaderboard({});
  }, []);

  const fetchLeaderboard = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLeaderboard(filters);
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
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

  // Handler for viewing full profile
  const handleViewProfile = (user) => {
    if (user && user.name) {
      navigate(createProfileUrl(user.name));
    }
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
    <div className="p-4 mx-auto">
      {/* Header */}
      <h1 className="text-5xl font-extrabold text-center text-red-600 mb-2 tracking-tight">LEADERBOARD</h1>
      <h2 className="text-2xl font-semibold text-center text-gray-400 mb-2 tracking-wide">#BeHEARD</h2>
      {/* Athlete/Coach Tabs */}
      <div className="flex justify-center mb-8 gap-4">
        <button
          className={`px-6 py-2 rounded-full font-bold text-lg transition border-2 ${activeTab === 'athletes' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('athletes')}
        >
          Athletes
        </button>
        <button
          className={`px-6 py-2 rounded-full font-bold text-lg transition border-2 ${activeTab === 'coaches' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('coaches')}
        >
          Coaches
        </button>
      </div>
      {/* Top 3 Cards */}
      {activeTab === 'athletes' ? (
        <div className="flex flex-row justify-center items-start gap-8 mb-8">
          {/* #1 Athlete - left side */}
          {top3[0] && (
            <div className="relative bg-white shadow-lg rounded-3xl flex flex-col items-center text-center h-[470px] w-[470px] p-4" style={{minWidth: '430px', width: '430px'}}>
              {/* Country code (first 3 letters, italic, top right) */}
              <div className="absolute top-2 right-4 text-gray-400 text-sm italic font-semibold tracking-widest">{(top3[0].country || '').slice(0,3).toUpperCase()}</div>
              {/* Profile Pic + Medal (top center) */}
              <div className="relative mb-1 mt-1 flex justify-center w-full">
                <img
                  src={top3[0].profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(top3[0].name || 'U')}
                  alt={top3[0].name}
                  className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 shadow mx-auto"
                  style={{ zIndex: 1 }}
                />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-7 z-10 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full border border-yellow-400 bg-white flex items-center justify-center">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 flex items-center justify-center text-xs font-bold border border-white">1</span>
                  </div>
                </div>
              </div>
              {/* Name */}
              <h2 className="text-2xl font-extrabold mb-2 tracking-tight w-full text-center" style={{overflow: 'visible'}}>{top3[0].name}</h2>
              {/* Info line */}
              <div className="text-sm text-gray-400 italic font-semibold mb-1 w-full flex justify-center items-center gap-1">
                <span>Age: {calculateAge(top3[0].dateOfBirth)}</span>
                <span className="mx-1">.</span>
                <span>Level {getLevelFromXP(top3[0].xpTotal)}</span>
                <span className="mx-1">.</span>
                <span>{top3[0].position || 'N/A'}</span>
              </div>
              {/* XP bar */}
              <div className="w-full flex flex-col mb-1">
                <div className="relative w-full h-1.5 rounded-full bg-gray-200">
                  <div 
                    className="absolute left-0 top-0 h-1.5 rounded-full bg-red-500" 
                    style={{ width: `${getXPProgress(top3[0].xpTotal || 0)}%` }}
                  ></div>
                </div>
              </div>
              {/* XP bar */}
              <div className="flex flex-col mb-0 ml-4">
                <div className="relative w-full h-1 rounded-full bg-gray-200 mb-0.5">
                  <div 
                    className="absolute left-0 top-0 h-1 rounded-full bg-red-500" 
                    style={{ width: `${getXPProgress(top3[0].xpTotal || 0)}%` }}
                  ></div>
                </div>
              </div>
              {/* Height/Weight */}
              <div className="flex justify-between w-full text-gray-600 text-xs font-medium mb-1">
                <span>Height: {top3[0].height ? formatHeight(top3[0].height) : '--'}</span>
                <span>Weight: {top3[0].weight ? formatWeight(top3[0].weight) : '--'}</span>
              </div>
              {/* Stats (center, stacked) - Only show what we have, placeholders for missing */}
              <div className="flex flex-col gap-2 w-full mt-6 mb-4 items-center text-base">
                {/* Challenges Completed - Use API data */}
                <div className="flex items-center gap-2 justify-center text-lg">
                  <span className="text-2xl">✔️</span>
                  <span className="font-bold">{top3[0].challengesSubmitted || 0}</span>
                  <span className="italic font-semibold text-gray-700">Challenges Completed</span>
                </div>
                {/* Coach Approvals - Use API data */}
                <div className="flex items-center gap-2 justify-center text-lg">
                  <span className="text-2xl">🧑‍🏫</span>
                  <span className="font-bold">{top3[0].coachApprovals || 0}</span>
                  <span className="italic font-semibold text-gray-700">Coach Approvals</span>
                </div>
                {/* Streak - Placeholder, not in leaderboard API */}
                <div className="flex items-center gap-2 justify-center text-lg">
                  <span className="text-2xl">🔥</span>
                  <span className="font-bold">{'--'}</span>
                  <span className="italic font-semibold text-gray-700">Streak -- days Active</span>
                </div>
              </div>
              {/* Grinder of the Week & View Profile Button */}
              <div className="flex flex-col gap-2 items-center mt-0">
                <button
                  className="w-full max-w-[490px] block border-2 border-gray-300 rounded-2xl py-1.5 text-lg font-semibold italic text-black bg-white hover:bg-gray-50 transition text-center"
                  style={{fontStyle: 'italic', fontWeight: 600, minWidth: '400px', width: '400px'}}
                  onClick={() => handleViewProfile(top3[0])}
                >
                  View Full Profile
                </button>
                {grinderOfWeekId && top3.some(u => u.id === grinderOfWeekId) && grinderOfWeekId === top3[0].id && (
                  <span className="w-full max-w-[490px] block text-center whitespace-nowrap bg-gradient-to-r from-yellow-400 to-yellow-600 text-white italic font-semibold text-lg px-4 py-1.5 rounded-2xl mt-2" style={{fontStyle: 'italic', fontWeight: 500, minWidth: '400px', width: '400px'}}>Grinder of the Week</span>
                )}
              </div>
            </div>
          )}
          {/* #2 and #3 - right side, stacked */}
          <div className="flex flex-col gap-2.5 w-full max-w-[470px] items-start">
            {[top3[1], top3[2]].filter(Boolean).map((user, idx) => (
              <div key={user.id} className={`relative bg-white shadow-lg rounded-3xl flex flex-row items-stretch h-[230px] w-full p-0`} style={{minWidth: '430px', width: '430px'}}>
                {/* Profile Pic + Medal (left column) */}
                <div className="relative flex flex-col items-center justify-start w-[100px] pt-1 pl-2">
                  <img
                    src={user.profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'U')}
                    alt={user.name}
                    className={`w-14 h-14 rounded-full object-cover border-4 ${idx === 0 ? 'border-gray-400' : 'border-orange-400'} shadow`}
                    style={{ zIndex: 1 }}
                  />
                  <div className={`absolute top-1 left-1 w-5 h-5 z-10 flex items-center justify-center`}>
                    <div className={`w-5 h-5 rounded-full border ${idx === 0 ? 'border-gray-400' : 'border-orange-400'} bg-white flex items-center justify-center`}>
                      <span className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' : 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900'} flex items-center justify-center text-[10px] font-bold border border-white`}>{idx + 2}</span>
                    </div>
                  </div>
                </div>
                {/* Card Content (right column) */}
                <div className="flex-1 flex flex-col justify-start pl-2 pr-4 py-1">
                  {/* Country code (top right) */}
                  <div className="absolute top-2 right-4 text-gray-400 text-xs italic font-semibold tracking-widest">{(user.country || '').slice(0,3).toUpperCase()}</div>
                  {/* Name */}
                  <h2 className="text-lg font-extrabold mb-0 tracking-tight text-left ml-6">{user.name}</h2>
                  {/* Info line */}
                  <div className="text-xs text-gray-400 italic font-semibold mb-0.5 text-left ml-6">
                    Age: {calculateAge(user.dateOfBirth)} <span className="mx-1">•</span> Level {getLevelFromXP(user.xpTotal)} <span className="mx-1">•</span> {user.position || 'N/A'}
                  </div>
                  {/* XP bar */}
                  <div className="flex flex-col mb-0 ml-4">
                    <div className="relative w-full h-1 rounded-full bg-gray-200 mb-0.5">
                      <div 
                        className="absolute left-0 top-0 h-1 rounded-full bg-red-500" 
                        style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* Height and Weight (stacked, left-aligned, below XP bar) */}
                  <div className="flex flex-col text-gray-700 text-xs font-medium mb-0.5 ml-4">
                    <span>Height: {user.height ? formatHeight(user.height) : '--'}</span>
                    <span>Weight: {user.weight ? formatWeight(user.weight) : '--'}</span>
                  </div>
                  {/* Stats */}
                  <div className="flex flex-col gap-0.5 w-full mb-0.5 text-xs items-center -ml-9">
                    <div className="flex items-center gap-1 justify-center"><span className="text-sm">✔️</span> <span className="font-bold">{user.challengesSubmitted || 0}</span> <span className="font-bold italic">Challenges</span></div>
                    <div className="flex items-center gap-1 justify-center"><span className="text-sm">🧑‍🏫</span> <span className="font-bold">{user.coachApprovals || 0}</span> <span className="font-bold italic">Approvals</span></div>
                    <div className="flex items-center gap-1 justify-center"><span className="text-sm">🔥</span> <span className="font-bold">{'--'}</span> <span className="font-bold italic">Streak</span></div>
                  </div>
                  {/* View Profile Button */}
                  <div className="flex justify-center w-full -ml-9 mb-1">
                    <button className="border border-gray-400 rounded-lg py-1 text-xs font-semibold hover:bg-gray-100 transition w-3/4" onClick={() => handleViewProfile(user)}>View Full Profile</button>
                  </div>
                  {/* Grinder of the Week Button */}
                  {grinderOfWeekId && top3.some(u => u.id === grinderOfWeekId) && grinderOfWeekId === user.id && (
                    <div className="flex justify-center w-full -ml-9">
                      <span className="w-full max-w-[220px] block text-center whitespace-nowrap bg-gradient-to-r from-yellow-400 to-yellow-600 text-white italic font-semibold text-base px-2 py-1 rounded-2xl" style={{fontStyle: 'italic', fontWeight: 500}}>Grinder of the Week</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Coaches leaderboard rendering
        <>
          <div className="flex flex-row justify-center items-start gap-8 mb-8">
            {/* #1 Coach - left side */}
            {top3[0] && (
              <div className="relative bg-white shadow-lg rounded-3xl flex flex-col items-center text-center h-[470px] p-4" style={{minWidth: '430px', width: '430px'}}>
                {/* Country code (first 3 letters, italic, top right) */}
                <div className="absolute top-2 right-4 text-gray-400 text-sm italic font-semibold tracking-widest">{(top3[0].country || '').slice(0,3).toUpperCase()}</div>
                {/* Profile Pic + Medal (top center) */}
                <div className="relative mb-1 mt-1 flex justify-center w-full">
                  <img
                    src={top3[0].profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(top3[0].name || 'U')}
                    alt={top3[0].name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 shadow mx-auto"
                    style={{ zIndex: 1 }}
                  />
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-7 z-10 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full border border-yellow-400 bg-white flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 flex items-center justify-center text-xs font-bold border border-white">1</span>
                    </div>
                  </div>
                </div>
                {/* Name */}
                <h2 className="text-2xl font-extrabold mb-2 tracking-tight w-full text-center" style={{overflow: 'visible'}}>{top3[0].name}</h2>
                {/* Sport of Expertise */}
                <div className="text-sm text-gray-400 italic font-semibold mb-1 w-full flex justify-center items-center gap-1">
                  <span>{top3[0].sport || 'N/A'}</span>
                </div>
                {/* XP bar */}
                <div className="w-full flex flex-col mb-1">
                  <div className="relative w-full h-1.5 rounded-full bg-gray-200">
                    <div 
                      className="absolute left-0 top-0 h-1.5 rounded-full bg-red-500" 
                      style={{ width: `${getXPProgress(top3[0].xpTotal || 0)}%` }}
                    ></div>
                  </div>
                </div>
                {/* XP bar */}
                <div className="flex flex-col mb-0 ml-4">
                  <div className="relative w-full h-1 rounded-full bg-gray-200 mb-0.5">
                    <div 
                      className="absolute left-0 top-0 h-1 rounded-full bg-red-500" 
                      style={{ width: `${getXPProgress(top3[0].xpTotal || 0)}%` }}
                    ></div>
                  </div>
                </div>
                {/* XP Value */}
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {top3[0].xpTotal?.toLocaleString() || 0} XP
                </div>
                {/* Stats for Coaches (center, stacked) */}
                <div className="flex flex-col gap-2 w-full mt-6 mb-4 items-center text-base">
                  {/* Challenges Created */}
                  <div className="flex items-center gap-2 justify-center text-lg">
                    <span className="text-2xl">📝</span>
                    <span className="font-bold">{top3[0].challengesCreated || 0}</span>
                    <span className="italic font-semibold text-gray-700">Challenges Created</span>
                  </div>
                  {/* Challenges Approved */}
                  <div className="flex items-center gap-2 justify-center text-lg">
                    <span className="text-2xl">✅</span>
                    <span className="font-bold">{top3[0].challengesApproved || 0}</span>
                    <span className="italic font-semibold text-gray-700">Challenges Approved</span>
                  </div>
                </div>
                {/* View Profile Button */}
                <div className="flex flex-col gap-2 items-center mt-0">
                  <button
                    className="w-full max-w-[490px] block border-2 border-gray-300 rounded-2xl py-1.5 text-lg font-semibold italic text-black bg-white hover:bg-gray-50 transition text-center"
                    style={{fontStyle: 'italic', fontWeight: 600, minWidth: '400px', width: '400px'}}
                    onClick={() => handleViewProfile(top3[0])}
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            )}
            {/* #2 and #3 Coaches - right side, stacked */}
            <div className="flex flex-col gap-2.5 w-full max-w-[470px] items-start">
              {[top3[1], top3[2]].filter(Boolean).map((user, idx) => (
                <div key={user.id} className={`relative bg-white shadow-lg rounded-3xl flex flex-row items-stretch h-[230px] w-full p-0`} style={{minWidth: '430px', width: '430px'}}>
                  {/* Profile Pic + Medal (left column) */}
                  <div className="relative flex flex-col items-center justify-start w-[100px] pt-1 pl-2">
                    <img
                      src={user.profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'U')}
                      alt={user.name}
                      className={`w-14 h-14 rounded-full object-cover border-4 ${idx === 0 ? 'border-gray-400' : 'border-orange-400'} shadow`}
                      style={{ zIndex: 1 }}
                    />
                    <div className={`absolute top-1 left-1 w-5 h-5 z-10 flex items-center justify-center`}>
                      <div className={`w-5 h-5 rounded-full border ${idx === 0 ? 'border-gray-400' : 'border-orange-400'} bg-white flex items-center justify-center`}>
                        <span className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' : 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900'} flex items-center justify-center text-[10px] font-bold border border-white`}>{idx + 2}</span>
                      </div>
                    </div>
                  </div>
                  {/* Card Content (right column) */}
                  <div className="flex-1 flex flex-col justify-start pl-2 pr-4 py-1">
                    {/* Country code (top right) */}
                    <div className="absolute top-2 right-4 text-gray-400 text-xs italic font-semibold tracking-widest">{(user.country || '').slice(0,3).toUpperCase()}</div>
                    {/* Name */}
                    <h2 className="text-lg font-extrabold mb-0 tracking-tight text-left ml-6">{user.name}</h2>
                    {/* Info line */}
                    <div className="text-xs text-gray-400 italic font-semibold mb-0.5 text-left ml-6">
                      {user.sport || 'N/A'}
                    </div>
                    {/* XP bar */}
                    <div className="flex flex-col mb-0 ml-4">
                      <div className="relative w-full h-1 rounded-full bg-gray-200 mb-0.5">
                        <div 
                          className="absolute left-0 top-0 h-1 rounded-full bg-red-500" 
                          style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                    {/* XP Value */}
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {user.xpTotal?.toLocaleString() || 0} XP
                    </div>
                    {/* Stats for Coaches */}
                    <div className="flex flex-col gap-0.5 w-full mb-0.5 text-xs items-center -ml-9">
                      <div className="flex items-center gap-1 justify-center"><span className="text-sm">📝</span> <span className="font-bold">{user.challengesCreated || 0}</span> <span className="font-bold italic">Created</span></div>
                      <div className="flex items-center gap-1 justify-center"><span className="text-sm">✅</span> <span className="font-bold">{user.challengesApproved || 0}</span> <span className="font-bold italic">Approved</span></div>
                    </div>
                    {/* View Profile Button */}
                    <div className="flex justify-center w-full -ml-9 mb-1">
                      <button className="border border-gray-400 rounded-lg py-1 text-xs font-semibold hover:bg-gray-100 transition w-3/4" onClick={() => handleViewProfile(user)}>View Full Profile</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Filter Section - moved below top 3 coaches */}
          <div className="mb-8">
            {/* Main Filter Bar */}
            <div className="flex flex-wrap gap-4 mb-4 justify-center items-center">
              {/* Sort Options - Different for athletes vs coaches */}
              <div className="flex gap-2">
                <select
                  className="px-4 py-2 rounded-lg shadow font-semibold text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="xpTotal">Experience Points</option>
                  <option value="challengesCreated">Challenges Created</option>
                  <option value="challengesApproved">Challenges Approved</option>
                </select>
                <button
                  className={`px-3 py-2 rounded-lg shadow font-semibold text-sm border transition ${
                    sortOrder === 'DESC' 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                  onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
                >
                  {sortOrder === 'DESC' ? '↓' : '↑'}
                </button>
              </div>
              {/* Country Filter for Coaches - Next to filter button */}
              <select
                className="px-4 py-2 rounded-lg shadow font-semibold text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {/* Coaches Leaderboard List (4th and below) */}
          <div className="bg-transparent p-0 flex flex-col">
            {rest.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No coaches found matching your filters.</p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                {rest.map((user, idx) => {
                  // Calculate challenge bar width (relative to max in rest)
                  const maxChallenges = Math.max(...rest.map(u => u.challengesSubmitted || 0), 1);
                  const challengePercent = Math.min((user.challengesSubmitted || 0) / maxChallenges * 100, 100);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center bg-white rounded-2xl shadow-md mb-4 px-6 py-2 relative w-full h-24"
                      style={{ width: '900px', maxWidth: '900px' }}
                    >
                      {/* Rank Circle */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold text-lg absolute -left-4 top-1/2 -translate-y-1/2 shadow-sm border border-gray-100">
                        {idx + 4}
                      </div>
                      {/* Profile Picture */}
                      <img
                        src={user.profilePictureUrl || '/default-avatar.png'}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow mr-4 ml-6"
                      />
                      {/* Main Info */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="font-bold text-xl truncate" style={{maxWidth: 180}}>{user.name}</div>
                        <div className="flex flex-row flex-wrap gap-2 text-gray-500 text-sm mt-1">
                          <span>{user.sport || 'N/A'}</span>
                        </div>
                        {/* XP bar */}
                        <div className="flex flex-col mt-2">
                          <div className="relative w-full h-2 rounded-full bg-gray-200">
                            <div
                              className="absolute left-0 top-0 h-2 rounded-full bg-red-500"
                              style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {user.xpTotal?.toLocaleString() || 0} XP
                          </div>
                        </div>
                      </div>
                      {/* Challenges Section for Coaches */}
                      <div className="flex flex-col items-end justify-center min-w-[120px] ml-4">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">📝</span>
                            <span className="font-bold text-lg text-gray-700">{user.challengesCreated || 0}</span>
                            <span className="text-xs text-gray-500">Created</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">✅</span>
                            <span className="font-bold text-lg text-gray-700">{user.challengesApproved || 0}</span>
                            <span className="text-xs text-gray-500">Approved</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add margin below top 3 to push filter buttons and leaderboard down */}
      <div className="mb-8"></div>

      {/* Filter Section */}
      {activeTab === 'athletes' && (
        <div className="mb-8">
          {/* Main Filter Bar */}
          <div className="flex flex-wrap gap-4 mb-4 justify-center items-center">
            {/* Time Range - Only for athletes */}
            {activeTab === 'athletes' && (
              <div className="flex gap-2">
                {timeRanges.map((t) => (
                  <button
                    key={t.value}
                    className={`px-4 py-2 rounded-lg shadow font-semibold text-sm transition border ${
                      timeRange === t.value 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                    onClick={() => setTimeRange(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sport Filter - Only for athletes */}
            {activeTab === 'athletes' && (
              <select
                className="px-4 py-2 rounded-lg shadow font-semibold text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                value={sport}
                onChange={e => setSport(e.target.value)}
              >
                {sports.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {/* Sort Options - Different for athletes vs coaches */}
            <div className="flex gap-2">
              <select
                className="px-4 py-2 rounded-lg shadow font-semibold text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                className={`px-3 py-2 rounded-lg shadow font-semibold text-sm border transition ${
                  sortOrder === 'DESC' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
              >
                {sortOrder === 'DESC' ? '↓' : '↑'}
              </button>
            </div>

            {/* Advanced Filters Toggle - Only show if there are advanced filters available */}
            {activeTab === 'athletes' && (
              <button
                className={`px-4 py-2 rounded-lg shadow font-semibold text-sm border transition ${
                  showFilters 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide Filters' : 'Advanced Filters'}
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Position Filter - Only for athletes */}
                {activeTab === 'athletes' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                    >
                      {positions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}

                {/* Age Range - Only for athletes */}
                {activeTab === 'athletes' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age Range</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Min Age"
                        className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                        value={ageMin}
                        onChange={e => setAgeMin(e.target.value)}
                        min="0"
                        max="100"
                      />
                      <input
                        type="number"
                        placeholder="Max Age"
                        className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                        value={ageMax}
                        onChange={e => setAgeMax(e.target.value)}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                )}

                {/* Country Filter - Only for athletes in advanced panel */}
                {activeTab === 'athletes' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                    >
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Filter Status */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                {filtersApplied && (
                  <div className="text-sm text-green-600 font-medium mb-2">
                    ✓ Advanced filters applied
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {activeTab === 'athletes' && position !== 'All Positions' && `Position: ${position}`}
                  {activeTab === 'athletes' && (ageMin || ageMax) && ` | Age: ${ageMin || '0'}-${ageMax || '100'}`}
                  {country !== 'All Countries' && ` | Country: ${country}`}
                </div>
              </div>

              {/* Filter Action Buttons */}
              <div className="mt-6 flex justify-center gap-4">
                <button
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                  onClick={applyFilters}
                >
                  Apply Filters
                </button>
                <button
                  className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Athletes Leaderboard List (4th and below) */}
      {activeTab === 'athletes' && (
        <div className="bg-transparent p-0 flex flex-col">
          {rest.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No users found matching your filters.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {rest.map((user, idx) => {
                // Calculate challenge bar width (relative to max in rest)
                const maxChallenges = Math.max(...rest.map(u => u.challengesSubmitted || 0), 1);
                const challengePercent = Math.min((user.challengesSubmitted || 0) / maxChallenges * 100, 100);
                return (
                  <div
                    key={user.id}
                    className="flex items-center bg-white rounded-2xl shadow-md mb-4 px-6 py-2 relative w-full h-20"
                    style={{ width: '900px', maxWidth: '900px' }}
                  >
                    {/* Rank Circle */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold text-lg absolute -left-4 top-1/2 -translate-y-1/2 shadow-sm border border-gray-100">
                      {idx + 4}
                    </div>
                    {/* Profile Picture */}
                    <img
                      src={user.profilePictureUrl || '/default-avatar.png'}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow mr-4 ml-6"
                    />
                    {/* Main Info + Height/Weight */}
                    <div className="flex flex-1 items-center min-w-0">
                      {/* Name and Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xl truncate">{user.name}</div>
                        <div className="flex flex-row flex-wrap gap-2 text-gray-500 text-sm mt-1">
                          <span>Age: {calculateAge(user.dateOfBirth)}</span>
                          <span>• {user.position}</span>
                          <span>• {(user.country || '').slice(0,3).toUpperCase()}</span>
                          <span>• Level {getLevelFromXP(user.xpTotal || 0)}</span>
                        </div>
                      </div>
                      {/* Height/Weight stacked */}
                      <div className="flex flex-col items-end justify-center ml-8 text-gray-500 text-xs min-w-[120px]">
                        <span>Height: {user.height ? formatHeight(user.height) : '--'}</span>
                        <span>Weight: {user.weight ? formatWeight(user.weight) : '--'}</span>
                      </div>
                    </div>
                    {/* Challenges Section */}
                    <div className="flex flex-col items-end justify-center min-w-[150px] ml-4">
                      <span className="font-bold text-lg text-gray-700">{user.challengesSubmitted || 0} Challenges</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 relative">
                        <div
                          className="absolute left-0 top-0 h-2 rounded-full bg-red-500"
                          style={{ width: `${challengePercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;