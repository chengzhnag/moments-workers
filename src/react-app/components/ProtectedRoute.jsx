import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { SpinLoading } from 'antd-mobile';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  console.log('isAuthenticated🧐', isAuthenticated);
  console.log('loading🧐', loading);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <SpinLoading color='primary' />
        <span style={{ color: '#666' }}>加载中...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute; 