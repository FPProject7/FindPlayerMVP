import React, { useState } from 'react';
import SignUpStart from '../../components/layout/Auth/SignUpStart';
import AthleteSignUpForm from '../../components/layout/Auth/AthleteSignUpForm';
import CoachSignUpForm from '../../components/layout/Auth/CoachSignUpForm';
import ScoutSignUpForm from '../../components/layout/Auth/ScoutSignUpForm';

function SignUpPage() {
  const [role, setRole] = useState(null);

  return (
    <div>
      {!role ? (
        <SignUpStart 
          onSelectRole={setRole}
          onLogin={() => alert('Go to login')}  // replace with actual navigation
        />
      ) : role === 'athlete' ? (
        <AthleteSignUpForm onBack={() => setRole(null)} />
      ) : role === 'coach' ? (
        <CoachSignUpForm onBack={() => setRole(null)} />
      ) : role === 'scout' ? (
        <ScoutSignUpForm onBack={() => setRole(null)} />
      ) : (
        <p>Unknown role selected.</p>
      )}
    </div>
  );
}

export default SignUpPage;
