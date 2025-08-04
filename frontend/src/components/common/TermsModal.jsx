import React from 'react';
import './TermsModal.css';

function TermsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="terms-modal-overlay" onClick={onClose}>
      <div className="terms-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="terms-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ef4444"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="terms-modal-body">
          <h1>FindPlayer – Terms of Service</h1>
          <p className="effective-date">Effective Date: July 25, 2025</p>

          <p>
            Welcome to FindPlayer. These Terms of Service ("Terms") govern your access to and use of the FindPlayer mobile application and website ("Platform"), operated by FindPlayer, Inc. ("FindPlayer", "we", "our", or "us"). By accessing or using any part of the Platform, you agree to be bound by these Terms and our Privacy Policy.
          </p>

          <p>
            If you do not agree to these Terms, you may not access or use the Platform.
          </p>

          <h2>Quick Summary</h2>
          <p>
            By using FindPlayer, you agree to follow our rules, respect other users, and accept that this platform is built around merit-based exposure. We collect limited data to power your experience and do not sell personal information. These terms outline user conduct, content rights, AI features, and dispute resolution.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 13 years old (or the minimum legal age in your country) to create an account or use the Platform. If you are under 18, you must have consent from a parent or legal guardian. By registering, you confirm that you meet these requirements.
          </p>

          <h2>2. User Roles</h2>
          <p>
            You may use the Platform in one of the following roles:
          </p>
          <ul>
            <li><strong>Athlete</strong> – Complete challenges, track performance, and gain exposure.</li>
            <li><strong>Coach</strong> – Create and approve skill challenges to help athletes grow.</li>
            <li><strong>Scout</strong> – Discover talent and evaluate athletes using analytics and filters.</li>
          </ul>

          <h2>3. Code of Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Post or share harmful, illegal, discriminatory, or misleading content.</li>
            <li>Impersonate any person or misrepresent your identity.</li>
            <li>Use the Platform to harass, spam, or promote unauthorized services.</li>
            <li>Attempt to disrupt, hack, or damage the Platform.</li>
            <li>Use bots or scripts to manipulate rankings or content.</li>
          </ul>

          <h2>4. Content Ownership & License</h2>
          <p>
            You retain full ownership of all content you upload to the Platform, including videos, images, posts, and comments ("User Content").
          </p>
          <p>
            By uploading content, you grant FindPlayer a non-exclusive, royalty-free, global license to:
          </p>
          <ul>
            <li>Host and display your content within the Platform;</li>
            <li>Use it in FindPlayer promotional materials, FP TV, and events;</li>
            <li>Analyze and use it (anonymously or aggregated) to train and improve our AI systems like FP Coach AI.</li>
          </ul>
          <p>
            We do not sell your content to third parties.
          </p>

          <h2>5. Subscriptions and Payments</h2>
          <p>
            Currently, all features are available for free for all users, including athletes, coaches, and scouts. Subscriptions, booking fees, or other paid features may be introduced in the future. All payments, once made, are non-refundable unless required by law. Changes to pricing or access will be communicated in advance.
          </p>

          <h2>6. Data Collection & Privacy</h2>
          <p>
            We collect only the data required to provide and improve the Platform, including:
          </p>
          <ul>
            <li>Personal details (name, email, age, sport);</li>
            <li>Content uploads (videos, photos);</li>
            <li>Performance data (challenge completions, leaderboard stats);</li>
            <li>Device and usage info;</li>
            <li>Location data (for event features);</li>
            <li>Messages sent within the app.</li>
          </ul>
          <p>
            We do not sell your data. Your data is securely stored and used in accordance with our Privacy Policy. You may request account or data deletion at any time via support@findplayer.app.
          </p>

          <h2>7. Store and Events</h2>
          <ul>
            <li>Users can purchase official merchandise through the FindPlayer Store for personal use.</li>
            <li>Athletes may qualify for in-person events based on leaderboard performance or coach approvals.</li>
            <li>Participation in offline events may be subject to eligibility, waiver signing, and availability.</li>
            <li>FindPlayer is not liable for any incidents or injuries occurring during third-party or offline events.</li>
          </ul>

          <h2>8. Account Suspension & Termination</h2>
          <p>We may suspend or terminate your account if you:</p>
          <ul>
            <li>Violate these Terms or the Privacy Policy;</li>
            <li>Engage in fraudulent behavior or mislead other users;</li>
            <li>Submit manipulated or plagiarized performance data.</li>
          </ul>
          <p>
            You may delete your account at any time. Once deleted, access and data may be permanently removed.
          </p>

          <h2>9. AI-Powered Features</h2>
          <p>
            FindPlayer includes AI systems (like FP Coach AI) that help assess videos, approve challenges, and recommend exposure. These tools assist coaches and scouts but do not guarantee recruitment, scholarships, or performance outcomes. Content may be used to train our AI in a privacy-compliant and anonymized way.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, FindPlayer is not liable for:</p>
          <ul>
            <li>Indirect or incidental damages;</li>
            <li>Third-party decisions (e.g., coach approvals, scout selections);</li>
            <li>Loss of content, data breaches, or service interruptions;</li>
            <li>Outcomes of in-person events or connections made via the Platform.</li>
          </ul>
          <p>You use the Platform at your own risk.</p>

          <h2>11. Beta Disclaimer</h2>
          <p>
            Some features may be in beta or under development. We appreciate user feedback and patience as we improve the Platform.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to update or revise these Terms. If changes are material, we will notify you in-app or by email. Continued use of the Platform means acceptance of any changes.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware, USA, where FindPlayer is incorporated. Legal disputes shall be resolved in the courts of Delaware.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            For any questions, contact us at:
          </p>
          <div className="contact-info">
            <p><strong>FindPlayer, Inc.</strong></p>
            <p>📧 support@findplayer.app</p>
            <p>🏢 1111B S Governors Ave STE 34796, Dover, DE 19904</p>
          </div>

          <p className="terms-footer">
            By creating an account or using the Platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TermsModal; 