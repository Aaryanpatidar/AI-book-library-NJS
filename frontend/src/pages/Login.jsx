/**
 * pages/Login.jsx
 * Beautiful login form with validation and animated feedback.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: '' }));
    setError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-ink-950">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-ink-800 border-r border-ink-600">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gradient blob */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-jade-500/8 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 py-20">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
              <BookOpen size={20} className="text-ink-950" />
            </div>
            <span className="font-serif text-xl font-bold text-parchment-100">
              AI Book Library
            </span>
          </div>

          <h2 className="font-serif text-4xl font-bold text-parchment-50 mb-4 leading-tight">
            Your books,<br />
            <span className="text-gradient">intelligently answered.</span>
          </h2>
          <p className="text-parchment-200/50 text-lg leading-relaxed max-w-sm">
            Upload PDFs and have natural conversations with your documents using advanced RAG technology.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3">
            {['PDF upload & reader', 'AI-powered Q&A', 'Strict document grounding', 'Full chat history'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-parchment-200/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <BookOpen size={16} className="text-ink-950" />
            </div>
            <span className="font-serif font-bold text-lg text-parchment-100">AI Book Library</span>
          </div>

          <h1 className="font-serif text-3xl font-bold text-parchment-50 mb-1">Welcome back</h1>
          <p className="text-parchment-200/50 text-sm mb-8">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
              Sign up free
            </Link>
          </p>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 bg-crimson-500/10 border border-crimson-500/30 rounded-lg px-4 py-3 mb-6 animate-fade-in">
              <AlertCircle size={16} className="text-crimson-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-crimson-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="label mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-200/30 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`input-base pl-10 ${fieldErrors.email ? 'border-crimson-500 focus:ring-crimson-500/20' : ''}`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-crimson-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-200/30 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input-base pl-10 pr-10 ${fieldErrors.password ? 'border-crimson-500 focus:ring-crimson-500/20' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-parchment-200/30 hover:text-parchment-200/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-crimson-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
