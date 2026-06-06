import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import BookReader from './pages/BookReader';
import Chat from './pages/Chat';

import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AuthenticatedLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-ink-950 bg-noise">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Upload />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/books/:id/read"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <BookReader />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/books/:id/chat"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Chat />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-ink-950">
            <div className="text-center">
              <p className="font-serif text-6xl text-amber-500 mb-4">404</p>
              <p className="text-parchment-200/60 mb-6">Page not found</p>
              <a href="/dashboard" className="btn-primary">
                Back to Library
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
