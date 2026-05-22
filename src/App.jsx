import React from 'react'
import { AuthProvider } from './context/AuthContext';
import CreateInvoice from './pages/CreateInvoice';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';



axios.defaults.baseURL = 'https://backend-billing-two.vercel.app';


const App = () => {
  return (
    <div>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  )
}

export default App
