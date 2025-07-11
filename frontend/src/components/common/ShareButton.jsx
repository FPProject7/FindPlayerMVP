import React, { useState } from 'react';
import { FiShare2 } from 'react-icons/fi';

// Toast for share/copy feedback - exact same as profile page
const ShareToast = ({ message }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
    <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
      {message}
    </div>
  </div>
);

const ShareButton = ({ 
  url, 
  title = 'Check this out!', 
  className = '', 
  iconSize = 22, 
  iconColor = "#dc2626"
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleShare = async () => {
    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setToastMsg('Link shared!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1500);
        return;
      } catch (e) {
        // Web Share API failed, continue to fallback
      }
    }

    // Try modern clipboard API
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setToastMsg('Copied to clipboard');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      return;
    } catch (e) {
      console.error('Modern clipboard API failed:', e);
    }

    // Try legacy fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        copied = true;
        setToastMsg('Copied to clipboard');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1500);
        return;
      } else {
        console.error('Legacy execCommand copy failed: execCommand returned false');
      }
    } catch (e) {
      console.error('Legacy execCommand copy failed:', e);
    }

    // If all methods fail
    if (!copied) {
      setToastMsg('Failed to copy');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    }
  };

  return (
    <>
      <button
        className={`p-1 bg-transparent border-none shadow-none hover:bg-gray-100 focus:outline-none ${className}`}
        onClick={handleShare}
        title="Share"
        style={{ boxShadow: 'none' }}
      >
        <FiShare2 size={iconSize} color={iconColor} />
      </button>
      {showToast && <ShareToast message={toastMsg} />}
    </>
  );
};

export default ShareButton; 