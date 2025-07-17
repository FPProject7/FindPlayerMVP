// frontend/src/pages/ScoutDashboardPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getLeaderboardWithStreak, getMostViewedAthletes } from '../api/userApi';
import { calculateAge, getLevelFromXP, getXPProgress, getXPDetails, formatHeight, formatWeight } from '../utils/levelUtils';
import ChallengeLoader from '../components/common/ChallengeLoader';
import { useNavigate } from 'react-router-dom';
import { createProfileUrl } from '../utils/profileUrlUtils';
import { useAuthStore } from '../stores/useAuthStore';
import './LeaderboardPageSE.css';
import { starPlayer, unstarPlayer, getStarredPlayers } from '../api/starredApi';


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

// Replace FireIcon with FlameIcon using the SVG from assets
function FlameIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FF7300"
        fillRule="evenodd"
        d="M11.1758045,11.5299649 C11.7222481,10.7630248 11.6612694,9.95529555 11.2823626,8.50234466 C10.5329929,5.62882187 10.8313891,4.05382867 13.4147321,2.18916004 L14.6756139,1.27904986 L14.9805807,2.80388386 C15.3046861,4.42441075 15.8369398,5.42670671 17.2035766,7.35464078 C17.2578735,7.43122022 17.2578735,7.43122022 17.3124108,7.50814226 C19.2809754,10.2854144 20,11.9596204 20,15 C20,18.6883517 16.2713564,22 12,22 C7.72840879,22 4,18.6888043 4,15 C4,14.9310531 4.00007066,14.9331427 3.98838852,14.6284506 C3.89803284,12.2718054 4.33380946,10.4273676 6.09706666,8.43586022 C6.46961415,8.0150872 6.8930834,7.61067534 7.36962714,7.22370749 L8.42161802,6.36945926 L8.9276612,7.62657706 C9.30157948,8.55546878 9.73969716,9.28566491 10.2346078,9.82150804 C10.6537848,10.2753538 10.9647401,10.8460665 11.1758045,11.5299649 Z M7.59448531,9.76165711 C6.23711779,11.2947332 5.91440928,12.6606068 5.98692012,14.5518252 C6.00041903,14.9039019 6,14.8915108 6,15 C6,17.5278878 8.78360021,20 12,20 C15.2161368,20 18,17.527472 18,15 C18,12.4582072 17.4317321,11.1350292 15.6807305,8.66469725 C15.6264803,8.58818014 15.6264803,8.58818014 15.5719336,8.51124844 C14.5085442,7.0111098 13.8746802,5.96758691 13.4553336,4.8005211 C12.7704786,5.62117775 12.8107447,6.43738988 13.2176374,7.99765534 C13.9670071,10.8711781 13.6686109,12.4461713 11.0852679,14.31084 L9.61227259,15.3740546 L9.50184911,13.5607848 C9.43129723,12.4022487 9.16906461,11.6155508 8.76539217,11.178492 C8.36656566,10.7466798 8.00646835,10.2411426 7.68355027,9.66278925 C7.65342985,9.69565638 7.62374254,9.72861259 7.59448531,9.76165711 Z"
      />
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

const ScoutDashboardPage = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    // Don't render or fetch anything if not authenticated
    return null;
  }

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
  const [offset, setOffset] = useState(3);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();
  const navigate = useNavigate();
  // 1. Add state for starred users at the top of the component:
  const [starredPlayers, setStarredPlayers] = useState([]); // Array of starred player objects
  const [starredUserIds, setStarredUserIds] = useState([]); // Array of UUIDs
  const [currentStarredPage, setCurrentStarredPage] = useState(0);
  const [starredTouchStart, setStarredTouchStart] = useState(0);
  const [starredTouchEnd, setStarredTouchEnd] = useState(0);
  const [starredSlideOffset, setStarredSlideOffset] = useState(0);
  const [isStarredHovered, setIsStarredHovered] = useState(false);
  const [mostViewedAthlete, setMostViewedAthlete] = useState(null);
  const [grinderViewCount, setGrinderViewCount] = useState(0);
  const [useMetric, setUseMetric] = useState(false);




  // Fetch starred players on mount
  useEffect(() => {
    if (user?.id) {
      getStarredPlayers(user.id)
        .then(res => {
          setStarredPlayers(res.starred || []);
          setStarredUserIds((res.starred || []).map(p => p.athleteId));
        })
        .catch(() => {
          setStarredPlayers([]);
          setStarredUserIds([]);
        });
    }
  }, [user?.id]);

  // 2. Add a handler to toggle star:
  const handleToggleStar = async (athleteId) => {
    if (!user?.id) return;
    if (starredUserIds.includes(athleteId)) {
      // Unstar
      await unstarPlayer(user.id, athleteId);
      setStarredUserIds(prev => prev.filter(id => id !== athleteId));
      setStarredPlayers(prev => prev.filter(p => p.athleteId !== athleteId));
    } else {
      // Star
      await starPlayer(user.id, athleteId);
      // Optionally fetch the full athlete info again, or just add the athleteId
      setStarredUserIds(prev => [...prev, athleteId]);
      // For now, just add a minimal object; ideally, refetch starred players
      const athlete = restUsers.find(u => u.id === athleteId) || topThreeUsers.find(u => u.id === athleteId);
      if (athlete) {
        setStarredPlayers(prev => [...prev, {
          athleteId: athlete.id,
          name: athlete.name,
          email: athlete.email,
          img: athlete.profilePictureUrl
        }]);
      }
    }
  };

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
    const genderFormatted = 'Male'; // Hardcoded for scout dashboard
    const filters = {
      timeFrame: timeRange,
      sport: sport === 'All Sports' ? undefined : sport,
      position: position === 'All Positions' ? undefined : position,
      ageMin: ageMin || undefined,
      ageMax: ageMax || undefined,
      country: country === 'All Countries' ? undefined : country,
      sortBy,
      sortOrder,
      role: 'athlete',
      gender: genderFormatted
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
    fetchTopThree({ role: 'athlete', gender: 'Male' });
    fetchRest({ role: 'athlete', gender: 'Male' }, false, 3);
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
      const response = await getLeaderboardWithStreak({ ...filters, limit: 3, offset: 0 });
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
      // Prevent fetching if already at 50 users
      if (topThreeUsers.length + restUsers.length >= 50) {
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const response = await getLeaderboardWithStreak({ ...filters, limit, offset: offsetToUse });
      let newUsers = response.data.leaderboard || [];
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
    role: 'athlete',
    gender: 'Male'
  });

  useEffect(() => {
    setOffset(3);
    setHasMore(true);
    
    // Make all API calls in parallel for better performance
    const parallelCalls = [
      fetchTopThree(getCurrentFilters()),
      fetchRest(getCurrentFilters(), false, 3)
    ];

    // Fetch Grinder of the Week (athletes only) in parallel
    parallelCalls.push(
      getLeaderboardWithStreak({ timeFrame: 'week', sortBy: 'xpTotal', sortOrder: 'DESC', limit: 1, role: 'athlete', gender: 'Male' })
        .then(res => {
          if (res.data && res.data.leaderboard && res.data.leaderboard.length > 0) {
            setGrinderOfWeekId(res.data.leaderboard[0].id);
          } else {
            setGrinderOfWeekId(null);
          }
        })
        .catch(() => setGrinderOfWeekId(null))
    );
    
    // Fetch Most Viewed Athlete of the Week in parallel
    parallelCalls.push(
      getMostViewedAthletes()
        .then(res => {
          if (res.data && res.data.data && res.data.data.mostViewedAthletes && res.data.data.mostViewedAthletes.length > 0) {
            const athlete = res.data.data.mostViewedAthletes[0];
            setMostViewedAthlete(athlete);
          } else {
            setMostViewedAthlete(null);
          }
          
          // Set grinder view count
          const grinderCount = res.data?.data?.grinderViewCount || 0;
          setGrinderViewCount(grinderCount);
        })
        .catch((error) => {
          console.error('Error fetching most viewed athletes:', error);
          setMostViewedAthlete(null);
        })
    );
    
    // Wait for all parallel calls to complete
    Promise.all(parallelCalls).catch(error => {
      console.error('Error in parallel scout dashboard calls:', error);
    });
    
  // Remove position, country, ageMin, ageMax from dependencies
  }, [timeRange, sport, sortBy, sortOrder]);

  // Fetch leaderboard for coaches when country changes
  useEffect(() => {
    // This effect is no longer needed as we are only showing athletes
    // if (activeTab === 'coaches') {
    //   setOffset(3);
    //   setHasMore(true);
    //   fetchTopThree(getCurrentFilters());
    //   fetchRest(getCurrentFilters(), false, 3);
    // }
  }, [country]);

  // Handler for viewing full profile
  const handleViewProfile = (user) => {
    if (user && user.name) {
      navigate(createProfileUrl(user.name));
    }
  };

  // Starred players pagination functions
  const handleStarredTouchStart = (e) => {
    setStarredTouchStart(e.targetTouches[0].clientX);
    setStarredSlideOffset(0);
  };

  const handleStarredTouchMove = (e) => {
    const currentX = e.targetTouches[0].clientX;
    const distance = starredTouchStart - currentX;
    const containerWidth = 300; // Approximate container width
    
    // Calculate slide offset based on touch distance with smooth animation
    // Content slides behind the container edges
    const offset = Math.max(-containerWidth * 0.2, Math.min(containerWidth * 0.2, distance * 0.6));
    setStarredSlideOffset(offset);
    setStarredTouchEnd(currentX);
  };

  const handleStarredTouchEnd = () => {
    if (!starredTouchStart || !starredTouchEnd) return;
    
    const distance = starredTouchStart - starredTouchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    const totalPages = Math.ceil(starredPlayers.length / 2);
    
    if (isLeftSwipe && currentStarredPage < totalPages - 1) {
      setCurrentStarredPage(prev => prev + 1);
    } else if (isRightSwipe && currentStarredPage > 0) {
      setCurrentStarredPage(prev => prev - 1);
    }
    
    // Reset slide offset with smooth animation
    setStarredSlideOffset(0);
  };

  const handleStarredPageChange = (direction) => {
    const totalPages = Math.ceil(starredPlayers.length / 2);
    
    if (direction === 'next' && currentStarredPage < totalPages - 1) {
      setCurrentStarredPage(prev => prev + 1);
    } else if (direction === 'prev' && currentStarredPage > 0) {
      setCurrentStarredPage(prev => prev - 1);
    }
  };

  // Get current page of starred players (2 per page)
  const getCurrentStarredPlayers = () => {
    const startIndex = currentStarredPage * 2;
    return starredPlayers.slice(startIndex, startIndex + 2);
  };

  const totalStarredPages = Math.ceil(starredPlayers.length / 2);

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
      {/* Imperial/Metric Toggle */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className={!useMetric ? 'text-gray-700 font-medium' : ''}>Imperial</span>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '50px',
            height: '24px'
          }}>
            <input 
              type="checkbox" 
              checked={useMetric} 
              onChange={() => setUseMetric(!useMetric)}
              style={{
                opacity: 0,
                width: 0,
                height: 0
              }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: useMetric ? '#FF0505' : '#ccc',
              transition: '.4s',
              borderRadius: '24px'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: useMetric ? '26px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                transition: '.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
          <span className={useMetric ? 'text-gray-700 font-medium' : ''}>Metric</span>
        </div>
      </div>
      {/* Centered Starred Players Section */}
      <div className="flex justify-center w-full mb-6 sm:max-w-5xl mx-auto sm:-ml-7">
        <div className="bg-white border border-gray-200 rounded-3xl h-[190px] sm:h-[210px] w-[360px] sm:w-[664px] flex flex-col p-4 relative">
          <div className="flex flex-row justify-between items-start w-full mb-2">
            {/* Left: Starred Players + star icon */}
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-gray-800">Starred Players</span>
              {/* Star icon */}
              <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
            </div>
            {/* Removed Filter by button */}
          </div>
          {/* Paginated starred players list */}
          <div 
            className="flex-1 overflow-hidden relative group"
            onTouchStart={handleStarredTouchStart}
            onTouchMove={handleStarredTouchMove}
            onTouchEnd={handleStarredTouchEnd}
            onMouseEnter={() => setIsStarredHovered(true)}
            onMouseLeave={() => setIsStarredHovered(false)}
          >
            {starredPlayers.length === 0 ? (
              <div className="text-gray-400 text-sm text-center mt-4">No starred players yet.</div>
            ) : (
              <div 
                className="h-full transition-transform duration-200 ease-out"
                style={{ 
                  transform: `translateX(${starredSlideOffset}px)`
                }}
              >
                {getCurrentStarredPlayers().map(user => (
                  <div key={user.athleteId} className="flex items-center py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50" onClick={() => handleViewProfile(user)}>
                    {/* Profile picture with fallback to initials */}
                    <div className="w-10 h-10 rounded-full mr-3 overflow-hidden flex items-center justify-center">
                      {user.img ? (
                        <img 
                          src={user.img} 
                          alt={user.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full flex items-center justify-center text-gray-500 font-semibold text-sm ${
                          user.img ? 'hidden' : 'flex'
                        }`}
                        style={{ backgroundColor: '#E5E7EB' }}
                      >
                        {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-semibold text-gray-800 truncate hover:underline">{user.name}</span>
                      <span className="text-xs text-gray-500 truncate">{user.email}</span>
                    </div>
                    <button
                      className="ml-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-full whitespace-nowrap"
                      onClick={e => { e.stopPropagation(); navigate(`/messages?conversation=${user.athleteId}`); }}
                    >
                      Message the Talent
                    </button>
                  </div>
                ))}
                
                {/* Pagination dots */}
                {totalStarredPages > 1 && (
                  <div className="flex justify-center items-center mt-2 space-x-1">
                    {Array.from({ length: totalStarredPages }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentStarredPage ? 'bg-red-600' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Arrow buttons - visible on both desktop and mobile */}
            {totalStarredPages > 1 && (
              <>
                {/* Left arrow */}
                {currentStarredPage > 0 && (
                  <button
                    className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center transition-all duration-200 ${
                      isStarredHovered ? 'opacity-100' : 'opacity-600'
                    } hover:bg-gray-50 hover:shadow-lg z-10`}
                    onClick={() => handleStarredPageChange('prev')}
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Right arrow */}
                {currentStarredPage < totalStarredPages - 1 && (
                  <button
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center transition-all duration-200 ${
                      isStarredHovered ? 'opacity-100' : 'opacity-600'
                    } hover:bg-gray-50 hover:shadow-lg z-10`}
                    onClick={() => handleStarredPageChange('next')}
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Restore Most Viewed and Grinder of the Week cards */}
      <div className="flex flex-row justify-center items-stretch gap-2 sm:gap-8 sm:max-w-5xl mx-auto w-full sm:-ml-7 mb-6">
        {/* Most Viewed Athlete this Week */}
        <div className="bg-white border border-gray-200 rounded-3xl w-[180px] sm:w-[320px] h-[300px] sm:h-[340px] flex flex-col items-center pt-4 px-2">
          <div className="w-full text-center text-xs sm:text-base font-bold text-gray-700 mb-3 sm:mb-4">Most Viewed this Week</div>
          {mostViewedAthlete ? (
            <>
              <div className="flex flex-row items-center w-full justify-start gap-3 px-2 cursor-pointer" onClick={() => handleViewProfile(mostViewedAthlete)}>
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {mostViewedAthlete.profilePictureUrl ? (
                    <img 
                      src={mostViewedAthlete.profilePictureUrl} 
                      alt={mostViewedAthlete.name} 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-full flex items-center justify-center text-gray-500 font-semibold text-lg ${
                      mostViewedAthlete.profilePictureUrl ? 'hidden' : 'flex'
                    }`}
                    style={{ backgroundColor: '#E5E7EB' }}
                  >
                    {mostViewedAthlete.name ? mostViewedAthlete.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                </div>
                <div className="font-semibold text-base sm:text-lg text-gray-900 ml-2 sm:ml-4 truncate hover:underline">{getShortName(mostViewedAthlete.name)}</div>
              </div>
              {/* Info Row: Age, Level, Position */}
              <div className="flex justify-center items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 italic font-semibold mt-2 mb-1 w-full">
                <span>Age: {calculateAge(mostViewedAthlete.dateOfBirth)}</span>
                <span>•</span>
                <span>Level {getLevelFromXP(mostViewedAthlete.xpTotal || 0)}</span>
                <span>•</span>
                <span>{getPositionAbbreviation(mostViewedAthlete.position) || 'N/A'}</span>
              </div>
              {/* XP bar */}
              <div className="w-full mb-1">
                <div className="relative w-full h-1.5 sm:h-2.5 rounded-full bg-gray-200 overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-1.5 sm:h-2.5 rounded-full bg-red-500" 
                    style={{ width: `${getXPProgress(mostViewedAthlete.xpTotal || 0)}%` }}
                  ></div>
                </div>
              </div>
              {/* Height/Weight Row */}
              <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0 px-2">
                <span>Height: {mostViewedAthlete.height ? formatHeight(mostViewedAthlete.height, useMetric) : '--'}</span>
                <span>Weight: {mostViewedAthlete.weight ? formatWeight(mostViewedAthlete.weight, useMetric) : '--'}</span>
              </div>
              {/* Scouts interest row */}
              <div className="flex items-center text-gray-500 text-xs mt-4 w-full justify-center">
                <span className="mr-2" role="img" aria-label="eye">👁️</span>
                <span>{mostViewedAthlete.viewCount || 0} Scouts showed interest in this athlete.</span>
              </div>
              {/* Action buttons */}
              <div className="flex flex-col w-full px-2 mt-4">
                <button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 sm:py-2 rounded-full mb-1.5 sm:mb-2 transition-colors text-xs sm:text-sm"
                  onClick={() => navigate(`/messages?conversation=${mostViewedAthlete.id}`)}
                >
                  Message this Talent
                </button>
                <button 
                  className="w-full border border-gray-300 text-gray-700 font-bold py-1.5 sm:py-2 rounded-full transition-colors text-xs sm:text-sm"
                  onClick={() => handleViewProfile(mostViewedAthlete)}
                >
                  View Full Profile
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold">No Most Viewed Athlete</p>
                <p className="text-xs mt-1">Check back next week!</p>
              </div>
            </div>
          )}
        </div>
        {/* Grinder of the Week */}
        <div className="bg-white border border-gray-200 rounded-3xl w-[180px] sm:w-[320px] h-[300px] sm:h-[340px] flex flex-col items-center pt-4 px-2">
          <div className="w-full text-center text-xs sm:text-base font-bold text-gray-700 mb-3 sm:mb-4">Grinder of the Week</div>
          {grinderOfWeekId && top3.some(u => u.id === grinderOfWeekId) ? (
            (() => {
              const grinder = top3.find(u => u.id === grinderOfWeekId);
              return (
                <>
                  <div className="flex flex-row items-center w-full justify-start gap-3 px-2 cursor-pointer" onClick={() => handleViewProfile(grinder)}>
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {grinder.profilePictureUrl ? (
                        <img 
                          src={grinder.profilePictureUrl} 
                          alt={grinder.name} 
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full flex items-center justify-center text-gray-500 font-semibold text-lg ${
                          grinder.profilePictureUrl ? 'hidden' : 'flex'
                        }`}
                        style={{ backgroundColor: '#E5E7EB' }}
                      >
                        {grinder.name ? grinder.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                    </div>
                    <div className="font-semibold text-base sm:text-lg text-gray-900 ml-2 sm:ml-4 truncate hover:underline">{getShortName(grinder.name)}</div>
                  </div>
                  {/* Info Row: Age, Level, Position */}
                  <div className="flex justify-center items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 italic font-semibold mt-2 mb-1 w-full">
                    <span>Age: {calculateAge(grinder.dateOfBirth)}</span>
                    <span>•</span>
                    <span>Level {getLevelFromXP(grinder.xpTotal || 0)}</span>
                    <span>•</span>
                    <span>{getPositionAbbreviation(grinder.position) || 'N/A'}</span>
                  </div>
                  {/* XP bar */}
                  <div className="w-full mb-1">
                    <div className="relative w-full h-1.5 sm:h-2.5 rounded-full bg-gray-200 overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-1.5 sm:h-2.5 rounded-full bg-red-500" 
                        style={{ width: `${getXPProgress(grinder.xpTotal || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* Height/Weight Row */}
                  <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0 px-2">
                    <span>Height: {grinder.height ? formatHeight(grinder.height, useMetric) : '--'}</span>
                    <span>Weight: {grinder.weight ? formatWeight(grinder.weight, useMetric) : '--'}</span>
                  </div>
                  {/* Scouts interest row */}
                  <div className="flex items-center text-gray-500 text-xs mt-4 w-full justify-center">
                    <span className="mr-2" role="img" aria-label="eye">👁️</span>
                    <span>{grinderViewCount} Scouts showed interest in this athlete.</span>
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-col w-full px-2 mt-4">
                    <button 
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 sm:py-2 rounded-full mb-1.5 sm:mb-2 transition-colors text-xs sm:text-sm"
                      onClick={() => navigate(`/messages?conversation=${grinder.id}`)}
                    >
                      Message this Talent
                    </button>
                    <button 
                      className="w-full border border-gray-300 text-gray-700 font-bold py-1.5 sm:py-2 rounded-full transition-colors text-xs sm:text-sm"
                      onClick={() => handleViewProfile(grinder)}
                    >
                      View Full Profile
                    </button>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold">No Grinder of the Week</p>
                <p className="text-xs mt-1">Check back next week!</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Centered THE LEADERBOARD Heading */}
      <h1 className="text-3xl font-bold text-center text-red-600 mb-2 tracking-tight">THE LEADERBOARD</h1>
      {top3.length === 0 ? (
        <div className="p-8 text-center text-gray-500 w-full">
          <p>No users found matching your filters.</p>
        </div>
      ) : (
        <div className="flex flex-row justify-center items-stretch gap-2 sm:gap-8 sm:max-w-5xl mx-auto w-full h-[300px] sm:h-[420px] sm:-ml-7 mb-16">
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
                <>
                  <span>Age: {calculateAge(top3[0]?.dateOfBirth)}</span>
                  <span>•</span>
                  <span>Level {getLevelFromXP(top3[0]?.xpTotal)}</span>
                  <span>•</span>
                  <span>{getPositionAbbreviation(top3[0]?.position) || 'N/A'}</span>
                </>
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
            <div className="flex justify-between w-full text-gray-500 text-[9px] sm:text-xs font-medium mt-0">
              <span>Height: {top3[0]?.height ? formatHeight(top3[0].height, useMetric) : '--'}</span>
              <span>Weight: {top3[0]?.weight ? formatWeight(top3[0].weight, useMetric) : '--'}</span>
            </div>
            {/* Stats (center, stacked) - Only show what we have, placeholders for missing */}
            <div className="flex flex-col gap-1 sm:gap-2 w-full -mt-2 sm:-mt-2 mb-2 sm:mb-4 items-center text-xs sm:text-lg">
                <>
                  {/* Challenges - Use API data */}
                  <div className="flex items-center gap-1 sm:gap-2 justify-center flex-wrap break-words text-xs sm:text-lg">
                    <LeaderboardCheckIcon className="text-lg sm:text-3xl" size={24} />
                    <span className="font-bold">{top3[0]?.challengesSubmitted || 0}</span>
                    <span className="italic font-semibold text-gray-700 truncate">Challenges</span>
                  </div>
                  {/* Approvals - Use API data */}
                  <div className="flex items-center gap-1 sm:gap-2 justify-center flex-wrap break-words text-xs sm:text-lg">
                    <UserIcon className="text-lg sm:text-3xl" size={24} />
                    <span className="font-bold">{top3[0]?.coachApprovals || 0}</span>
                    <span className="italic font-semibold text-gray-700 truncate">Approvals</span>
                  </div>
                  {/* Streak - Show actual value for top 1 */}
                  <div className="flex items-center gap-1 sm:gap-2 justify-center text-xs sm:text-lg">
                    <FlameIcon className="text-lg sm:text-3xl text-orange-500" size={24} />
                    <span className="font-bold">{top3[0]?.current_streak ?? '--'}</span>
                    <span className="italic font-semibold text-gray-700 truncate">Streak</span>
                  </div>
                </>
            </div>
            {/* Grinder of the Week (athletes only) */}
            <div className="flex flex-col gap-1 sm:gap-2 items-center -mt-4 sm:-mt-8">
              {grinderOfWeekId && top3.some(u => u.id === grinderOfWeekId) && grinderOfWeekId === top3[0]?.id && (
                <span className="w-full max-w-xs block text-center whitespace-nowrap bg-gradient-to-r from-yellow-400 to-yellow-600 text-white italic font-semibold text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 rounded-2xl mt-1 sm:mt-2 truncate" style={{fontStyle: 'italic', fontWeight: 500, minWidth: '40px', width: '100%'}}>Grinder of the Week</span>
              )}
            </div>
          </div>
          {/* Cards 2 & 3 stacked vertically */}
          <div className="grid grid-rows-2 w-[140px] sm:w-[260px] gap-2 sm:gap-4 h-full" style={{ gridTemplateRows: '1fr 1fr' }}>
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
                        <>
                          <span>Age: {calculateAge(top3[1].dateOfBirth)}</span>
                          <span>•</span>
                          <span>Level {getLevelFromXP(top3[1].xpTotal)}</span>
                          <span>•</span>
                          <span>{getPositionAbbreviation(top3[1].position) || 'N/A'}</span>
                        </>
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
                  <span>Height: {top3[1].height ? formatHeight(top3[1].height, useMetric) : '--'}</span>
                  <span>Weight: {top3[1].weight ? formatWeight(top3[1].weight, useMetric) : '--'}</span>
                </div>
                {/* Stats (challenges, approvals or created/approved) */}
                <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-[8px] sm:text-xs se-upsize">
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
                    {/* Streak - Show actual value for top 2 */}
                    <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                      <FlameIcon className="text-xs sm:text-base text-orange-500" size={18} />
                      <span className="font-bold">{top3[1]?.current_streak ?? '--'}</span>
                      <span className="italic font-semibold text-gray-700 truncate">Streak</span>
                    </div>
                  </>
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
                        <>
                          <span>Age: {calculateAge(top3[2].dateOfBirth)}</span>
                          <span>•</span>
                          <span>Level {getLevelFromXP(top3[2].xpTotal)}</span>
                          <span>•</span>
                          <span>{getPositionAbbreviation(top3[2].position) || 'N/A'}</span>
                        </>
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
                  <span>Height: {top3[2].height ? formatHeight(top3[2].height, useMetric) : '--'}</span>
                  <span>Weight: {top3[2].weight ? formatWeight(top3[2].weight, useMetric) : '--'}</span>
                </div>
                {/* Stats (challenges, approvals or created/approved) */}
                <div className="flex flex-col gap-0.5 sm:gap-1 w-full mt-1 items-center text-[8px] sm:text-xs se-upsize">
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
                    {/* Streak - Show actual value for top 3 */}
                    <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                      <FlameIcon className="text-xs sm:text-base text-orange-500" size={18} />
                      <span className="font-bold">{top3[2]?.current_streak ?? '--'}</span>
                      <span className="italic font-semibold text-gray-700 truncate">Streak</span>
                    </div>
                  </>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="mt-8 mb-10 w-full overflow-x-hidden">
        {/* Main Filter Bar */}
        <div className="flex flex-row flex-wrap gap-2 sm:gap-4 mb-0 sm:mb-1 justify-center items-center w-full min-w-0 overflow-x-auto sm:-ml-5">
          {/* Time Range - Only for athletes */}
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
          {/* Sport Filter - Only for athletes */}
          <select
            className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
            value={sport}
            onChange={e => setSport(e.target.value)}
          >
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Sort Options - Different for athletes vs coaches */}
          <div className="flex flex-row gap-1 sm:gap-2 min-w-0">
            <select
              className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow font-semibold text-[10px] sm:text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 truncate min-w-0"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {athleteSortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {/* Advanced Filters Toggle - Only show if there are advanced filters available */}
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
      <div className="w-full flex flex-col gap-2 mt-0 sm:mt-2 pb-24">
        {rest.length === 0 ? (
          <div className="p-8 text-center text-gray-500 w-full">
            <p>No users found matching your filters.</p>
          </div>
        ) : (
          rest.map((user, idx) => {
            const isLast = idx === rest.length - 1;
            const isStarred = starredUserIds.includes(user.id);
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
                  <div className="flex items-center gap-1">
                    <div className="font-extrabold text-xs sm:text-base truncate cursor-pointer hover:underline leading-tight" onClick={() => handleViewProfile(user)}>
                      {getLastName(user.name)}
                    </div>
                    {/* activeTab === 'athletes' && ( */}
                      <div className="flex items-center gap-0.5">
                        <FlameIcon className="text-[8px] sm:text-xs text-orange-500" size={12} />
                        <span className="font-bold text-[8px] sm:text-xs text-gray-900">{user.current_streak ?? '--'}</span>
                      </div>
                    {/* ) */}
                  </div>
                  {/* Info Row: Age, Level, Position or Sport */}
                  <div className="flex flex-row flex-wrap items-center gap-0.5 text-[8px] sm:text-sm text-gray-400 italic font-semibold mb-0.5 sm:mb-1 leading-tight">
                    {/* activeTab === 'athletes' ? ( */}
                      <>
                        <span>Age: {calculateAge(user.dateOfBirth)}</span>
                        <span>• {getPositionAbbreviation(user.position) || 'N/A'}</span>
                        <span>• {getCountryAcronym(user.country)}</span>
                        <span>• Lv {getLevelFromXP(user.xpTotal || 0)}</span>
                      </>
                    {/* ) : ( */}
                      {/* <>
                        <span>{user.sport || 'N/A'}</span>
                        <span>• {getCountryAcronym(user.country)}</span>
                        <span>• Lv {getLevelFromXP(user.xpTotal || 0)}</span>
                      </> */}
                    {/* )} */}
                  </div>
                </div>
                {/* Right section: stats, XP bar, Height/Weight */}
                <div className="flex flex-col items-center justify-center h-full ml-auto min-w-[90px]">
                  {/* activeTab === 'athletes' ? ( */}
                    <div className="flex flex-row items-center mb-0.5">
                      <span className="font-bold text-xs sm:text-base text-gray-900 mr-1 sm:mr-2">{user.challengesSubmitted || 0}</span>
                      <span className="text-gray-700 text-[8px] sm:text-xs font-normal">Challenges</span>
                    </div>
                  {/* ) : ( */}
                    <div className="flex flex-row items-center mb-0.5">
                      
                    </div>
                  {/* ) */}
                  <div className="w-16 sm:w-28 h-1 sm:h-2 bg-gray-200 rounded-full mt-0.5 relative">
                    <div
                      className="absolute left-0 top-0 h-1 sm:h-2 rounded-full bg-red-500"
                      style={{ width: `${getXPProgress(user.xpTotal || 0)}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-row gap-1 mt-0.5">
                    {/* activeTab === 'athletes' && <> */}
                      <div className="text-[8px] sm:text-xs text-gray-600">{user.height ? formatHeight(user.height, useMetric) : '--'}</div>
                      <div className="text-[8px] sm:text-xs text-gray-600">{user.weight ? formatWeight(user.weight, useMetric) : '--'}</div>
                    {/* </> */}
                  </div>
                </div>
                {/* Star button (far right) */}
                <button
                  className="ml-auto flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full hover:bg-gray-100 transition"
                  onClick={() => handleToggleStar(user.id)}
                  aria-label={isStarred ? 'Unstar' : 'Star'}
                >
                  {isStarred ? (
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
                  )}
                </button>
              </div>
            );
          })
        )}
        {loadingMore && (
          <div className="flex justify-center py-2 text-gray-400 text-xs">Loading more...</div>
        )}
      </div>
      
    </div>
  );
};

export default ScoutDashboardPage;
