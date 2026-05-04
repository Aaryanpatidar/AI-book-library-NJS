/**
 * pages/Signup.jsx
 * Registration form with password strength meter and inline validation.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

const STRENGTH_CONFIG = [
  { label: 'Very weak', color: 'bg-crimson-500' },
  { label: 'Weak',      color: 'bg-orange-500'  },
  { label: 'Fair',      color: 'bg-amber-500'   },
  { label: 'Strong',    color: 'bg-jade-500'    },
];

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    setError('');
    try {
      await register(form.name.trim(), form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password ? getPasswordStrength(form.password) : -1;
  const strengthConf = strength >= 0 ? STRENGTH_CONFIG[Math.min(strength, 3)] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <BookOpen size={18} className="text-ink-950" />
          </div>
          <span className="font-serif font-bold text-xl text-parchment-100">AI Book Library</span>
        </div>

        <h1 className="font-serif text-3xl font-bold text-parchment-50 mb-1">Create account</h1>
        <p className="text-parchment-200/50 text-sm mb-8">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Sign in
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
          {/* Name */}
          <div>
            <label className="label mb-1.5 block">Full name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-200/30 pointer-events-none" />
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className={`input-base pl-10 ${fieldErrors.name ? 'border-crimson-500 focus:ring-crimson-500/20' : ''}`}
              />
            </div>
            {fieldErrors.name && <p className="mt-1.5 text-xs text-crimson-400">{fieldErrors.name}</p>}
          </div>

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
            {fieldErrors.email && <p className="mt-1.5 text-xs text-crimson-400">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="label mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-200/30 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
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
            {fieldErrors.password && <p className="mt-1.5 text-xs text-crimson-400">{fieldErrors.password}</p>}

            {/* Password strength bar */}
            {form.password && strengthConf && (
              <div className="mt-2.5 animate-fade-in">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength ? strengthConf.color : 'bg-ink-600'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-parchment-200/40">{strengthConf.label}</p>
              </div>
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
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-parchment-200/25">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
