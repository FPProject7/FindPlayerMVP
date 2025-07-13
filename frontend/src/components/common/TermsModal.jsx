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
          <h1>FindPlayer – Terms and Conditions</h1>
          <p className="effective-date">Effective Date: December 2024</p>

          <p>
            Welcome to FindPlayer. These Terms and Conditions ("Terms") govern your access to and use of the FindPlayer mobile application and website ("Platform"), operated by FindPlayer, Inc. ("FindPlayer", "we", "our", or "us"). By accessing or using any part of the Platform, you agree to be bound by these Terms and our Privacy Policy.
          </p>

          <p>
            If you do not agree to these Terms, you may not access or use the Platform.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 13 years old (or the minimum legal age in your country) to create an account or use the Platform. If you are under 18, you must have consent from a parent or legal guardian. By registering, you confirm that you meet these requirements.
          </p>

          <h2>2. User Roles</h2>
          <p>
            You may use the Platform as one of the following user types:
          </p>
          <ul>
            <li><strong>Athlete</strong> – Participate in challenges, showcase your skills, and gain exposure.</li>
            <li><strong>Coach</strong> – Create and approve performance challenges for athletes.</li>
            <li><strong>Scout</strong> – Discover and evaluate talent using advanced filters and analytics.</li>
          </ul>

          <h2>3. Code of Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Post or share any content that is harmful, illegal, discriminatory, or misleading.</li>
            <li>Impersonate others or misrepresent your identity or affiliation.</li>
            <li>Use the Platform for spamming, harassment, or unauthorized promotion.</li>
            <li>Interfere with or attempt to disrupt the integrity or security of the Platform.</li>
            <li>Use automated tools, scripts, or bots to manipulate engagement, rankings, or performance data.</li>
          </ul>

          <h2>4. Content Ownership and License</h2>
          <p>
            You retain all ownership rights to any content you upload, including videos, images, posts, and comments ("User Content").
          </p>
          <p>
            By uploading content to the Platform, you grant FindPlayer a non-exclusive, worldwide, royalty-free license to:
          </p>
          <ul>
            <li>Display, host, and distribute your content within the Platform;</li>
            <li>Use your content in connection with FindPlayer promotional materials, including FP TV and events;</li>
            <li>Use your content, including videos and performance data, to train and improve FindPlayer's AI systems, including but not limited to FP Coach AI, our automated coaching and evaluation system.</li>
          </ul>
          <p>
            We will never sell your content to third parties. All content usage remains within the scope of enhancing the FindPlayer ecosystem.
          </p>

          <h2>5. Subscriptions and Payments</h2>
          <p>
            Some features of the Platform are offered under paid subscription plans. Subscription fees are billed monthly or annually, depending on your selected plan. By subscribing, you agree to pay all associated fees and applicable taxes.
          </p>
          <p>
            All payments are non-refundable, except where required by law. We reserve the right to modify pricing, features, or access with prior notice.
          </p>

          <h2>6. Data Collection and Privacy</h2>
          <p>
            We collect certain personal and performance data to enhance your experience on the Platform. This includes, but is not limited to, profile information, video submissions, engagement metrics, and device data.
          </p>
          <p>
            All data is stored securely and handled in accordance with our Privacy Policy. We do not sell personal data to third parties.
          </p>
          <p>
            For more information, please refer to our Privacy Policy.
          </p>

          <h2>7. Store and Events</h2>
          <p>
            Users may access the FindPlayer Store to purchase branded merchandise and motivational products. Purchases are for personal use only. Fulfillment and shipping are managed through automated logistics systems.
          </p>
          <p>
            Athletes may also qualify for participation in FindPlayer-hosted events based on leaderboard ranking and coach approvals. Participation in offline events is subject to eligibility, availability, and acceptance of additional terms and waivers. FindPlayer is not liable for any injuries or incidents that occur at third-party or in-person events.
          </p>

          <h2>8. Account Suspension and Termination</h2>
          <p>We reserve the right to suspend or terminate your account, without prior notice, if you:</p>
          <ul>
            <li>Violate these Terms or our Privacy Policy;</li>
            <li>Engage in behavior that harms the Platform or its users;</li>
            <li>Submit fraudulent or manipulated content or activity.</li>
          </ul>
          <p>
            You may delete your account at any time. Upon termination, your access to the Platform and any associated data may be permanently removed.
          </p>

          <h2>9. AI-Driven Features</h2>
          <p>
            You acknowledge that the Platform includes AI-powered tools (such as FP Coach AI) which assist in performance evaluation, challenge approvals, and exposure recommendations. These tools are intended to support human users and do not guarantee recruitment outcomes.
          </p>
          <p>
            Content uploaded to the Platform may be used to train and improve these AI systems in a secure, anonymized manner that respects your rights and privacy.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, FindPlayer is not liable for:</p>
          <ul>
            <li>Any indirect, incidental, or consequential damages;</li>
            <li>Decisions made by coaches, scouts, or third parties;</li>
            <li>Outcomes resulting from in-person events, scouting, or coaching evaluations;</li>
            <li>Any interruption, loss, or unauthorized access to user content or data.</li>
          </ul>
          <p>Use of the Platform is at your own risk.</p>

          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify or update these Terms at any time. If changes are material, we will notify you through the Platform or via email. Your continued use of the Platform after the changes become effective constitutes your acceptance of the revised Terms.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of Lebanon and the State of Delaware, USA, where FindPlayer is incorporated. Any disputes shall be resolved in the courts of Beirut, Lebanon or the State of Delaware, depending on the context.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            For support or questions regarding these Terms, please contact us at:
          </p>
          <p className="contact-email">📩 support@findplayer.app</p>

          <p className="terms-footer">
            By creating an account or using the Platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TermsModal; 