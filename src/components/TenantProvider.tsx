import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';

interface TenantContextType {
  tenant: any;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({ tenant: null, loading: true, error: null });

export const useTenant = () => useContext(TenantContext);

export function TenantProvider() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = window.location.pathname;

  useEffect(() => {
    if (!tenantSlug) return;

    fetch(`/api/tenant-info`, {
      headers: { 'x-tenant-slug': tenantSlug }
    })
      .then(res => {
        if (!res.ok) throw new Error('Tenant not found or suspended');
        return res.json();
      })
      .then(data => {
        setTenant(data);
        // Apply custom colors
        if (data.primary_color) {
          document.documentElement.style.setProperty('--color-primary', data.primary_color);
        }
        if (data.secondary_color) {
          document.documentElement.style.setProperty('--color-secondary', data.secondary_color);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [tenantSlug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Sistema Indisponível</h1>
        <p className="text-text-light mb-8">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-white rounded-xl">
          Voltar ao Início
        </button>
      </div>
    );
  }

  const isSubscriptionActive = () => {
    if (!tenant) return true;
    if (tenant.is_exempt) return true;
    
    // If they have an active subscription with a future due date
    if (tenant.subscription_due_date) {
      const dueDate = new Date(tenant.subscription_due_date);
      if (dueDate > new Date()) return true;
      return false;
    }

    // No due date yet (new tenant) - Allow 24 hours trial
    const createdAt = new Date(tenant.created_at);
    const trialEnd = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    return new Date() < trialEnd;
  };

  const isTrialPeriod = () => {
    if (!tenant) return false;
    if (tenant.is_exempt) return false;
    if (tenant.subscription_due_date) return false;
    return isSubscriptionActive();
  };

  if (!isSubscriptionActive() && !location.includes('/admin')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <h1 className="text-3xl font-display mb-4 text-text-main">Sistema Temporariamente Indisponível</h1>
        <p className="text-text-light mb-8 max-w-md">
          Este salão está temporariamente indisponível por falta de pagamento da taxa de manutenção. O proprietário deve realizar o pagamento para reativar o sistema.
        </p>
        <p className="text-sm text-text-light italic">
          Se você é o proprietário, acesse o painel administrativo para reativar sua conta.
        </p>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {isTrialPeriod() && !location.includes('/admin') && (
        <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none">
          <div className="bg-red-600 text-white text-center py-2 px-4 text-xs md:text-sm font-bold animate-pulse pointer-events-auto shadow-lg">
            ⚠️ SISTEMA EM PERÍODO DE TESTE (24H). PAGAMENTO DE R$ 70,00 OBRIGATÓRIO PARA MANTER ATIVO.
          </div>
        </div>
      )}
      <Outlet />
    </TenantContext.Provider>
  );
}
