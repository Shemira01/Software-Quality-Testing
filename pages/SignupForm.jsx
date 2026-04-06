import React from 'react';
import SignupFormCard from '../components/SignupForm';
import { auth, db } from '../firebaseConfig'; // Your config file
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import '../App.css'; // Importing the CSS for styling

function SignupForm({ onNavigate }) {
  
  const handleSignupSubmit = async (formData) => {
    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      // 2. Store extra details in Realtime Database
      // We use the unique 'uid' from Auth to link the database record
      await set(ref(db, 'users/' + user.uid), {
        fullName: formData.name,
        email: formData.email,
        phoneNumber: formData.phone,
        joinedAt: new Date().toISOString(),
        // Initialize sensor defaults for the Dashboard later
        vitals: {
          heartRate: 75,
          temperature: 36.6,
          status: "Normal"
        }
      });

      // 3. HCI: Clear Feedback to the user
      alert("Account is Successfully created");
      
      // 4. Redirect to Login as requested
      onNavigate('login');

    } catch (error) {
      // SQA: Handle common errors (e.g. email already exists)
      console.error("Signup Error:", error.code);
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered. Please login.");
      } else {
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <h2>Create Account</h2>
        <p>Join the health tracking community</p>
        <SignupFormCard 
          onSubmit={handleSignupSubmit} 
          onGoToLogin={() => onNavigate('login')} 
        />
      </div>
    </div>
  );
}

export default SignupForm;
