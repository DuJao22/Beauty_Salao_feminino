/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import Home from './pages/Client/Home';
import BookingFlow from './pages/Client/BookingFlow';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminLogin from './pages/Admin/Login';
import ClientLogin from './pages/Client/Login';
import ClientProfile from './pages/Client/Profile';
import LandingPage from './pages/SaaS/LandingPage';
import SignupPage from './pages/SaaS/SignupPage';
import SuperAdminDashboard from './pages/SaaS/SuperAdminDashboard';
import SuperAdminLogin from './pages/SaaS/SuperAdminLogin';
import { TenantProvider } from './components/TenantProvider';

// Simple auth wrapper for tenant admin
function RequireAuth({ children }: { children: React.ReactElement }) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const token = localStorage.getItem(`admin_token_${tenantSlug}`);
  if (!token) {
    return <Navigate to={`/${tenantSlug}/admin/login`} replace />;
  }
  return children;
}

// Simple auth wrapper for super admin
function RequireSuperAdminAuth({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem('superadmin_token');
  if (!token) {
    return <Navigate to="/superadmin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow">
          <Routes>
            {/* SaaS Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/criar-conta" element={<SignupPage />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route 
              path="/superadmin" 
              element={
                <RequireSuperAdminAuth>
                  <SuperAdminDashboard />
                </RequireSuperAdminAuth>
              } 
            />

            {/* Tenant Routes */}
            <Route path="/:tenantSlug" element={<TenantProvider />}>
              <Route index element={<Home />} />
              <Route path="agendar" element={<BookingFlow />} />
              <Route path="login" element={<ClientLogin />} />
              <Route path="perfil" element={<ClientProfile />} />
              <Route path="admin/login" element={<AdminLogin />} />
              <Route 
                path="admin" 
                element={
                  <RequireAuth>
                    <AdminDashboard />
                  </RequireAuth>
                } 
              />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

