import React, { useState } from 'react';

function LoginFormCard({ onSubmit, onGoToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass the local state back to the Page component
    onSubmit(email, password);
  };

  return (
    <div className="login-card-form">
      <form onSubmit={handleSubmit}>
        
        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <input 
            type="email" 
            id="email"
            placeholder="example@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password"
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>

        <button type="submit" className="login-btn">
          Login
        </button>

        <p className="auth-link">
          Don't have an account? 
          <span 
            onClick={onGoToSignup} 
            className="link-span"
            style={{ cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
          >
            Create one
          </span>
        </p>
      </form>
    </div>
  );
}

export default LoginFormCard;
