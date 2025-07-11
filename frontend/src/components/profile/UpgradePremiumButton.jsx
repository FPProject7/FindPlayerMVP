// frontend/src/components/profile/UpgradePremiumButton.jsx
import { useAuthStore } from '../../stores/useAuthStore';
import { useState } from 'react';
import { updateUserStatus } from '../../api/userApi';

const UpgradePremiumButton = ({ profile }) => {
  const { user } = useAuthStore();
  // Use profile prop if provided, otherwise fallback to user from store
  const premiumSource = profile || user;
  const isPremium = premiumSource?.isPremiumMember || premiumSource?.is_premium_member;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updateUserStatus({ is_premium_member: true });
      window.location.reload(); // Refresh to update UI and badge
    } catch (err) {
      setError('Failed to upgrade. Please try again.');
      console.error('Premium upgrade error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center my-4">
      <button
        className={`w-full max-w-xl rounded-full px-12 py-3 font-semibold shadow-md transition-colors duration-150 text-lg
          ${isPremium ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed' : 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'}
        `}
        onClick={handleUpgrade}
        disabled={isPremium || isLoading}
      >
        {isLoading
          ? 'Upgrading...'
          : isPremium
            ? 'Premium Active'
            : 'Upgrade to Premium'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
  
export default UpgradePremiumButton;