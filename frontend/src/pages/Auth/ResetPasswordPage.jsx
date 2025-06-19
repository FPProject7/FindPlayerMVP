import React, { useState } from 'react';
import ResetPasswordStart from '../../components/layout/Auth/ResetPasswordStart';
import ResetPasswordSetNew from '../../components/layout/Auth/ResetPasswordSetNew';

function ResetPasswordPage() {
  const [step, setStep] = useState(1);

  return (
    <div>
      {step === 1 ? (
        <ResetPasswordStart onContinue={() => setStep(2)} />
      ) : (
        <ResetPasswordSetNew />
      )}
    </div>
  );
}

export default ResetPasswordPage;
