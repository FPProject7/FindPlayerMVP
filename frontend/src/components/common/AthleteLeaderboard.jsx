import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getLeaderboardWithStreak } from '../../api/userApi';
import { calculateAge, getLevelFromXP, getXPProgress } from '../../utils/levelUtils';
import ChallengeLoader from './ChallengeLoader';
import { useNavigate } from 'react-router-dom';
import { createProfileUrl } from '../../utils/profileUrlUtils';

const medalColors = [
  'from-yellow-400 to-yellow-600 border-yellow-400',
  'from-gray-300 to-gray-400 border-gray-400',
  'from-orange-400 to-orange-600 border-orange-400'
];
const timeRanges = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' }
];
const sports = ['All Sports', 'Football', 'Basketball'];
const footballPositions = [
  'All Positions',
  'Striker', 'Left Winger', 'Right Winger', 'Second Striker',
  'Left Back', 'Right Back', 'Center Back', 'Defensive Midfielder',
  'Center Midfielder', 'Attacking Midfielder', 'Goalkeeper'
];
const basketballPositions = [
  'All Positions',
  'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'
];
const allPositions = [
  'All Positions',
  'Striker', 'Left Winger', 'Right Winger', 'Second Striker',
  'Left Back', 'Right Back', 'Center Back', 'Defensive Midfielder',
  'Center Midfielder', 'Attacking Midfielder', 'Goalkeeper',
  'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'
];
const getPositionsForSport = (sport) => {
  if (sport === 'Football') return footballPositions;
  if (sport === 'Basketball') return basketballPositions;
  return allPositions;
};
const countries = [
  'All Countries',
  ...[
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
  ].sort((a, b) => a.localeCompare(b))
];
const sortOptions = [
  { label: 'Experience Points', value: 'xpTotal' },
  { label: 'Height', value: 'height' },
  { label: 'Challenges Submitted', value: 'challengesSubmitted' },
  { label: 'Coach Approvals', value: 'coachApprovals' }
];
const countryAcronyms = {
  'United Kingdom': 'UK',
  'United States': 'USA',
  'South Korea': 'KOR',
  'North Korea': 'PRK',
  'Ivory Coast': 'CIV',
  'United Arab Emirates': 'UAE',
  'New Zealand': 'NZ',
  'Czech Republic': 'CZE',
  'Saudi Arabia': 'KSA',
  'South Africa': 'RSA',
  'Russia': 'RUS',
  'Egypt': 'EGY',
  'Morocco': 'MAR',
  'Japan': 'JPN',
  'China': 'CHN',
  'Brazil': 'BRA',
  'Argentina': 'ARG',
  'Portugal': 'POR',
  'France': 'FRA',
  'Germany': 'GER',
  'Spain': 'ESP',
  'Italy': 'ITA',
  'Belgium': 'BEL',
  'Netherlands': 'NED',
  'Nigeria': 'NGA',
  'Ghana': 'GHA',
  'Senegal': 'SEN',
  'Cameroon': 'CMR',
  'Turkey': 'TUR',
  'Poland': 'POL',
  'Sweden': 'SWE',
  'Denmark': 'DEN',
  'Finland': 'FIN',
  'Norway': 'NOR',
  'Switzerland': 'SUI',
  'Austria': 'AUT',
  'Greece': 'GRE',
  'Ukraine': 'UKR',
  'Romania': 'ROU',
  'Hungary': 'HUN',
  'Bulgaria': 'BUL',
  'Serbia': 'SRB',
  'Croatia': 'CRO',
  'Slovakia': 'SVK',
  'Slovenia': 'SVN',
  'Ireland': 'IRL',
  'Scotland': 'SCO',
  'Wales': 'WAL',
  'Mexico': 'MEX',
  'Canada': 'CAN',
  'Australia': 'AUS',
};
const getCountryAcronym = (country) => {
  if (!country) return '';
  return countryAcronyms[country] || country.slice(0, 3).toUpperCase();
};
const positionAbbreviations = {
  'Goalkeeper': 'GK',
  'Left Back': 'LB',
  'Right Back': 'RB',
  'Center Back': 'CB',
  'Central Defensive Midfielder': 'CDM',
  'Defensive Midfielder': 'CDM',
  'Central Midfielder': 'CM',
  'Center Midfielder': 'CM',
  'Attacking Midfielder': 'AM',
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Striker': 'ST',
  'Second Striker': 'ST',
  'Point Guard': 'PG',
  'Shooting Guard': 'SG',
  'Small Forward': 'SF',
  'Power Forward': 'PF',
  'Center': 'C',
  'Combo Guard': 'CG',
  'Swingman': 'SW',
  'Stretch Four': 'SF4',
  'Sixth man': '6M',
};
function getPositionAbbreviation(position) {
  if (!position) return 'N/A';
  return positionAbbreviations[position] || position;
}
function getShortName(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}
function getLastName(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
}
function CheckCircleIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="8 12.5 11 15.5 16 9.5" /></svg>
  );
}
function UserIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
  );
}
function LeaderboardCheckIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
  );
}
function FlameIcon({ className = '', size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C12 2 7 7 7 12C7 16.4183 10.5817 20 15 20C19.4183 20 23 16.4183 23 12C23 7 18 2 12 2Z" /><path d="M12 2V12" /></svg>
  );
}

const AthleteLeaderboard = () => {
  const [topThreeUsers, setTopThreeUsers] = useState([]);
  const [restUsers, setRestUsers] = useState([]);
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
  const [offset, setOffset] = useState(3);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();
  const navigate = useNavigate();

  const fetchTopThree = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLeaderboardWithStreak({ ...filters, limit: 3, offset: 0, role: 'athlete' });
      setTopThreeUsers(response.data.leaderboard || []);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchRest = async (filters = {}, append = false, customOffset = undefined) => {
    try {
      if (!append) setLoading(true);
      setError(null);
      const limit = 5;
      const offsetToUse = customOffset !== undefined ? customOffset : offset;
      if (topThreeUsers.length + restUsers.length >= 50) {
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const response = await getLeaderboardWithStreak({ ...filters, limit, offset: offsetToUse, role: 'athlete' });
      let newUsers = response.data.leaderboard || [];
      const remaining = 50 - (topThreeUsers.length + restUsers.length);
      if (newUsers.length > remaining) {
        newUsers = newUsers.slice(0, remaining);
      }
      if (append) {
        setRestUsers(prev => [
          ...prev,
          ...newUsers.filter(newUser => !prev.some(user => user.id === newUser.id))
        ]);
      } else {
        setRestUsers(newUsers);
      }
      setHasMore(newUsers.length === limit && (topThreeUsers.length + restUsers.length) < 50);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      if (!append) setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    setLoadingMore(true);
    setOffset(prev => {
      const newOffset = prev + 5;
      fetchRest(getCurrentFilters(), true, newOffset);
      return newOffset;
    });
  };

  const getCurrentFilters = () => ({
    timeFrame: timeRange,
    sport: sport === 'All Sports' ? undefined : sport,
    position: position === 'All Positions' ? undefined : position,
    ageMin: ageMin || undefined,
    ageMax: ageMax || undefined,
    country: country === 'All Countries' ? undefined : country,
    sortBy,
    sortOrder,
  });

  useEffect(() => {
    setOffset(3);
    setHasMore(true);
    fetchTopThree(getCurrentFilters());
    fetchRest(getCurrentFilters(), false, 3);
  }, [timeRange, sport, position, ageMin, ageMax, country, sortBy, sortOrder]);

  // Infinite scroll: observe the last card
  const lastCardRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  if (loading) return <ChallengeLoader />;
  if (error) return <div className="text-red-500">{error}</div>;

  // Top 3 users layout
  const top3 = topThreeUsers;
  return (
    <div className="w-full flex flex-col items-center">
      {/* Filter Bar */}
      <div className="flex flex-row flex-wrap gap-2 sm:gap-4 mb-4 justify-center items-center w-full min-w-0 overflow-x-auto">
        <div className="flex flex-row gap-1 sm:gap-2 min-w-0">
          {timeRanges.map((t) => (
            <button
              key={t.value}
              className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm transition border truncate min-w-0 ${
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
        <select
          className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
          value={sport}
          onChange={e => setSport(e.target.value)}
        >
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select
          className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
        >
          <option value="DESC">Desc</option>
          <option value="ASC">Asc</option>
        </select>
        <button
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border transition truncate min-w-0 ${
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
        <div className="p-1 sm:p-3 mb-2 min-w-0 overflow-x-auto w-full max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 min-w-0">
            <div>
              <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 truncate">Position</label>
              <select
                className="w-full px-2 sm:px-4 py-1 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-[10px] sm:text-sm truncate min-w-0"
                value={position}
                onChange={e => setPosition(e.target.value)}
              >
                {getPositionsForSport(sport).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 truncate">Age Range</label>
              <div className="flex gap-1 sm:gap-3 min-w-0">
                <input
                  type="number"
                  placeholder="Min Age"
                  className="w-1/2 px-2 sm:px-4 py-1 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-[10px] sm:text-sm truncate min-w-0"
                  value={ageMin}
                  onChange={e => setAgeMin(e.target.value)}
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Max Age"
                  className="w-1/2 px-2 sm:px-4 py-1 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-[10px] sm:text-sm truncate min-w-0"
                  value={ageMax}
                  onChange={e => setAgeMax(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 truncate">Country</label>
              <select
                className="w-full px-2 sm:px-4 py-1 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-[10px] sm:text-sm truncate min-w-0"
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      {/* Top 3 Cards */}
      <div className="flex flex-row justify-center items-end gap-2 sm:gap-8 w-full max-w-4xl mb-6" style={{ alignItems: 'stretch' }}>
        {/* Card 1 (first place, left) */}
        <div className="flex flex-col items-center justify-end h-full" style={{ height: '100%' }}>
          {top3[0] && (
            <div className="bg-white rounded-3xl shadow-lg w-full flex flex-col h-full min-h-[300px] p-2 sm:p-4 flex-shrink min-w-0 relative" style={{ zIndex: 2 }}>
              <div className="absolute top-1 sm:top-2 right-2 sm:right-4 text-gray-400 text-xs sm:text-lg italic font-semibold tracking-widest z-20">{getCountryAcronym(top3[0].country)}</div>
              <div className="flex flex-row items-center w-full mb-1 sm:mb-2 mt-1 sm:mt-2">
                <div className="relative w-10 h-10 sm:w-20 sm:h-20 flex-shrink-0">
                  {top3[0].profilePictureUrl ? (
                    <img
                      src={top3[0].profilePictureUrl}
                      alt={top3[0].name}
                      className={`w-10 h-10 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-yellow-400 shadow cursor-pointer`}
                      onClick={() => navigate(createProfileUrl(top3[0]))}
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg sm:text-3xl" style={{ border: `4px solid #FFD700` }}>{top3[0].name ? top3[0].name.charAt(0) : 'U'}</div>
                  )}
                  <div className="absolute top-0 left-0 w-4 h-4 sm:w-7 sm:h-7 rounded-full flex items-center justify-center z-30 shadow -translate-x-1/3 -translate-y-1/3 bg-gradient-to-br from-yellow-400 to-yellow-600"><span className="text-white font-bold text-xs sm:text-lg">1</span></div>
                </div>
                <div className="flex flex-col flex-1 ml-2">
                  <h2 className="font-extrabold text-lg sm:text-2xl mb-0 sm:mb-1 tracking-tight text-left cursor-pointer hover:underline truncate mt-2" onClick={() => navigate(createProfileUrl(top3[0]))}>{getShortName(top3[0]?.name)}</h2>
                  <div className="flex flex-row flex-wrap items-center gap-0.5 text-[11px] sm:text-lg text-gray-400 italic font-semibold mb-0.5 sm:mb-1">
                    <span>Age: {calculateAge(top3[0].dateOfBirth)}</span>
                    <span>•</span>
                    <span>Level {getLevelFromXP(top3[0].xpTotal)}</span>
                    <span>•</span>
                    <span>{getPositionAbbreviation(top3[0].position) || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-2 sm:h-4 rounded-full bg-gray-200 mb-0">
                <div className="absolute left-0 top-0 h-2 sm:h-4 rounded-full bg-red-500" style={{ width: `${getXPProgress(top3[0].xpTotal || 0)}%` }}></div>
              </div>
              <div className="flex justify-between w-full text-gray-500 text-xs sm:text-base font-medium mt-0">
                <span>Height: {top3[0].height ? top3[0].height : '--'}</span>
                <span>Weight: {top3[0].weight ? top3[0].weight : '--'}</span>
              </div>
              <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-xs sm:text-base se-upsize">
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[10px] sm:text-base">
                  <LeaderboardCheckIcon className="text-[10px] sm:text-base" size={16} />
                  <span className="font-bold">{top3[0].challengesSubmitted || 0}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Challenges</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[10px] sm:text-base">
                  <UserIcon className="text-[10px] sm:text-base" size={16} />
                  <span className="font-bold">{top3[0].coachApprovals || 0}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Approvals</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                  <FlameIcon className="text-base sm:text-2xl text-orange-500" size={22} />
                  <span className="font-bold">{top3[0]?.current_streak ?? '--'}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Streak</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Cards 2 & 3 stacked vertically to the right */}
        <div className="grid grid-rows-2 w-[140px] sm:w-[260px] gap-2 sm:gap-4 h-full min-h-[300px]">
          {/* Card 2 (top) */}
          {top3[1] && (
            <div className="bg-white rounded-3xl shadow-lg w-full flex flex-col h-full min-h-0 p-2 sm:p-4 flex-shrink min-w-0 relative">
              <div className="absolute top-1 sm:top-2 right-2 sm:right-4 text-gray-400 text-xs sm:text-lg italic font-semibold tracking-widest z-20">{getCountryAcronym(top3[1].country)}</div>
              <div className="flex flex-row items-center w-full mb-1 sm:mb-2 mt-1 sm:mt-2">
                <div className="relative w-7 h-7 sm:w-12 sm:h-12 flex-shrink-0">
                  {top3[1].profilePictureUrl ? (
                    <img
                      src={top3[1].profilePictureUrl}
                      alt={top3[1].name}
                      className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-400 shadow cursor-pointer`}
                      onClick={() => navigate(createProfileUrl(top3[1]))}
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs sm:text-lg" style={{ border: `2px solid #A0A0A0` }}>{top3[1].name ? top3[1].name.charAt(0) : 'U'}</div>
                  )}
                  <div className="absolute top-0 left-0 w-3 h-3 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-30 shadow -translate-x-1/3 -translate-y-1/3 bg-gradient-to-br from-gray-300 to-gray-400"><span className="text-white font-bold text-[10px] sm:text-xs">2</span></div>
                </div>
                <div className="flex flex-col flex-1 ml-2">
                  <h2 className="font-extrabold text-base sm:text-xl mb-0 sm:mb-1 tracking-tight text-left cursor-pointer hover:underline truncate mt-2" onClick={() => navigate(createProfileUrl(top3[1]))}>{getShortName(top3[1]?.name)}</h2>
                  <div className="flex flex-row flex-wrap items-center gap-0.5 text-[9px] sm:text-base text-gray-400 italic font-semibold mb-0.5 sm:mb-1">
                    <span>Age: {calculateAge(top3[1].dateOfBirth)}</span>
                    <span>•</span>
                    <span>Level {getLevelFromXP(top3[1].xpTotal)}</span>
                    <span>•</span>
                    <span>{getPositionAbbreviation(top3[1].position) || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-1 sm:h-2 rounded-full bg-gray-200 mb-0">
                <div className="absolute left-0 top-0 h-1 sm:h-2 rounded-full bg-red-500" style={{ width: `${getXPProgress(top3[1].xpTotal || 0)}%` }}></div>
              </div>
              <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0">
                <span>Height: {top3[1].height ? top3[1].height : '--'}</span>
                <span>Weight: {top3[1].weight ? top3[1].weight : '--'}</span>
              </div>
              <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-[8px] sm:text-xs se-upsize">
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                  <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                  <span className="font-bold">{top3[1].challengesSubmitted || 0}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Challenges</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                  <UserIcon className="text-[10px] sm:text-xs" size={13} />
                  <span className="font-bold">{top3[1].coachApprovals || 0}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Approvals</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                  <FlameIcon className="text-xs sm:text-base text-orange-500" size={18} />
                  <span className="font-bold">{top3[1]?.current_streak ?? '--'}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Streak</span>
                </div>
              </div>
            </div>
          )}
          {/* Card 3 (bottom) */}
          {top3[2] && (
            <div className="bg-white rounded-3xl shadow-lg w-full flex flex-col h-full min-h-0 p-2 sm:p-4 flex-shrink min-w-0 relative">
              <div className="absolute top-1 sm:top-2 right-2 sm:right-4 text-gray-400 text-xs sm:text-lg italic font-semibold tracking-widest z-20">{getCountryAcronym(top3[2].country)}</div>
              <div className="flex flex-row items-center w-full mb-1 sm:mb-2 mt-1 sm:mt-2">
                <div className="relative w-7 h-7 sm:w-12 sm:h-12 flex-shrink-0">
                  {top3[2].profilePictureUrl ? (
                    <img
                      src={top3[2].profilePictureUrl}
                      alt={top3[2].name}
                      className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-orange-400 shadow cursor-pointer`}
                      onClick={() => navigate(createProfileUrl(top3[2]))}
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs sm:text-lg" style={{ border: `2px solid #FFA500` }}>{top3[2].name ? top3[2].name.charAt(0) : 'U'}</div>
                  )}
                  <div className="absolute top-0 left-0 w-3 h-3 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-30 shadow -translate-x-1/3 -translate-y-1/3 bg-gradient-to-br from-orange-400 to-orange-600"><span className="text-white font-bold text-[10px] sm:text-xs">3</span></div>
                </div>
                <div className="flex flex-col flex-1 ml-2">
                  <h2 className="font-extrabold text-base sm:text-xl mb-0 sm:mb-1 tracking-tight text-left cursor-pointer hover:underline truncate mt-2" onClick={() => navigate(createProfileUrl(top3[2]))}>{getShortName(top3[2]?.name)}</h2>
                  <div className="flex flex-row flex-wrap items-center gap-0.5 text-[9px] sm:text-base text-gray-400 italic font-semibold mb-0.5 sm:mb-1">
                    <span>Age: {calculateAge(top3[2].dateOfBirth)}</span>
                    <span>•</span>
                    <span>Level {getLevelFromXP(top3[2].xpTotal)}</span>
                    <span>•</span>
                    <span>{getPositionAbbreviation(top3[2].position) || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-1 sm:h-2 rounded-full bg-gray-200 mb-0">
                <div className="absolute left-0 top-0 h-1 sm:h-2 rounded-full bg-red-500" style={{ width: `${getXPProgress(top3[2].xpTotal || 0)}%` }}></div>
              </div>
              <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0">
                <span>Height: {top3[2].height ? top3[2].height : '--'}</span>
                <span>Weight: {top3[2].weight ? top3[2].weight : '--'}</span>
              </div>
              <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-[8px] sm:text-xs se-upsize">
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                  <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                  <span className="font-bold">{top3[2].challengesSubmitted || 0}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Challenges</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                  <UserIcon className="text-[10px] sm:text-xs" size={13} />
                  <span className="font-bold">{top3[2].coachApprovals || 0}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Approvals</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                  <FlameIcon className="text-xs sm:text-base text-orange-500" size={18} />
                  <span className="font-bold">{top3[2]?.current_streak ?? '--'}</span>
                  <span className="italic font-semibold text-gray-700 truncate">Streak</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Rest of leaderboard cards (4th and above) */}
      <div className="w-full flex flex-col gap-2 mt-0 sm:mt-2 pb-24 max-w-2xl">
        {restUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 w-full">
            <p>No users found matching your filters.</p>
          </div>
        ) : (
          restUsers.map((user, idx) => {
            const isLast = idx === restUsers.length - 1;
            return (
              <div
                key={user.id}
                ref={isLast ? lastCardRef : null}
                className="flex flex-row items-center bg-white rounded-2xl shadow-md mb-2 px-3 py-2 relative overflow-hidden w-full min-h-[56px] h-[56px] sm:min-h-[72px] sm:h-[72px]"
              >
                <div className="flex-shrink-0 flex flex-col items-center justify-center mr-2">
                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gray-200 text-gray-500 font-bold text-[10px] sm:text-sm flex items-center justify-center shadow-sm border border-gray-100">
                    {idx + 4}
                  </div>
                </div>
                <div className="relative w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0">
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={user.name}
                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-300 shadow cursor-pointer"
                      onClick={() => navigate(createProfileUrl(user))}
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-base sm:text-xl" style={{ border: `2px solid #CCC` }}>{user.name ? user.name.charAt(0) : 'U'}</div>
                  )}
                </div>
                <div className="flex flex-col flex-1 ml-2 min-w-0">
                  <h2 className="font-extrabold text-xs sm:text-lg mb-0 sm:mb-1 tracking-tight text-left cursor-pointer hover:underline truncate" onClick={() => navigate(createProfileUrl(user))}>{getShortName(user?.name)}</h2>
                  <div className="flex flex-row flex-wrap items-center gap-0.5 text-[8px] sm:text-xs text-gray-400 italic font-semibold mb-0.5 sm:mb-1">
                    <span>Age: {calculateAge(user.dateOfBirth)}</span>
                    <span>•</span>
                    <span>Level {getLevelFromXP(user.xpTotal)}</span>
                    <span>•</span>
                    <span>{getPositionAbbreviation(user.position) || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 sm:gap-1 items-end text-[7px] sm:text-xs">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                    <span className="font-bold">{user.challengesSubmitted || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <UserIcon className="text-[10px] sm:text-xs" size={13} />
                    <span className="font-bold">{user.coachApprovals || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <FlameIcon className="text-xs sm:text-base text-orange-500" size={18} />
                    <span className="font-bold">{user?.current_streak ?? '--'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {!hasMore && <div className="text-xs text-gray-400 mt-2">End of leaderboard</div>}
      </div>
    </div>
  );
};

export default AthleteLeaderboard; 