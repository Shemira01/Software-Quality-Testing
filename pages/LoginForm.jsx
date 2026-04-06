import React from 'react';
import LoginFormCard from '../components/LoginForm';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from "firebase/auth";
import '../App.css'; // Importing the CSS for styling

function LoginForm({ onNavigate }) {
  
  const handleLoginSubmit = async (email, password) => {
    try {
      // 1. Firebase Authentication Call
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Success Feedback
      alert("Login Successful! Welcome back.");
      onNavigate('dashboard');

    } catch (error) {
      // 3. SQA: Specific Error Handling
      console.error("Login Error Code:", error.code);
      
      // Firebase often returns 'auth/invalid-credential' for both wrong email/pass 
      // for security reasons (so hackers don't know which one is right).
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        alert("Invalid Email or Password. Please try again.");
      } else {
        alert("An error occurred: " + error.message);
      }
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <h2>Health Tracker Login</h2>
        <p>Enter your credentials to access your vitals</p>
        
        <LoginFormCard 
          onSubmit={handleLoginSubmit} 
          onGoToSignup={() => onNavigate('signup')} 
        />
      </div>
    </div>
  );
}

export default LoginForm;
