import React, { useState } from 'react';
import ResetPasswordStart from '../../components/layout/Auth/ResetPasswordStart';
import ResetPasswordSetNew from '../../components/layout/Auth/ResetPasswordSetNew';

function ResetPasswordPage() {
  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState('');

  const handleContinueToSetNewPassword = (email) => {
    setUserEmail(email);
    setStep(2);
  };

  const handleGoBackToStart = () => {
    setStep(1);
    setUserEmail('');
  };

  return (
    <div className="reset-password-page-container form-wrapper"> {/* Add wrapper classes for styling */}
      {step === 1 ? (
        <ResetPasswordStart onContinue={handleContinueToSetNewPassword} />
      ) : (
        <ResetPasswordSetNew email={userEmail} onBack={handleGoBackToStart} />
      )}
    </div>
  );
}

export default ResetPasswordPage;