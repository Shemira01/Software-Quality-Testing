import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignupForm({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Create the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else if (data.user) {
      // 2. Create their Profile in our custom table
      await supabase.from('profiles').insert([
        { id: data.user.id, name: name, role: 'patient' }
      ]);
      alert("Signup successful! You can now log in.");
      onNavigate('login');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <h2>Create an Account</h2>
        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p className="auth-link">Already have an account? <span onClick={() => onNavigate('login')} style={{cursor: 'pointer'}}>Log In</span></p>
      </div>
    </div>
  );
}

export default SignupForm;