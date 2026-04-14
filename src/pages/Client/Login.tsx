import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Phone, Lock, User, ArrowRight } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

export default function ClientLogin() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [step, setStep] = useState<'phone' | 'login' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.exists) {
        setName(data.name);
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err) {
      setError('Erro ao verificar telefone.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(`user_${tenantSlug}`, JSON.stringify(data.user));
        navigate(`/${tenantSlug}/perfil`);
      } else {
        setError(data.error || 'Senha incorreta.');
      }
    } catch (err) {
      setError('Erro ao fazer login.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(`user_${tenantSlug}`, JSON.stringify({ id: data.user_id, name: data.name, phone: data.phone }));
        navigate(`/${tenantSlug}/perfil`);
      } else {
        setError(data.error || 'Erro ao criar conta.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1600&q=80" 
          alt="Spa background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-8 bg-surface/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-secondary mx-4"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display text-text-main mb-2">Minha Conta</h1>
          <p className="text-text-main">Acesse seu histórico de agendamentos</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleCheckPhone} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Seu Telefone (WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-main" />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-white"
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-primary text-text-main font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              Continuar <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-text-main font-medium">Olá, {name}!</p>
              <p className="text-sm text-text-light">Digite sua senha para entrar.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-main" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-primary text-text-main font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              Entrar <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-text-light hover:text-accent mt-4">
              Usar outro telefone
            </button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-text-main font-medium">Bem-vinda!</p>
              <p className="text-sm text-text-light">Crie sua conta para continuar.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light mb-2">Seu Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-white/50"
                  placeholder="Maria Silva"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light mb-2">Crie uma Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-white/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-primary text-text-main font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              Criar Conta <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-text-light hover:text-accent mt-4">
              Voltar
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
