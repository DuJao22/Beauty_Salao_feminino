import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    cover_image: '',
    payment_config: '',
    admin_username: '',
    admin_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [createdTenant, setCreatedTenant] = useState<{ id: number, slug: string, name: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedTenant({ id: data.tenantId, slug: formData.slug, name: formData.name });
        setStep('payment');
      } else {
        alert(`Erro ao criar conta: ${data.details || 'O link pode já estar em uso.'}`);
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!createdTenant) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscription/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-slug': createdTenant.slug
        }
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Erro ao gerar link de pagamento');
      }
    } catch (error) {
      alert('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'payment' && createdTenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface p-8 rounded-3xl shadow-2xl border border-secondary text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-main mb-2">Conta Criada!</h1>
          <p className="text-text-light mb-8">
            Para ativar seu sistema e começar a usar, realize o pagamento da primeira mensalidade de <strong>R$ 70,00</strong>.
          </p>
          
          <div className="bg-zinc-50 rounded-2xl p-6 mb-8 text-left border border-secondary">
            <div className="flex justify-between mb-2">
              <span className="text-text-light">Plano Profissional</span>
              <span className="font-bold text-text-main">R$ 70,00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-light">Recorrência</span>
              <span className="text-text-main">Mensal</span>
            </div>
          </div>

          <button 
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            {loading ? 'Processando...' : 'Pagar com Mercado Pago'}
          </button>
          
          <p className="mt-6 text-xs text-text-light">
            Após o pagamento, seu sistema será liberado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-sm border border-secondary">
        <h1 className="text-2xl font-bold text-center mb-6">Criar Sistema</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-main mb-1">Nome do Negócio</label>
            <input 
              type="text" 
              required 
              className="w-full p-3 rounded-xl border border-secondary bg-background text-text-main"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main mb-1">Link Personalizado (slug)</label>
            <div className="flex items-center">
              <span className="text-text-main font-medium mr-2">app.com/</span>
              <input 
                type="text" 
                required 
                pattern="[a-z0-9-]+"
                title="Apenas letras minúsculas, números e hífens"
                className="w-full p-3 rounded-xl border border-secondary bg-background text-text-main"
                value={formData.slug}
                onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Usuário Administrador</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-secondary bg-background"
                value={formData.admin_username}
                onChange={e => setFormData({...formData, admin_username: e.target.value})}
                placeholder="Ex: admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha Administrador</label>
              <input 
                type="password" 
                required 
                className="w-full p-3 rounded-xl border border-secondary bg-background"
                value={formData.admin_password}
                onChange={e => setFormData({...formData, admin_password: e.target.value})}
                placeholder="Sua senha segura"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL do Logo (Opcional)</label>
            <input 
              type="url" 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.logo}
              onChange={e => setFormData({...formData, logo: e.target.value})}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL da Imagem de Capa (Opcional)</label>
            <input 
              type="url" 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.cover_image}
              onChange={e => setFormData({...formData, cover_image: e.target.value})}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chave Pix (Opcional)</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.payment_config}
              onChange={e => setFormData({...formData, payment_config: e.target.value})}
              placeholder="Sua chave Pix"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
