// frontend/src/components/profile/UpgradePremiumButton.jsx
import { useAuthStore } from '../../stores/useAuthStore';

const UpgradePremiumButton = () => {
  const { user } = useAuthStore();
  const isPremium = user?.isPremiumMember;

  // Don't show the button if user is already premium
  if (isPremium) {
    return null;
  }

  return (
    <div className="flex justify-center my-4">
      <button
        className="w-full max-w-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-full px-12 py-3 font-semibold shadow-md transition-colors duration-150 text-lg"
        disabled
      >
        Upgrade to Premium
      </button>
    </div>
  );
};
  
export default UpgradePremiumButton;