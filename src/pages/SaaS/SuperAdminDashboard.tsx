import React, { useState, useEffect } from 'react';
import { X, LogOut, DollarSign, Users, Activity, Menu, Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const navigate = useNavigate();
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primary_color: '',
    secondary_color: '',
    logo: '',
    cover_image: '',
    payment_config: '',
    is_exempt: false
  });

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    const res = await fetch('/api/superadmin/tenants');
    if (res.ok) {
      setTenants(await res.json());
    }
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator)) {
      alert('Seu navegador não suporta Service Workers, necessário para notificações push.');
      return;
    }

    // Check if we are inside an iframe
    const isIframe = window.self !== window.top;

    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready, subscribing...');
      
      // Get VAPID public key from server
      const keyRes = await fetch('/api/superadmin/vapid-public-key');
      const { publicKey } = await keyRes.json();
      
      if (!publicKey) {
        alert('VAPID Public Key não configurada no servidor (.env)');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/superadmin/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      alert('Notificações ativadas com sucesso! 🔔');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      if (isIframe) {
        alert('Erro ao ativar notificações. Navegadores costumam bloquear notificações push dentro de iframes. Por favor, abra o sistema em uma nova aba para ativar as notificações.');
      } else {
        alert('Erro ao ativar notificações. Verifique se você permitiu as notificações no navegador (clique no cadeado ao lado da URL).');
      }
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await fetch(`/api/superadmin/tenants/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchTenants();
  };

  const deleteTenant = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta conta permanentemente?')) {
      await fetch(`/api/superadmin/tenants/${id}`, { method: 'DELETE' });
      fetchTenants();
    }
  };

  const openEditModal = (tenant: any) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      logo: tenant.logo || '',
      cover_image: tenant.cover_image || '',
      payment_config: tenant.payment_config || '',
      is_exempt: !!tenant.is_exempt
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    try {
      const res = await fetch(`/api/superadmin/tenants/${editingTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setEditingTenant(null);
        fetchTenants();
      } else {
        alert('Erro ao atualizar conta');
      }
    } catch (error) {
      alert('Erro de conexão');
    }
  };

  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const payingTenants = tenants.filter(t => t.status === 'active' && !t.is_exempt).length;
  const monthlyRevenue = payingTenants * 70;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-secondary sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-main">Super Admin</h1>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            {isIframe && (
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir em Nova Aba
              </a>
            )}
            <button 
              onClick={subscribeToNotifications}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors font-medium text-sm"
            >
              <Bell className="w-4 h-4" />
              Ativar Notificações
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('superadmin_token');
                navigate('/superadmin/login');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair do Painel
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-text-light hover:text-text-main"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-secondary p-4 bg-surface space-y-3">
            {isIframe && (
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir em Nova Aba
              </a>
            )}
            <button 
              onClick={subscribeToNotifications}
              className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors font-medium"
            >
              <Bell className="w-5 h-5" />
              Ativar Notificações
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('superadmin_token');
                navigate('/superadmin/login');
              }}
              className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sair do Painel
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-secondary flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-light font-medium">Faturamento Mensal</p>
              <p className="text-2xl font-bold text-text-main">R$ {monthlyRevenue.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-secondary flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-light font-medium">Sistemas Ativos</p>
              <p className="text-2xl font-bold text-text-main">{activeTenants}</p>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-secondary flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-light font-medium">Total de Cadastros</p>
              <p className="text-2xl font-bold text-text-main">{tenants.length}</p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4 text-text-main">Gerenciar Contas</h2>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface rounded-2xl shadow-sm border border-secondary overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-secondary/30">
              <tr>
                <th className="p-4 font-medium text-text-light">ID</th>
                <th className="p-4 font-medium text-text-light">Nome</th>
                <th className="p-4 font-medium text-text-light">Link (Slug)</th>
                <th className="p-4 font-medium text-text-light">Status</th>
                <th className="p-4 font-medium text-text-light">Isento</th>
                <th className="p-4 font-medium text-text-light">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-t border-secondary">
                  <td className="p-4 text-text-light">{t.id}</td>
                  <td className="p-4 font-medium text-text-main">{t.name}</td>
                  <td className="p-4 text-primary">/{t.slug}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="p-4">
                    {t.is_exempt ? (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Sim</span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Não</span>
                    )}
                  </td>
                  <td className="p-4 space-x-2">
                    <button 
                      onClick={() => openEditModal(t)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 font-medium"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => toggleStatus(t.id, t.status)}
                      className="px-3 py-1.5 bg-secondary text-text-main rounded-lg text-sm hover:bg-secondary/80 font-medium"
                    >
                      {t.status === 'active' ? 'Suspender' : 'Ativar'}
                    </button>
                    <button 
                      onClick={() => deleteTenant(t.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 font-medium"
                    >
                      Excluir
                    </button>
                    <a 
                      href={`/${t.slug}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-accent inline-block font-medium"
                    >
                      Acessar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {tenants.map(t => (
            <div key={t.id} className="bg-surface p-5 rounded-2xl shadow-sm border border-secondary">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-text-main">{t.name}</h3>
                  <p className="text-primary text-sm">/{t.slug}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {t.status === 'active' ? 'Ativo' : 'Suspenso'}
                </span>
              </div>
              
              {t.is_exempt && (
                <div className="mb-3">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Usuário Isento de Mensalidade</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button 
                  onClick={() => openEditModal(t)}
                  className="py-2 bg-blue-100 text-blue-700 rounded-xl text-sm hover:bg-blue-200 font-medium text-center"
                >
                  Editar
                </button>
                <button 
                  onClick={() => toggleStatus(t.id, t.status)}
                  className="py-2 bg-secondary text-text-main rounded-xl text-sm hover:bg-secondary/80 font-medium text-center"
                >
                  {t.status === 'active' ? 'Suspender' : 'Ativar'}
                </button>
                <button 
                  onClick={() => deleteTenant(t.id)}
                  className="py-2 bg-red-100 text-red-700 rounded-xl text-sm hover:bg-red-200 font-medium text-center"
                >
                  Excluir
                </button>
                <a 
                  href={`/${t.slug}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="py-2 bg-primary text-white rounded-xl text-sm hover:bg-accent text-center font-medium"
                >
                  Acessar
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Edit Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto">
            <div className="p-6 border-b border-secondary flex justify-between items-center sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-bold text-text-main">Editar Conta</h2>
              <button onClick={() => setEditingTenant(null)} className="text-text-light hover:text-text-main p-2 -mr-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text-main">Nome do Negócio</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-3 rounded-xl border border-secondary bg-background text-text-main"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-main">Cor Principal</label>
                  <input 
                    type="color" 
                    className="w-full h-12 rounded-xl cursor-pointer"
                    value={formData.primary_color}
                    onChange={e => setFormData({...formData, primary_color: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-main">Cor Secundária</label>
                  <input 
                    type="color" 
                    className="w-full h-12 rounded-xl cursor-pointer"
                    value={formData.secondary_color}
                    onChange={e => setFormData({...formData, secondary_color: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text-main">URL do Logo</label>
                <input 
                  type="url" 
                  className="w-full p-3 rounded-xl border border-secondary bg-background text-text-main"
                  value={formData.logo}
                  onChange={e => setFormData({...formData, logo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text-main">URL da Imagem de Capa</label>
                <input 
                  type="url" 
                  className="w-full p-3 rounded-xl border border-secondary bg-background text-text-main"
                  value={formData.cover_image}
                  onChange={e => setFormData({...formData, cover_image: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text-main">Chave Pix</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-secondary bg-background text-text-main"
                  value={formData.payment_config}
                  onChange={e => setFormData({...formData, payment_config: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <input 
                  type="checkbox" 
                  id="is_exempt_toggle"
                  className="w-6 h-6 rounded-lg border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  checked={formData.is_exempt}
                  onChange={e => setFormData({...formData, is_exempt: e.target.checked})}
                />
                <label htmlFor="is_exempt_toggle" className="text-sm font-bold text-purple-900 cursor-pointer select-none">
                  Isentar de Mensalidade (Uso Gratuito)
                </label>
              </div>
              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditingTenant(null)} className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-text-light hover:bg-secondary transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium bg-primary text-white hover:bg-accent transition-colors">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
