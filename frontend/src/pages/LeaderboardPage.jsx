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
  { label: 'Name', value: 'name' }
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
    // Only auto-fetch for main filters (time range, sport, sort)
    const filters = {
      timeFrame: timeRange,
      sport: sport === 'All Sports' ? undefined : sport,
      sortBy,
      sortOrder
    };
    fetchLeaderboard(filters);
  }, [timeRange, sport, sortBy, sortOrder]);

  useEffect(() => {
    // Initial load
    fetchLeaderboard({});
  }, []);

  const fetchLeaderboard = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Calling leaderboard API with filters:', filters);
      const response = await getLeaderboard(filters);
      console.log('Leaderboard API response:', response);
      console.log('Leaderboard users:', response.data.users);
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
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-5xl font-extrabold text-center text-red-600 mb-2 tracking-tight">LEADERBOARD</h1>
      <h2 className="text-2xl font-semibold text-center text-gray-400 mb-8 tracking-wide">#BeHEARD</h2>

      {/* Top 3 Cards */}
      <div className="flex flex-row justify-center items-start gap-8 mb-8">
        {/* #1 Athlete - left side */}
        {top3[0] && (
          <div className="relative bg-white shadow-lg rounded-3xl flex flex-col items-center text-center h-[480px] min-w-[340px] w-[340px] p-4">
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
              <div className="text-xs text-gray-500 mt-1 text-center">
                Level {getLevelFromXP(top3[0].xpTotal || 0)} • {top3[0].xpTotal?.toLocaleString() || 0} XP
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
              <span className="w-full max-w-[420px] block text-center whitespace-nowrap bg-gradient-to-r from-yellow-400 to-yellow-600 text-white italic font-semibold text-lg px-4 py-2 rounded-2xl" style={{fontStyle: 'italic', fontWeight: 500}}>Grinder of the Week</span>
              <button
                className="w-full max-w-[420px] block border-2 border-gray-300 rounded-2xl py-2 text-lg font-semibold italic text-black bg-white hover:bg-gray-50 transition text-center"
                style={{fontStyle: 'italic', fontWeight: 600}}
                onClick={() => handleViewProfile(top3[0])}
              >
                View Full Profile
              </button>
            </div>
          </div>
        )}
        {/* #2 and #3 - right side, stacked */}
        <div className="flex flex-col gap-2" style={{height: 480, minWidth: 340, width: 340}}>
          {[top3[1], top3[2]].filter(Boolean).map((user, idx) => (
            <div key={user.id} className={`relative bg-white shadow-lg rounded-3xl flex flex-row items-stretch h-[230px] min-w-[340px] w-[340px] p-0`}>
              {/* Profile Pic + Medal (left column) */}
              <div className="relative flex flex-col items-center justify-start w-[100px] pt-2 pl-2">
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
              <div className="flex-1 flex flex-col justify-between pl-2 pr-4 py-2">
                {/* Country code (top right) */}
                <div className="absolute top-2 right-4 text-gray-400 text-xs italic font-semibold tracking-widest">{(user.country || '').slice(0,3).toUpperCase()}</div>
                {/* Name */}
                <h2 className="text-lg font-extrabold mb-1 tracking-tight text-left ml-6">{user.name}</h2>
                {/* Info line */}
                <div className="text-xs text-gray-400 italic font-semibold mb-1 text-left ml-4">
                  Age: {calculateAge(user.dateOfBirth)} <span className="mx-1">•</span> Level {getLevelFromXP(user.xpTotal)} <span className="mx-1">•</span> {user.position || 'N/A'}
                </div>
                {/* XP bar */}
                <div className="flex flex-col mb-1 ml-4">
                  <div className="relative w-full h-1 rounded-full bg-gray-200 mb-1">
                    <div 
                      className="absolute left-0 top-0 h-1 rounded-full bg-red-500" 
                      style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Level {getLevelFromXP(user.xpTotal || 0)} • {user.xpTotal?.toLocaleString() || 0} XP
                  </div>
                </div>
                {/* Height and Weight (stacked, left-aligned, below XP bar) */}
                <div className="flex flex-col text-gray-700 text-xs font-medium mb-1 ml-4">
                  <span>Height: {user.height ? formatHeight(user.height) : '--'}</span>
                  <span>Weight: {user.weight ? formatWeight(user.weight) : '--'}</span>
                </div>
                {/* Stats */}
                <div className="flex flex-col gap-0.5 w-full mb-1 text-xs items-center">
                  <div className="flex items-center gap-1 justify-center"><span className="text-sm">✔️</span> <span className="font-bold">{user.challengesSubmitted || 0}</span> <span className="font-bold italic">Challenges</span></div>
                  <div className="flex items-center gap-1 justify-center"><span className="text-sm">🧑‍🏫</span> <span className="font-bold">{user.coachApprovals || 0}</span> <span className="font-bold italic">Approvals</span></div>
                  <div className="flex items-center gap-1 justify-center"><span className="text-sm">🔥</span> <span className="font-bold">{'--'}</span> <span className="font-bold italic">Streak</span></div>
                </div>
                {/* View Profile Button */}
                <div className="flex justify-center w-full">
                  <button className="border border-gray-400 rounded-lg py-1 text-xs font-semibold hover:bg-gray-100 transition w-3/4" onClick={() => handleViewProfile(user)}>View Full Profile</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add margin below top 3 to push filter buttons and leaderboard down */}
      <div className="mb-8"></div>

      {/* Filter Section */}
      <div className="mb-8">
        {/* Main Filter Bar */}
        <div className="flex flex-wrap gap-4 mb-4 justify-center items-center">
          {/* Time Range */}
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

          {/* Sport Filter */}
          <select
            className="px-4 py-2 rounded-lg shadow font-semibold text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            value={sport}
            onChange={e => setSport(e.target.value)}
          >
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Sort Options */}
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

          {/* Advanced Filters Toggle */}
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
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Position Filter */}
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

              {/* Age Range */}
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

              {/* Country Filter */}
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
            </div>

            {/* Filter Status */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              {filtersApplied && (
                <div className="text-sm text-green-600 font-medium mb-2">
                  ✓ Advanced filters applied
                </div>
              )}
              <div className="text-xs text-gray-500">
                {position !== 'All Positions' && `Position: ${position}`}
                {(ageMin || ageMax) && ` | Age: ${ageMin || '0'}-${ageMax || '100'}`}
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
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    <img
                      src={user.profilePictureUrl || '/default-avatar.png'}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-800 mb-1 md:mb-0">
                        {user.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {user.sport} • {user.position}
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {user.xpTotal?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-gray-600">XP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {user.height ? `${user.height}cm` : '--'}
                        </div>
                        <div className="text-xs text-gray-600">Height</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {user.weight ? `${user.weight}kg` : '--'}
                        </div>
                        <div className="text-xs text-gray-600">Weight</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {calculateAge(user.dateOfBirth)}
                        </div>
                        <div className="text-xs text-gray-600">Age</div>
                      </div>
                    </div>

                    {/* XP Bar and Level */}
                    <div className="mt-3 mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">
                          Level {getLevelFromXP(user.xpTotal || 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getXPProgress(user.xpTotal || 0).toFixed(1)}% to next level
                        </span>
                      </div>
                      <div className="relative w-full h-2 rounded-full bg-gray-200">
                        <div 
                          className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-red-500 to-red-600" 
                          style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Challenge Stats */}
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {user.challengesSubmitted || 0}
                        </div>
                        <div className="text-xs text-gray-600">Challenges</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">
                          {user.coachApprovals || 0}
                        </div>
                        <div className="text-xs text-gray-600">Approvals</div>
                      </div>
                    </div>

                    {/* Country */}
                    {user.country && (
                      <div className="mt-2 text-sm text-gray-600">
                        📍 {user.country}
                      </div>
                    )}

                    {/* View Profile Button */}
                    <div className="mt-3">
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
                        onClick={() => handleViewProfile(user)}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
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