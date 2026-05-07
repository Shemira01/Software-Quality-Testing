import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function LoginForm({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      onNavigate('dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <h2>Welcome Back</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="auth-link">Don't have an account? <span onClick={() => onNavigate('signup')} style={{cursor: 'pointer'}}>Sign Up</span></p>
      </div>
    </div>
  );
}

export default LoginForm;