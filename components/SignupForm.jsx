import React, { useState } from 'react';

function SignupFormCard({ onSubmit, onGoToLogin }) {
  // 1. State for all form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // 2. State for UI logic (Terms and Modal)
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // 3. Update state as user types
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // 4. Validation: All fields filled + password length + terms checked
  const isFormValid = 
    formData.name.trim() !== '' && 
    formData.email.includes('@') && 
    formData.phone.length >= 10 && 
    formData.password.length >= 6 && 
    agreed;

  // 5. Social Login Mocks (HCI: Recognition)
  const handleSocialLogin = (platform) => {
    alert(`This would normally redirect to ${platform} authentication.`);
  };

  return (
    <div className="signup-card-form">
      {/* The Form Tag with the logic you requested */}
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        if (isFormValid) {
          onSubmit(formData); 
        }
      }}>
        
        <div className="input-group">
          <label htmlFor="name">Full Name</label>
          <input 
            type="text" 
            name="name" 
            placeholder="John Doe" 
            onChange={handleChange}
            required 
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <input 
            type="email" 
            name="email" 
            placeholder="name@email.com" 
            onChange={handleChange}
            required 
          />
        </div>

        <div className="input-group">
          <label htmlFor="phone">Phone Number</label>
          <input 
            type="tel" 
            name="phone" 
            placeholder="+254 7..." 
            onChange={handleChange}
            required 
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            name="password" 
            placeholder="Min. 6 characters" 
            onChange={handleChange}
            required 
          />
        </div>

        <div className="social-login-separator">
          <span>Or sign up with</span>
        </div>

        <div className="social-icons-container">
          <button type="button" className="social-btn" onClick={() => handleSocialLogin('Google')}>Google</button>
          <button type="button" className="social-btn" onClick={() => handleSocialLogin('Facebook')}>Facebook</button>
          <button type="button" className="social-btn" onClick={() => handleSocialLogin('LinkedIn')}>LinkedIn</button>
        </div>

        <div className="terms-container">
          <input 
            type="checkbox" 
            id="terms" 
            checked={agreed} 
            onChange={() => setAgreed(!agreed)} 
          />
          <label htmlFor="terms"> 
            I agree to the <span onClick={() => setShowTerms(true)} style={{cursor: 'pointer'}}>Terms & Conditions</span>
          </label>
        </div>

        {/* Button is disabled visually and functionally until valid */}
        <button 
          type="submit" 
          className="login-btn" 
          disabled={!isFormValid}
          style={{ 
            backgroundColor: isFormValid ? 'var(--primary-teal)' : '#ccc',
            cursor: isFormValid ? 'pointer' : 'not-allowed'
          }}
        >
          Create Account
        </button>

        <p className="auth-link">
          Already have an account? 
          <span onClick={onGoToLogin} style={{ cursor: 'pointer', marginLeft: '5px' }}>
            Login
          </span>
        </p>
      </form>

      {/* Terms and Conditions Modal Popup */}
      {showTerms && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Terms & Conditions</h2>
            <p>1. <strong>Privacy:</strong> We protect your vitals using Firebase security rules.</p>
            <p>2. <strong>Usage:</strong> This app is for health tracking purposes only.</p>
            <p>3. <strong>Data:</strong> Your data remains yours and can be deleted upon request.</p>
            <button onClick={() => setShowTerms(false)} className="login-btn">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignupFormCard;
