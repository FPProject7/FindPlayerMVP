// frontend/src/pages/LeaderboardPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  { label: 'Coach Approvals', value: 'coachApprovals' },
  { label: 'Challenges Created', value: 'challengesCreated' },
  { label: 'Challenges Approved', value: 'challengesApproved' }
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
  // Add more as needed
};
const getCountryAcronym = (country) => {
  if (!country) return '';
  return countryAcronyms[country] || country.slice(0, 3).toUpperCase();
};

// Position abbreviations for football and basketball
const positionAbbreviations = {
  // Football/Soccer
  'Goalkeeper': 'GK',
  'Left Back': 'LB',
  'Right Back': 'RB',
  'Center Back': 'CB',
  'Central Defensive Midfielder': 'CDM',
  'Defensive Midfielder': 'CDM', // fallback
  'Central Midfielder': 'CM',
  'Center Midfielder': 'CM', // fallback
  'Attacking Midfielder': 'AM',
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Striker': 'ST',
  'Second Striker': 'ST',
  // Basketball
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

// Helper to shorten names: 'Cristiano Ronaldo' -> 'C. Ronaldo'
function getShortName(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

// Add helper for last name
function getLastName(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
}

// SVG icon for checkmark in a circle
function CheckCircleIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12.5 11 15.5 16 9.5" />
    </svg>
  );
}

// SVG icon for user (person)
function UserIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

// SVG icon for leaderboard check (used for challenge submissions)
function LeaderboardCheckIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17L4 12" />
    </svg>
  );
}

// Create a dedicated athleteSortOptions array for the athlete leaderboard, excluding 'Challenges Created' and 'Challenges Approved', and add 'Gender'.
const athleteSortOptions = [
  { label: 'Experience Points', value: 'xpTotal' },
  { label: 'Height', value: 'height' },
  { label: 'Challenges Submitted', value: 'challengesSubmitted' },
  { label: 'Coach Approvals', value: 'coachApprovals' }
];

const LeaderboardPage = () => {
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
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [grinderOfWeekId, setGrinderOfWeekId] = useState(null);
  const [activeTab, setActiveTab] = useState('athletes'); // 'athletes' or 'coaches'
  const [gender, setGender] = useState('Male');
  const [offset, setOffset] = useState(3);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();
  const navigate = useNavigate();

  // Debounced fetch function
  const debouncedFetch = useCallback(
    (() => {
      let timeoutId;
      return (filters) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchTopThree(filters);
          fetchRest(filters, false, 3);
        }, 500); // 500ms delay
      };
    })(),
    []
  );

  // Apply filters function
  const applyFilters = () => {
    setOffset(3); // Reset offset when applying new filters
    const genderFormatted = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
    const filters = {
      timeFrame: timeRange,
      sport: sport === 'All Sports' ? undefined : sport,
      position: position === 'All Positions' ? undefined : position,
      ageMin: ageMin || undefined,
      ageMax: ageMax || undefined,
      country: country === 'All Countries' ? undefined : country,
      sortBy,
      sortOrder,
      role: activeTab === 'coaches' ? 'coach' : 'athlete',
      ...(activeTab === 'athletes' ? { gender: genderFormatted } : {})
    };
    setFiltersApplied(true);
    fetchTopThree(filters);
    fetchRest(filters, false, 3);
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
    fetchTopThree({ ...(activeTab === 'athletes' ? { gender } : {}) });
    fetchRest({ ...(activeTab === 'athletes' ? { gender } : {}) }, false, 3);
  };

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

  // Fetch top 3 and rest separately
  const fetchTopThree = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLeaderboard({ ...filters, limit: 3, offset: 0 });
      setTopThreeUsers(response.data.users || []);
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
      // Prevent fetching if already at 50 users
      if (topThreeUsers.length + restUsers.length >= 50) {
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const response = await getLeaderboard({ ...filters, limit, offset: offsetToUse });
      let newUsers = response.data.users || [];
      // Only allow up to 50 users total
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

  // Load more users (for infinite scroll)
  const loadMore = () => {
    setLoadingMore(true);
    setOffset(prev => {
      const newOffset = prev + 5;
      fetchRest(getCurrentFilters(), true, newOffset);
      return newOffset;
    });
  };

  // Helper to get current filters
  const getCurrentFilters = () => ({
    timeFrame: timeRange,
    sport: sport === 'All Sports' ? undefined : sport,
    position: position === 'All Positions' ? undefined : position,
    ageMin: ageMin || undefined,
    ageMax: ageMax || undefined,
    country: country === 'All Countries' ? undefined : country,
    sortBy,
    sortOrder,
    role: activeTab === 'coaches' ? 'coach' : 'athlete',
    ...(activeTab === 'athletes' ? { gender } : {})
  });

  useEffect(() => {
    setOffset(3);
    setHasMore(true);
    // Only fetch on tab, gender, sport, timeRange, sort, sortOrder changes
    fetchTopThree(getCurrentFilters());
    fetchRest(getCurrentFilters(), false, 3);

    // Fetch Grinder of the Week (athletes only)
    if (activeTab === 'athletes') {
      getLeaderboard({ timeFrame: 'week', sortBy: 'xpTotal', sortOrder: 'DESC', limit: 1, role: 'athlete', gender })
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
  // Remove position, country, ageMin, ageMax from dependencies
  }, [timeRange, sport, sortBy, sortOrder, activeTab, gender]);

  // Fetch leaderboard for coaches when country changes
  useEffect(() => {
    if (activeTab === 'coaches') {
      setOffset(3);
      setHasMore(true);
      fetchTopThree(getCurrentFilters());
      fetchRest(getCurrentFilters(), false, 3);
    }
  }, [country, activeTab]);

  const formatHeight = (height) => {
    if (!height) return 'N/A';
    const feet = Math.floor(height / 12);
    const inches = height % 12;
    return `${feet}'${inches}"`;
  };
  const formatWeight = (weight) => {
    if (!weight) return 'N/A';
    return `${weight} lbs`;
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
        <button
          onClick={() => {
            fetchTopThree(getCurrentFilters());
            fetchRest(getCurrentFilters(), false, 3);
          }}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  const top3 = topThreeUsers;
  const rest = restUsers;

  return (
    <div className="w-full px-0 sm:px-0">
      {/* Header */}
      <h1 className="text-5xl font-extrabold text-center text-red-600 mb-2 tracking-tight">LEADERBOARD</h1>
      <h2 className="text-2xl font-semibold text-center text-gray-400 mb-2 tracking-wide">#BeHEARD</h2>
      {/* Athlete/Coach Tabs */}
      <div className="flex justify-center mb-2 sm:mb-8 gap-4">
        <button
          className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full font-bold text-sm sm:text-lg transition border-2 ${activeTab === 'athletes' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('athletes')}
        >
          Athletes
        </button>
        <button
          className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-full font-bold text-sm sm:text-lg transition border-2 ${activeTab === 'coaches' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('coaches')}
        >
          Coaches
        </button>
      </div>
      {/* Gender buttons always visible above top 3 cards */}
      {activeTab === 'athletes' && (
        <div className="flex justify-center w-full mb-2 mt-4">
          <div className="flex gap-2">
            <button
              className={`px-2 py-1 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-base transition border-2 ${gender === 'Male' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setGender('Male')}
            >
              Male
            </button>
            <button
              className={`px-2 py-1 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-base transition border-2 ${gender === 'Female' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setGender('Female')}
            >
              Female
            </button>
          </div>
        </div>
      )}
      {activeTab === 'athletes' || activeTab === 'coaches' ? (
        <>
          {top3.length === 0 ? (
            <div className="p-8 text-center text-gray-500 w-full">
              <p>No users found matching your filters.</p>
            </div>
          ) : (
            <div className="flex flex-row justify-center items-stretch gap-2 sm:gap-8 sm:max-w-5xl mx-auto w-full h-[300px] sm:h-[420px] sm:-ml-7">
              {/* Card 1 */}
              <div className="bg-white rounded-3xl shadow-lg w-[180px] sm:w-[320px] h-full flex flex-col items-center text-center relative p-2 sm:p-4 gap-y-2 sm:gap-y-4 overflow-hidden mb-0">
                {/* Country code (top right, above name) */}
                <div className="absolute top-1 sm:top-2 right-2 sm:right-4 text-gray-400 text-xs sm:text-lg italic font-semibold tracking-widest z-20">{getCountryAcronym(top3[0]?.country)}</div>
                {/* Profile Pic + Medal (top center) */}
                <div className="flex justify-center w-full -mb-4 mt-2 sm:mt-4">
                  <div className="relative w-12 h-12 sm:w-20 sm:h-20">
                    {top3[0]?.profilePictureUrl ? (
                      <img
                        src={top3[0].profilePictureUrl}
                        alt={top3[0].name}
                        className="w-12 h-12 sm:w-20 sm:h-20 rounded-full object-cover border-2 sm:border-4"
                        style={{ borderColor: '#D4AF37' }}
                        onClick={() => handleViewProfile(top3[0])}
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-extrabold text-lg sm:text-3xl mr-2"
                        style={{ border: '2px solid #D4AF37', borderWidth: '2px', borderColor: '#D4AF37' }}>
                        {top3[0]?.name ? top3[0].name.charAt(0) : 'U'}
                      </div>
                    )}
                    {/* Gold rank badge, top left, overlapping border */}
                    <div className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 bg-yellow-400 rounded-full flex items-center justify-center z-30 shadow -translate-x-1/3 -translate-y-1/3"
                      style={{ backgroundColor: '#D4AF37' }}>
                      <span className="text-white font-bold text-xs sm:text-sm">1</span>
                    </div>
                  </div>
                </div>
                {/* Name */}
                <h2
                  className="font-extrabold text-base sm:text-xl mt-2 sm:mt-0 mb-0 tracking-tight w-full text-center cursor-pointer hover:underline truncate"
                  style={{overflow: 'visible'}}
                  onClick={() => handleViewProfile(top3[0])}
                >
                  {getShortName(top3[0]?.name)}
                </h2>
                {/* Info Row: Age, Level, Position or Sport */}
                <div className="flex justify-center items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 italic font-semibold mt-1 sm:mt-0 mb-1">
                  {activeTab === 'athletes' ? (
                    <>
                      <span>Age: {calculateAge(top3[0]?.dateOfBirth)}</span>
                      <span>•</span>
                      <span>Level {getLevelFromXP(top3[0]?.xpTotal)}</span>
                      <span>•</span>
                      <span>{getPositionAbbreviation(top3[0]?.position) || 'N/A'}</span>
                    </>
                  ) : (
                    <>
                      <span>{top3[0]?.sport || 'N/A'}</span>
                      <span>•</span>
                      <span>Level {getLevelFromXP(top3[0]?.xpTotal)}</span>
                    </>
                  )}
                </div>
                {/* XP bar */}
                <div className="w-full mt-1 sm:mt-0 mb-1">
                  <div className="relative w-full h-1.5 sm:h-2.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-1.5 sm:h-2.5 rounded-full bg-red-500"
                      style={{ width: `${getXPProgress(top3[0]?.xpTotal || 0)}%` }}
                    ></div>
                  </div>
                </div>
                {/* Height/Weight Row */}
                {activeTab === 'athletes' && (
                  <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0">
                    <span>Height: {top3[0]?.height ? formatHeight(top3[0].height) : '--'}</span>
                    <span>Weight: {top3[0]?.weight ? formatWeight(top3[0].weight) : '--'}</span>
                  </div>
                )}
                {/* Stats (center, stacked) - Only show what we have, placeholders for missing */}
                <div className="flex flex-col gap-1 sm:gap-2 w-full -mt-2 sm:-mt-2 mb-2 sm:mb-4 items-center text-xs sm:text-lg">
                  {activeTab === 'athletes' ? (
                    <>
                      {/* Challenges - Use API data */}
                      <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                        <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                        <span className="font-bold">{top3[0]?.challengesSubmitted || 0}</span>
                        <span className="italic font-semibold text-gray-700 truncate">Challenges</span>
                      </div>
                      {/* Approvals - Use API data */}
                      <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                        <UserIcon className="text-[10px] sm:text-xs" size={13} />
                        <span className="font-bold">{top3[0]?.coachApprovals || 0}</span>
                        <span className="italic font-semibold text-gray-700 truncate">Approvals</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Challenges Created */}
                      <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                        <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                        <span className="font-bold">{top3[0]?.challengesCreated || 0}</span>
                        <span className="italic font-semibold text-gray-700 truncate">Created</span>
                      </div>
                      {/* Challenges Approved */}
                      <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                        <UserIcon className="text-[10px] sm:text-xs" size={13} />
                        <span className="font-bold">{top3[0]?.challengesApproved || 0}</span>
                        <span className="italic font-semibold text-gray-700 truncate">Approved</span>
                      </div>
                    </>
                  )}
                </div>
                {/* Grinder of the Week (athletes only) */}
                {activeTab === 'athletes' && (
                  <div className="flex flex-col gap-1 sm:gap-2 items-center -mt-4 sm:-mt-5">
                    {grinderOfWeekId && top3.some(u => u.id === grinderOfWeekId) && grinderOfWeekId === top3[0]?.id && (
                      <span className="w-full max-w-xs block text-center whitespace-nowrap bg-gradient-to-r from-yellow-400 to-yellow-600 text-white italic font-semibold text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 rounded-2xl mt-1 sm:mt-2 truncate" style={{fontStyle: 'italic', fontWeight: 500, minWidth: '40px', width: '100%'}}>Grinder of the Week</span>
                    )}
                  </div>
                )}
              </div>
              {/* Cards 2 & 3 stacked vertically */}
              <div className="grid grid-rows-2 w-[140px] sm:w-[260px] gap-2 sm:gap-4 h-full">
                {/* Card 2 (top) */}
                {top3[1] && (
                  <div className="bg-white rounded-3xl shadow-lg w-full flex flex-col h-full p-2 sm:p-4 flex-shrink min-w-0 relative">
                    <div>
                      {/* Country code (top right, above name) */}
                      <div className="absolute top-1 sm:top-2 right-2 sm:right-4 text-gray-400 text-xs sm:text-lg italic font-semibold tracking-widest z-20">{getCountryAcronym(top3[1].country)}</div>
                      {/* Profile Pic + Name Row */}
                      <div className="flex flex-row items-center w-full mb-1 sm:mb-2 mt-1 sm:mt-2">
                        <div className="relative w-7 h-7 sm:w-12 sm:h-12 flex-shrink-0">
                          {top3[1].profilePictureUrl ? (
                            <img
                              src={top3[1].profilePictureUrl}
                              alt={top3[1].name}
                              className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-400 shadow cursor-pointer`}
                              onClick={() => handleViewProfile(top3[1])}
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs sm:text-lg"
                              style={{ border: `2px solid #A0A0A0` }}>
                              {top3[1].name ? top3[1].name.charAt(0) : 'U'}
                            </div>
                          )}
                          {/* Medal - Silver for card 2 */}
                          <div className="absolute top-0 left-0 w-3 h-3 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-30 shadow -translate-x-1/3 -translate-y-1/3 bg-gradient-to-br from-gray-300 to-gray-400">
                            <span className="text-white font-bold text-[10px] sm:text-xs">2</span>
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 ml-2">
                          <h2
                            className="font-extrabold text-base sm:text-xl mb-0 sm:mb-1 tracking-tight text-left cursor-pointer hover:underline truncate mt-2"
                            onClick={() => handleViewProfile(top3[1])}
                          >
                            {getShortName(top3[1]?.name)}
                          </h2>
                          {/* Info Row: Age, Level, Position or Sport */}
                          <div className="flex flex-row flex-wrap items-center gap-0.5 text-[9px] sm:text-base text-gray-400 italic font-semibold mb-0.5 sm:mb-1">
                            {activeTab === 'athletes' ? (
                              <>
                                <span>Age: {calculateAge(top3[1].dateOfBirth)}</span>
                                <span>•</span>
                                <span>Level {getLevelFromXP(top3[1].xpTotal)}</span>
                                <span>•</span>
                                <span>{getPositionAbbreviation(top3[1].position) || 'N/A'}</span>
                              </>
                            ) : (
                              <>
                                <span>{top3[1]?.sport || 'N/A'}</span>
                                <span>•</span>
                                <span>Level {getLevelFromXP(top3[1]?.xpTotal)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* XP bar */}
                      <div className="relative w-full h-1 sm:h-2 rounded-full bg-gray-200 mb-0">
                        <div
                          className="absolute left-0 top-0 h-1 sm:h-2 rounded-full bg-red-500"
                          style={{ width: `${getXPProgress(top3[1].xpTotal || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0">
                      {activeTab === 'athletes' && <>
                        <span>Height: {top3[1].height ? formatHeight(top3[1].height) : '--'}</span>
                        <span>Weight: {top3[1].weight ? formatWeight(top3[1].weight) : '--'}</span>
                      </>}
                    </div>
                    {/* Stats (challenges, approvals or created/approved) */}
                    <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-[8px] sm:text-xs">
                      {activeTab === 'athletes' ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                            <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                            <span className="font-bold">{top3[1].challengesCreated || 0}</span>
                            <span className="italic font-semibold text-gray-700 truncate">Created</span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                            <UserIcon className="text-[10px] sm:text-xs" size={13} />
                            <span className="font-bold">{top3[1].challengesApproved || 0}</span>
                            <span className="italic font-semibold text-gray-700 truncate">Approved</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* Card 3 (bottom) */}
                {top3[2] && (
                  <div className="bg-white rounded-3xl shadow-lg w-full flex flex-col h-full p-2 sm:p-4 flex-shrink min-w-0 relative">
                    <div>
                      {/* Country code (top right, above name) */}
                      <div className="absolute top-1 sm:top-2 right-2 sm:right-4 text-gray-400 text-xs sm:text-lg italic font-semibold tracking-widest z-20">{getCountryAcronym(top3[2].country)}</div>
                      {/* Profile Pic + Name Row */}
                      <div className="flex flex-row items-center w-full mb-1 sm:mb-2 mt-1 sm:mt-2">
                        <div className="relative w-7 h-7 sm:w-12 sm:h-12 flex-shrink-0">
                          {top3[2].profilePictureUrl ? (
                            <img
                              src={top3[2].profilePictureUrl}
                              alt={top3[2].name}
                              className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-orange-400 shadow cursor-pointer`}
                              onClick={() => handleViewProfile(top3[2])}
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs sm:text-lg"
                              style={{ border: `2px solid #FFA500` }}>
                              {top3[2].name ? top3[2].name.charAt(0) : 'U'}
                            </div>
                          )}
                          {/* Medal - Bronze for card 3 */}
                          <div className="absolute top-0 left-0 w-3 h-3 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-30 shadow -translate-x-1/3 -translate-y-1/3 bg-gradient-to-br from-orange-400 to-orange-600">
                            <span className="text-white font-bold text-[10px] sm:text-xs">3</span>
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 ml-2">
                          <h2
                            className="font-extrabold text-base sm:text-xl mb-0 sm:mb-1 tracking-tight text-left cursor-pointer hover:underline truncate mt-2"
                            onClick={() => handleViewProfile(top3[2])}
                          >
                            {getShortName(top3[2]?.name)}
                          </h2>
                          {/* Info Row: Age, Level, Position or Sport */}
                          <div className="flex flex-row flex-wrap items-center gap-0.5 text-[9px] sm:text-base text-gray-400 italic font-semibold mb-0.5 sm:mb-1">
                            {activeTab === 'athletes' ? (
                              <>
                                <span>Age: {calculateAge(top3[2].dateOfBirth)}</span>
                                <span>•</span>
                                <span>Level {getLevelFromXP(top3[2].xpTotal)}</span>
                                <span>•</span>
                                <span>{getPositionAbbreviation(top3[2].position) || 'N/A'}</span>
                              </>
                            ) : (
                              <>
                                <span>{top3[2]?.sport || 'N/A'}</span>
                                <span>•</span>
                                <span>Level {getLevelFromXP(top3[2]?.xpTotal)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* XP bar */}
                      <div className="relative w-full h-1 sm:h-2 rounded-full bg-gray-200 mb-0">
                        <div
                          className="absolute left-0 top-0 h-1 sm:h-2 rounded-full bg-red-500"
                          style={{ width: `${getXPProgress(top3[2].xpTotal || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0">
                      {activeTab === 'athletes' && <>
                        <span>Height: {top3[2].height ? formatHeight(top3[2].height) : '--'}</span>
                        <span>Weight: {top3[2].weight ? formatWeight(top3[2].weight) : '--'}</span>
                      </>}
                    </div>
                    {/* Stats (challenges, approvals or created/approved) */}
                    <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-[8px] sm:text-xs">
                      {activeTab === 'athletes' ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                            <LeaderboardCheckIcon className="text-[10px] sm:text-xs" size={13} />
                            <span className="font-bold">{top3[2].challengesCreated || 0}</span>
                            <span className="italic font-semibold text-gray-700 truncate">Created</span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 justify-center flex-wrap break-words text-[7px] sm:text-xs">
                            <UserIcon className="text-[10px] sm:text-xs" size={13} />
                            <span className="font-bold">{top3[2].challengesApproved || 0}</span>
                            <span className="italic font-semibold text-gray-700 truncate">Approved</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Filter Section */}
      <div className="mt-8 mb-10 w-full overflow-x-hidden">
        {/* Main Filter Bar */}
        <div className="flex flex-row flex-wrap gap-2 sm:gap-4 mb-0 sm:mb-1 justify-center items-center w-full min-w-0 overflow-x-auto sm:-ml-5">
          {/* Time Range - Only for athletes */}
          {activeTab === 'athletes' && (
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
          )}
          {/* Sport Filter - Only for athletes */}
          {activeTab === 'athletes' && (
            <select
              className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
              value={sport}
              onChange={e => setSport(e.target.value)}
            >
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {/* Sort Options - Different for athletes vs coaches */}
          <div className="flex flex-row gap-1 sm:gap-2 min-w-0">
            <select
              className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {(activeTab === 'athletes' ? athleteSortOptions : [
                { label: 'Experience Points', value: 'xpTotal' },
                { label: 'Challenges Created', value: 'challengesCreated' },
                { label: 'Challenges Approved', value: 'challengesApproved' }
              ]).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {/* Advanced Filters Toggle - Only show if there are advanced filters available */}
          {activeTab === 'athletes' && (
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
          )}
          {/* Country Filter for coaches (always visible) */}
          {activeTab === 'coaches' && (
            <select
              className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
              value={country}
              onChange={e => setCountry(e.target.value)}
            >
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        {/* Advanced Filters Panel */}
        {showFilters && activeTab === 'athletes' && (
          <div className="p-1 sm:p-3 mb-2 min-w-0 overflow-x-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 min-w-0">
              {/* Position Filter - Only for athletes */}
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
              {/* Age Range - Only for athletes */}
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
              {/* Country Filter - Only for athletes in advanced panel */}
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
            {/* Apply/Clear Filters Buttons */}
            <div className="flex justify-center mt-2">
              <div className="bg-white rounded-lg shadow-lg px-1 py-0.5 sm:px-2 sm:py-1 flex flex-row gap-2 max-w-fit">
                <button
                  className="px-2 py-1 sm:px-3 sm:py-1 rounded-lg bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition text-xs sm:text-base"
                  onClick={applyFilters}
                >
                  Apply Filters
                </button>
                <button
                  className="px-2 py-1 sm:px-3 sm:py-1 rounded-lg bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition text-xs sm:text-base"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rest of leaderboard cards (4th and above) - now below filter section, for both tabs */}
      {(activeTab === 'athletes' || activeTab === 'coaches') && (
        <div className="w-full flex flex-col gap-2 mt-0 sm:mt-2 pb-24">
          {rest.length === 0 ? (
            <div className="p-8 text-center text-gray-500 w-full">
              <p>No users found matching your filters.</p>
            </div>
          ) : (
            rest.map((user, idx) => {
              const isLast = idx === rest.length - 1;
              return (
                <div
                  key={user.id}
                  ref={isLast ? lastCardRef : null}
                  className="flex flex-row items-center bg-white rounded-2xl shadow-md mb-2 px-3 py-2 relative overflow-hidden w-full sm:w-[500px] min-h-[56px] h-[56px] sm:min-h-[72px] sm:h-[72px]"
                >
                  {/* Rank Number */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center mr-2">
                    <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gray-200 text-gray-500 font-bold text-[10px] sm:text-sm flex items-center justify-center shadow-sm border border-gray-100">
                      {idx + 4}
                    </div>
                  </div>
                  {/* Profile Picture */}
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={user.name}
                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border border-white shadow mr-2 sm:mr-3 cursor-pointer"
                      onClick={() => handleViewProfile(user)}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs sm:text-lg mr-2 sm:mr-3 cursor-pointer"
                      onClick={() => handleViewProfile(user)}
                    >
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                  )}
                  {/* Name and info */}
                  <div className="flex flex-col min-w-0">
                    <div className="font-extrabold text-xs sm:text-base truncate cursor-pointer hover:underline leading-tight" onClick={() => handleViewProfile(user)}>
                      {getLastName(user.name)}
                    </div>
                    {/* Info Row: Age, Level, Position or Sport */}
                    <div className="flex flex-row flex-wrap items-center gap-0.5 text-[8px] sm:text-sm text-gray-400 italic font-semibold mb-0.5 sm:mb-1 leading-tight">
                      {activeTab === 'athletes' ? (
                        <>
                          <span>Age: {calculateAge(user.dateOfBirth)}</span>
                          <span>• {getPositionAbbreviation(user.position) || 'N/A'}</span>
                          <span>• {getCountryAcronym(user.country)}</span>
                          <span>• Lv {getLevelFromXP(user.xpTotal || 0)}</span>
                        </>
                      ) : (
                        <>
                          <span>{user.sport || 'N/A'}</span>
                          <span>• {getCountryAcronym(user.country)}</span>
                          <span>• Lv {getLevelFromXP(user.xpTotal || 0)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Right section: stats, XP bar, Height/Weight */}
                  <div className="flex flex-col items-center justify-center h-full ml-auto min-w-[90px]">
                    {activeTab === 'athletes' ? (
                      <div className="flex flex-row items-center mb-0.5">
                        <span className="font-bold text-xs sm:text-base text-gray-900 mr-1 sm:mr-2">{user.challengesSubmitted || 0}</span>
                        <span className="text-gray-700 text-[8px] sm:text-xs font-normal">Challenges</span>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center mb-0.5">
                        <span className="font-bold text-xs sm:text-base text-gray-900 mr-1 sm:mr-2">{user.challengesCreated || 0}</span>
                        <span className="text-gray-700 text-[8px] sm:text-xs font-normal">Created</span>
                        <span className="font-bold text-xs sm:text-base text-gray-900 ml-2 mr-1 sm:mr-2">{user.challengesApproved || 0}</span>
                        <span className="text-gray-700 text-[8px] sm:text-xs font-normal">Approved</span>
                      </div>
                    )}
                    <div className="w-16 sm:w-28 h-1 sm:h-2 bg-gray-200 rounded-full mt-0.5 relative">
                      <div
                        className="absolute left-0 top-0 h-1 sm:h-2 rounded-full bg-red-500"
                        style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-row gap-1 mt-0.5">
                      {activeTab === 'athletes' && <>
                        <div className="text-[8px] sm:text-xs text-gray-600">{user.height ? formatHeight(user.height) : '--'}</div>
                        <div className="text-[8px] sm:text-xs text-gray-600">{user.weight ? formatWeight(user.weight) : '--'}</div>
                      </>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {loadingMore && (
            <div className="flex justify-center py-2 text-gray-400 text-xs">Loading more...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;