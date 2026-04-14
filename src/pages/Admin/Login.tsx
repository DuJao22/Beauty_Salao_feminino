import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

export default function AdminLogin() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    localStorage.removeItem(`admin_token_${tenantSlug}`); // Clear existing token

    try {
      const res = await tenantFetch(tenantSlug!, '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(`admin_token_${tenantSlug}`, data.token);
        navigate(`/${tenantSlug}/admin`);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Beautiful Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80" 
          alt="Admin background" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/50 to-transparent"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-8 bg-surface/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 mx-4"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/10">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display text-text-main mb-2">Beauty Network</h1>
          <p className="text-text-light">Acesso ao Painel Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-light mb-2">Usuário</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-white/50 backdrop-blur-sm"
                placeholder="Usuário"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-white/50 backdrop-blur-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'} <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
