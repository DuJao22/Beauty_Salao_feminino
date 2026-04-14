import React, { useState, useEffect } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Check, X, CheckCircle2, AlertCircle, LogOut, Plus, Edit2, Trash2, Users, TrendingUp, DollarSign, Activity, BarChart2, Share2, ExternalLink, Sparkles, Bell } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { tenantFetch } from '../../lib/api';

interface Appointment {
  id: number;
  client_name: string;
  client_phone: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  promotional_price: number | null;
  image: string;
}

export default function AdminDashboard() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'crm' | 'appointments' | 'services' | 'settings' | 'horarios'>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [crmClients, setCrmClients] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [settings, setSettings] = useState({ 
    profile_name: 'Seu Negócio de Beleza',
    cover_photo: '', 
    profile_photo: '',
    subtitle: 'Realçando sua beleza natural ✨💖',
    services_title: 'Nossos Serviços',
    services_subtitle: 'Escolha o cuidado ideal para você.',
    btn_schedule: 'Agendar Agora',
    btn_account: 'Minha Conta',
    btn_service_schedule: 'Agendar este serviço',
    instagram_url: '',
    tiktok_url: '',
    primary_color: '#000000',
    secondary_color: '#F3F4F6',
    address: ''
  });
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [showBalloon, setShowBalloon] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    admin_username: '',
    admin_password: ''
  });
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState<'all' | 'today' | 'Agendado' | 'Finalizado' | 'Cancelado'>('today');
  const [lastAppointmentId, setLastAppointmentId] = useState<number | null>(null);
  const lastIdRef = React.useRef<number | null>(null);
  const navigate = useNavigate();

  // Service Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', duration: '60', price: '0', promotional_price: '', image: ''
  });

  const fetchData = (isInitial = false) => {
    if (!tenantSlug) return;
    
    tenantFetch(tenantSlug, '/api/admin/appointments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          if (data.length > 0) {
            const newest = data[0];
            if (!isInitial && lastIdRef.current !== null && newest.id > lastIdRef.current) {
              showNotification(newest);
            }
            lastIdRef.current = newest.id;
            setLastAppointmentId(newest.id);
          }
          setAppointments(data);
        } else {
          console.warn('Failed to fetch appointments:', data);
          setAppointments([]);
        }
      })
      .catch(err => {
        console.warn('Fetch error:', err.message);
        setAppointments([]);
      });

    tenantFetch(tenantSlug, '/api/services')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setServices(data);
        else setServices([]);
      })
      .catch(() => setServices([]));

    tenantFetch(tenantSlug, '/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(() => {});

    tenantFetch(tenantSlug, '/api/admin/crm/clients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCrmClients(data);
        else setCrmClients([]);
      })
      .catch(() => setCrmClients([]));

    if (isInitial) {
      tenantFetch(tenantSlug, '/api/admin/tenant')
        .then(res => res.json())
        .then(data => {
          setTenantInfo(data);
          if (data && data.admin_username) {
            setAdminCredentials({
              admin_username: data.admin_username,
              admin_password: ''
            });
          }
          if (data && data.primary_color) {
            setSettings(prev => ({
              ...prev,
              primary_color: data.primary_color,
              secondary_color: data.secondary_color || prev.secondary_color,
              address: data.address || prev.address
            }));
          }
        })
        .catch(() => {});

      tenantFetch(tenantSlug, '/api/admin/working-hours')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setWorkingHours(data);
        })
        .catch(() => {});

      tenantFetch(tenantSlug, '/api/settings')
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setSettings(prev => ({
              ...prev,
              profile_name: data.profile_name || 'Salão de Beleza Premium',
              cover_photo: data.cover_photo || '',
              profile_photo: data.profile_photo || '',
              subtitle: data.subtitle || 'Realçando sua beleza natural ✨💖',
              services_title: data.services_title || 'Nossos Serviços',
              services_subtitle: data.services_subtitle || 'Escolha o serviço ideal para você.',
              btn_schedule: data.btn_schedule || 'Agendar Agora',
              btn_account: data.btn_account || 'Minha Conta',
              btn_service_schedule: data.btn_service_schedule || 'Agendar este serviço',
              instagram_url: data.instagram_url || '',
              tiktok_url: data.tiktok_url || ''
            }));
          }
        })
        .catch(() => {});
    }
  };

  const showNotification = (appointment: Appointment) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const title = "Novo Agendamento! ✨";
      const options = {
        body: `${appointment.client_name} agendou ${appointment.service_name} para ${format(parseISO(appointment.date), 'dd/MM')} às ${appointment.time}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        vibrate: [100, 50, 100]
      };

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
      
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(() => {});
    }
  };

  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    fetchData(true);
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => fetchData(false), 30000);
    
    // Show balloon after 5 seconds
    const timer = setTimeout(() => {
      setShowBalloon(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(`admin_token_${tenantSlug}`);
    navigate(`/${tenantSlug}/admin/login`);
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await tenantFetch(tenantSlug!, `/api/admin/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (error: any) {
      console.warn('Update error:', error.message);
    }
  };

  const requestNotificationPermission = async () => {
    console.log('Requesting notification permission...');
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    // Check if we are inside an iframe
    const isIframe = window.self !== window.top;

    try {
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      
      if (permission === "granted") {
        new Notification("Notificações Ativadas! 🔔", {
          body: "Você receberá avisos de novos agendamentos aqui.",
          icon: "/favicon.ico"
        });
      } else if (permission === "denied") {
        alert("As notificações foram bloqueadas. Você precisa permitir as notificações nas configurações do seu navegador (clique no cadeado ao lado da URL) para receber avisos.");
      } else {
        if (isIframe) {
          alert("Aviso: O navegador bloqueou a solicitação de notificação por estar dentro de um quadro (iframe). Por favor, abra o sistema em uma nova aba (clique no botão 'Ver meu site' e acesse o painel por lá) para ativar as notificações.");
        } else {
          alert("Permissão de notificação ignorada ou fechada.");
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      if (isIframe) {
        alert('Erro ao solicitar permissão. Navegadores costumam bloquear notificações dentro de iframes por segurança. Por favor, abra o sistema em uma nova aba para ativar as notificações.');
      } else {
        alert('Erro ao solicitar permissão de notificação. Verifique as configurações do seu navegador.');
      }
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await tenantFetch(tenantSlug!, `/api/admin/crm/clients/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      // Refresh CRM data
      tenantFetch(tenantSlug!, '/api/admin/crm/clients')
        .then(res => res.json())
        .then(data => setCrmClients(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingService ? `/api/admin/services/${editingService.id}` : '/api/admin/services';
    const method = editingService ? 'PUT' : 'POST';
    
    const payload = {
      ...formData,
      duration: parseInt(formData.duration as string) || 0,
      price: parseFloat(formData.price as string) || 0,
      promotional_price: formData.promotional_price ? parseFloat(formData.promotional_price as string) : null
    };

    try {
      const res = await tenantFetch(tenantSlug!, url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (error: any) {
      console.warn('Save error:', error.message);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      const res = await tenantFetch(tenantSlug!, `/api/admin/services/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error: any) {
      console.warn('Delete error:', error.message);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        duration: String(service.duration),
        price: String(service.price),
        promotional_price: service.promotional_price ? service.promotional_price.toString() : '',
        image: service.image
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', description: '', duration: '60', price: '0', promotional_price: '', image: '' });
    }
    setIsModalOpen(true);
  };

  const filteredAppointments = appointments.filter(app => {
    if (filter === 'today') return isToday(parseISO(app.date));
    if (filter === 'Agendado') return app.status === 'Agendado' || app.status === 'Confirmado';
    if (filter === 'Finalizado') return app.status === 'Finalizado';
    if (filter === 'Cancelado') return app.status === 'Cancelado';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Confirmado': return 'bg-accent/20 text-accent border-accent/30';
      case 'Finalizado': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isSubscriptionActive = () => {
    if (!tenantInfo) return true;
    if (tenantInfo.is_exempt) return true;
    if (tenantInfo.status === 'deleted') return false;
    
    // If they have an active subscription with a future due date
    if (tenantInfo.subscription_due_date) {
      const dueDate = new Date(tenantInfo.subscription_due_date);
      if (dueDate > new Date()) return true;
    }

    // We return true here to allow them to "see" the system, 
    // but we will show a banner if they haven't paid.
    return true;
  };

  const isDemoMode = () => {
    if (!tenantInfo) return false;
    if (tenantInfo.is_exempt) return false;
    if (tenantInfo.status === 'deleted') return true;
    
    if (tenantInfo.subscription_due_date) {
      const dueDate = new Date(tenantInfo.subscription_due_date);
      if (dueDate > new Date()) return false;
    }
    return true;
  };

  const handlePayment = async () => {
    try {
      const res = await tenantFetch(tenantSlug!, '/api/admin/subscription/pay', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Erro ao gerar pagamento: ' + (data.details || data.error || 'Desconhecido'));
      }
    } catch (error) {
      alert('Erro de conexão ao gerar pagamento');
    }
  };

  if (tenantInfo?.status === 'deleted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-surface max-w-md w-full p-8 rounded-3xl border border-secondary shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display text-text-main mb-4">Conta Excluída</h2>
          <p className="text-text-light mb-8">Esta conta foi removida do sistema.</p>
          <button onClick={handleLogout} className="w-full py-3 bg-secondary text-text-main rounded-xl font-medium">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Flashing Activation Banner */}
      {isDemoMode() && (
        <motion.div 
          animate={{ backgroundColor: ['#ef4444', '#b91c1c', '#ef4444'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="fixed top-0 left-0 w-full z-[100] py-3 px-4 text-center text-white font-bold shadow-lg flex items-center justify-center gap-4"
        >
          <AlertCircle className="w-5 h-5 animate-pulse" />
          <span>SISTEMA EM MODO DE DEMONSTRAÇÃO - ATIVE SUA CONTA PARA RECEBER AGENDAMENTOS</span>
          <button 
            onClick={handlePayment}
            className="bg-white text-red-600 px-4 py-1 rounded-full text-sm hover:bg-zinc-100 transition-colors shadow-sm"
          >
            Ativar Agora
          </button>
        </motion.div>
      )}

      {/* Flashing Floating Card for Demo Mode */}
      <AnimatePresence>
        {isDemoMode() && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed bottom-8 left-8 z-[110] pointer-events-none"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 10px 15px -3px rgba(239, 68, 68, 0.1)',
                  '0 20px 25px -5px rgba(239, 68, 68, 0.4)',
                  '0 10px 15px -3px rgba(239, 68, 68, 0.1)'
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="bg-white p-6 rounded-3xl border-2 border-red-500 shadow-2xl text-center max-w-[280px] pointer-events-auto"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-red-600 mb-1">Ativação Pendente</h3>
              <p className="text-zinc-600 text-xs mb-4">
                Seu sistema está em modo demonstração. Ative para receber agendamentos reais.
              </p>
              <button 
                onClick={handlePayment}
                className="w-full py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
              >
                Ativar Agora (R$ 70)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBalloon && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 max-w-xs"
          >
            <div className="bg-accent text-white p-6 rounded-2xl shadow-2xl relative">
              <button 
                onClick={() => setShowBalloon(false)}
                className="absolute top-2 right-2 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium mb-1">Seu site está pronto!</p>
                  <p className="text-sm text-white/90 mb-4">Clique abaixo para ver como ficou a página dos seus clientes.</p>
                  <a 
                    href={`/${tenantSlug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-bold bg-white text-accent px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
                  >
                    Ver meu site <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-2 right-12 w-4 h-4 bg-accent rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="w-full lg:w-auto">
            <h1 className="text-2xl md:text-3xl font-display text-text-main mb-2">Painel Administrativo</h1>
            <p className="text-text-main text-sm md:text-base">Gerencie os agendamentos e serviços do seu salão</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {isIframe && (
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 lg:flex-none flex items-center justify-center px-4 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-sm font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir em Nova Aba
              </a>
            )}
            <button 
              onClick={requestNotificationPermission}
              className="flex-1 lg:flex-none flex items-center justify-center px-4 py-2.5 bg-secondary text-text-main rounded-xl hover:bg-secondary/80 transition-all shadow-sm font-medium text-sm"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </button>
            <button 
              onClick={() => {
                const url = window.location.origin + '/' + tenantSlug;
                navigator.clipboard.writeText(url);
                alert('Link do seu salão copiado para a área de transferência!');
              }}
              className="flex-1 lg:flex-none flex items-center justify-center px-4 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-sm font-medium text-sm"
            >
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </button>
            <button 
              onClick={handleLogout}
              className="flex lg:flex-none items-center justify-center px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-secondary overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'overview' ? 'text-accent' : 'text-text-light hover:text-text-main'}`}
          >
            Visão Geral
            {activeTab === 'overview' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'crm' ? 'text-accent' : 'text-text-light hover:text-text-main'}`}
          >
            CRM / Clientes
            {activeTab === 'crm' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'appointments' ? 'text-accent' : 'text-text-light hover:text-text-main'}`}
          >
            Agendamentos
            {activeTab === 'appointments' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'services' ? 'text-accent' : 'text-text-light hover:text-text-main'}`}
          >
            Serviços
            {activeTab === 'services' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'settings' ? 'text-accent' : 'text-text-light hover:text-text-main'}`}
          >
            Configurações
            {activeTab === 'settings' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('horarios')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'horarios' ? 'text-accent' : 'text-text-light hover:text-text-main'}`}
          >
            Horários de Atendimento
            {activeTab === 'horarios' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        </div>

        {activeTab === 'overview' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Faturamento Total</h3>
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-inner">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-display tracking-tight text-text-main">R$ {stats.totalRevenue.toFixed(2)}</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Agendamentos</h3>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-display tracking-tight text-text-main">{stats.totalAppointments}</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Clientes Cadastrados</h3>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-display tracking-tight text-text-main">{stats.totalClients}</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Taxa de Conversão</h3>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-display tracking-tight text-text-main">
                  {stats.totalClients > 0 ? Math.round((stats.totalAppointments / stats.totalClients) * 100) : 0}%
                </p>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface p-6 lg:p-8 rounded-3xl border border-secondary shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium mb-8 flex items-center text-text-main">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mr-3">
                    <Activity className="w-4 h-4 text-accent" />
                  </div>
                  Faturamento (Últimos 7 dias)
                </h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueByDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(parseISO(val), 'dd/MM')} 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                        dx={-10}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                        labelFormatter={(label) => format(parseISO(label), "dd 'de' MMMM", { locale: ptBR })}
                        contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-secondary)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: 'var(--color-secondary)', strokeWidth: 2, strokeDasharray: '5 5' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--color-primary)" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: 'var(--color-surface)', stroke: 'var(--color-primary)', strokeWidth: 2 }} 
                        activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }} 
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface p-6 lg:p-8 rounded-3xl border border-secondary shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium mb-8 flex items-center text-text-main">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                    <BarChart2 className="w-4 h-4 text-primary" />
                  </div>
                  Serviços Mais Populares
                </h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.appointmentsByService} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        stroke="#9ca3af" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#9ca3af" 
                        width={120}
                        tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => [value, 'Agendamentos']}
                        contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-secondary)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'var(--color-secondary)', opacity: 0.4 }}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[0, 6, 6, 0]} 
                        barSize={24}
                        animationDuration={1500}
                      >
                        {stats.appointmentsByService.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--color-primary)' : 'var(--color-accent)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === 'crm' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-surface rounded-3xl border border-secondary shadow-sm overflow-hidden">
              <div className="p-6 border-b border-secondary flex justify-between items-center">
                <h2 className="text-xl font-display">Clientes (CRM)</h2>
                <div className="text-sm text-text-light">Total: {crmClients.length} clientes</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/30 text-text-light text-sm">
                      <th className="p-4 font-medium">Cliente</th>
                      <th className="p-4 font-medium">Telefone</th>
                      <th className="p-4 font-medium">Agendamentos</th>
                      <th className="p-4 font-medium">Total Gasto</th>
                      <th className="p-4 font-medium">Última Visita</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {crmClients.map((client) => (
                      <tr key={client.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="p-4 font-medium text-text-main">{client.name}</td>
                        <td className="p-4 text-text-light">{client.phone}</td>
                        <td className="p-4 text-text-main">
                          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {client.total_appointments}
                          </span>
                        </td>
                        <td className="p-4 text-green-600 font-medium">
                          R$ {(client.total_spent || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-text-light">
                          {client.last_appointment ? format(parseISO(client.last_appointment), 'dd/MM/yyyy') : 'Nunca'}
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => toggleUserStatus(client.id, client.status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              client.status === 'active' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {client.status === 'active' ? 'Ativo' : 'Desativado'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {crmClients.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-text-light">
                          Nenhum cliente cadastrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'appointments' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Agendamentos Hoje</h3>
                  <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5 text-text-main" />
                  </div>
                </div>
                <p className="text-4xl font-display">{appointments.filter(a => isToday(parseISO(a.date))).length}</p>
              </div>
              <div className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Confirmados</h3>
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  </div>
                </div>
                <p className="text-4xl font-display">{appointments.filter(a => a.status === 'Confirmado').length}</p>
              </div>
              <div className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-light font-medium">Pendentes</h3>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-display">{appointments.filter(a => a.status === 'Agendado').length}</p>
              </div>
            </div>

            {/* Appointments List */}
            <div className="bg-surface rounded-3xl border border-secondary shadow-sm overflow-hidden">
              <div className="p-6 border-b border-secondary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-display">Lista de Agendamentos</h2>
                <div className="flex flex-wrap gap-1 bg-background p-1 rounded-xl border border-secondary">
                  <button 
                    onClick={() => setFilter('today')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'today' ? 'bg-primary text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
                  >
                    Hoje
                  </button>
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-primary text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilter('Agendado')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'Agendado' ? 'bg-primary text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
                  >
                    Aguardando
                  </button>
                  <button 
                    onClick={() => setFilter('Finalizado')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'Finalizado' ? 'bg-primary text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
                  >
                    Concluídos
                  </button>
                  <button 
                    onClick={() => setFilter('Cancelado')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'Cancelado' ? 'bg-primary text-text-main shadow-sm' : 'text-text-light hover:text-text-main'}`}
                  >
                    Cancelados
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background/50 text-text-light text-sm">
                      <th className="p-4 font-medium">Cliente</th>
                      <th className="p-4 font-medium">Serviço</th>
                      <th className="p-4 font-medium">Data/Hora</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-text-light">
                          Nenhum agendamento encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app, index) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={app.id} 
                          className="border-b border-secondary/50 hover:bg-background/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-medium text-text-main">{app.client_name}</div>
                            <div className="text-xs text-text-light">{app.client_phone}</div>
                          </td>
                          <td className="p-4 text-sm font-medium">{app.service_name}</td>
                          <td className="p-4">
                            <div className="text-sm flex items-center mb-1">
                              <Calendar className="w-3 h-3 mr-1 text-text-light" />
                              {format(parseISO(app.date), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-xs font-medium text-accent flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {app.time}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {app.status === 'Agendado' && (
                                <button 
                                  onClick={() => updateStatus(app.id, 'Confirmado')}
                                  className="p-2 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
                                  title="Confirmar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {(app.status === 'Agendado' || app.status === 'Confirmado') && (
                                <button 
                                  onClick={() => updateStatus(app.id, 'Finalizado')}
                                  className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                                  title="Finalizar"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {app.status !== 'Cancelado' && app.status !== 'Finalizado' && (
                                <button 
                                  onClick={() => updateStatus(app.id, 'Cancelado')}
                                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'services' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display">Catálogo de Serviços</h2>
              <button 
                onClick={() => openModal()}
                className="flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" /> Novo Serviço
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <div key={service.id} className="bg-surface rounded-2xl border border-secondary overflow-hidden shadow-sm">
                  <div className="h-40 overflow-hidden relative">
                    <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button onClick={() => openModal(service)} className="p-2 bg-white/90 rounded-lg text-blue-600 hover:bg-white transition-colors shadow-sm">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteService(service.id)} className="p-2 bg-white/90 rounded-lg text-red-600 hover:bg-white transition-colors shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-medium mb-1">{service.name}</h3>
                    <p className="text-sm text-text-light mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex justify-between items-end">
                      <div className="text-sm text-text-light flex items-center">
                        <Clock className="w-4 h-4 mr-1" /> {service.duration} min
                      </div>
                      <div className="text-right">
                        {service.promotional_price ? (
                          <>
                            <div className="text-xs text-text-light line-through">R$ {service.price.toFixed(2)}</div>
                            <div className="text-lg font-medium text-accent">R$ {service.promotional_price.toFixed(2)}</div>
                          </>
                        ) : (
                          <div className="text-lg font-medium text-accent">R$ {service.price.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-8">
            <div className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm">
              <h2 className="text-xl font-display mb-6">Configurações da Página Inicial</h2>
              
              {saveMessage.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm flex items-center ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {saveMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                  {saveMessage.text}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setSaveMessage({ type: '', text: '' });
                try {
                  // Update settings
                  const res = await tenantFetch(tenantSlug!, '/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                  });
                  
                  // Update tenant colors and address
                  await tenantFetch(tenantSlug!, '/api/admin/tenant', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primary_color: settings.primary_color,
                      secondary_color: settings.secondary_color,
                      address: settings.address
                    })
                  });

                  if (res.ok) {
                    setSaveMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
                    setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
                  } else {
                    setSaveMessage({ type: 'error', text: 'Erro ao salvar configurações' });
                  }
                } catch (error) {
                  setSaveMessage({ type: 'error', text: 'Erro ao salvar configurações' });
                }
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Nome do Perfil</label>
                  <input 
                    type="text" 
                    value={settings.profile_name} 
                    onChange={e => setSettings({...settings, profile_name: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Salão de Beleza Premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">URL da Foto de Capa (Fundo)</label>
                  <input 
                    type="url" 
                    value={settings.cover_photo} 
                    onChange={e => setSettings({...settings, cover_photo: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="https://..."
                  />
                  {settings.cover_photo && (
                    <div className="mt-2 h-32 rounded-xl overflow-hidden border border-secondary">
                      <img src={settings.cover_photo} alt="Capa" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">URL da Foto de Perfil</label>
                  <input 
                    type="url" 
                    value={settings.profile_photo} 
                    onChange={e => setSettings({...settings, profile_photo: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="https://..."
                  />
                  {settings.profile_photo && (
                    <div className="mt-2 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm">
                      <img src={settings.profile_photo} alt="Perfil" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Endereço / Localização</label>
                  <input 
                    type="text" 
                    value={settings.address} 
                    onChange={e => setSettings({...settings, address: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Frase de Efeito (Subtítulo)</label>
                  <input 
                    type="text" 
                    value={settings.subtitle} 
                    onChange={e => setSettings({...settings, subtitle: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Estilo e Tradição para o Homem Moderno ✂️💈"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Título da Seção de Serviços</label>
                  <input 
                    type="text" 
                    value={settings.services_title} 
                    onChange={e => setSettings({...settings, services_title: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Nossos Serviços"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Subtítulo da Seção de Serviços</label>
                  <input 
                    type="text" 
                    value={settings.services_subtitle} 
                    onChange={e => setSettings({...settings, services_subtitle: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Escolha o serviço ideal para o seu visual."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Texto do Botão "Agendar Horário"</label>
                  <input 
                    type="text" 
                    value={settings.btn_schedule} 
                    onChange={e => setSettings({...settings, btn_schedule: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Agendar Agora"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Texto do Botão "Minha Conta"</label>
                  <input 
                    type="text" 
                    value={settings.btn_account} 
                    onChange={e => setSettings({...settings, btn_account: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Minha Conta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Texto do Botão "Agendar este serviço"</label>
                  <input 
                    type="text" 
                    value={settings.btn_service_schedule} 
                    onChange={e => setSettings({...settings, btn_service_schedule: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="Ex: Agendar este serviço"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Link do Instagram (Opcional)</label>
                  <input 
                    type="url" 
                    value={settings.instagram_url} 
                    onChange={e => setSettings({...settings, instagram_url: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="https://instagram.com/seu.perfil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Link do TikTok (Opcional)</label>
                  <input 
                    type="url" 
                    value={settings.tiktok_url} 
                    onChange={e => setSettings({...settings, tiktok_url: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                    placeholder="https://tiktok.com/@seu.perfil"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-light mb-2">Cor Principal</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.primary_color} 
                        onChange={e => {
                          setSettings({...settings, primary_color: e.target.value});
                          document.documentElement.style.setProperty('--color-primary', e.target.value);
                        }} 
                        className="w-12 h-12 rounded-lg cursor-pointer border border-secondary" 
                      />
                      <span className="text-sm font-mono text-text-light uppercase">{settings.primary_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light mb-2">Cor Secundária</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.secondary_color} 
                        onChange={e => {
                          setSettings({...settings, secondary_color: e.target.value});
                          document.documentElement.style.setProperty('--color-secondary', e.target.value);
                        }} 
                        className="w-12 h-12 rounded-lg cursor-pointer border border-secondary" 
                      />
                      <span className="text-sm font-mono text-text-light uppercase">{settings.secondary_color}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="px-8 py-3 rounded-xl font-medium bg-accent text-white hover:bg-accent/90 transition-colors">
                    Salvar Configurações
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm">
              <h2 className="text-xl font-display mb-6">Credenciais de Acesso (Admin)</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload: any = { admin_username: adminCredentials.admin_username };
                  if (adminCredentials.admin_password) {
                    payload.admin_password = adminCredentials.admin_password;
                  }
                  const res = await tenantFetch(tenantSlug!, '/api/admin/tenant', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    alert('Credenciais atualizadas com sucesso!');
                    setAdminCredentials(prev => ({ ...prev, admin_password: '' }));
                  } else {
                    alert('Erro ao atualizar credenciais');
                  }
                } catch (error) {
                  alert('Erro de conexão');
                }
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Usuário</label>
                  <input 
                    type="text" 
                    required
                    value={adminCredentials.admin_username} 
                    onChange={e => setAdminCredentials({...adminCredentials, admin_username: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Nova Senha (deixe em branco para não alterar)</label>
                  <input 
                    type="password" 
                    value={adminCredentials.admin_password} 
                    onChange={e => setAdminCredentials({...adminCredentials, admin_password: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent outline-none" 
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" className="px-8 py-3 rounded-xl font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                    Atualizar Credenciais
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'horarios' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl">
            <div className="bg-surface p-6 rounded-3xl border border-secondary shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-display text-text-main">Horários de Atendimento</h2>
                <button 
                  onClick={async () => {
                    setSaveMessage({ type: '', text: '' });
                    try {
                      const res = await tenantFetch(tenantSlug!, '/api/admin/working-hours', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(workingHours)
                      });
                      if (res.ok) {
                        setSaveMessage({ type: 'success', text: 'Horários salvos com sucesso!' });
                        setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
                      } else {
                        setSaveMessage({ type: 'error', text: 'Erro ao salvar horários' });
                      }
                    } catch (error) {
                      setSaveMessage({ type: 'error', text: 'Erro ao salvar horários' });
                    }
                  }}
                  className="px-6 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-all shadow-md shadow-accent/20"
                >
                  Salvar Alterações
                </button>
              </div>

              {saveMessage.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm flex items-center ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {saveMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                  {saveMessage.text}
                </div>
              )}

              <div className="space-y-4">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => {
                  const hourData = workingHours.find(h => Number(h.day_of_week) === index) || { start_time: '09:00', end_time: '18:00', is_active: 0 };
                  return (
                    <div key={index} className={`p-4 rounded-2xl border transition-all ${hourData.is_active ? 'bg-white border-secondary shadow-sm' : 'bg-secondary/20 border-transparent opacity-60'}`}>
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex items-center justify-between xl:justify-start gap-4">
                          <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!hourData.is_active} 
                                onChange={(e) => {
                                  const newHours = [...workingHours];
                                  const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                  if (idx !== -1) {
                                    newHours[idx] = { ...newHours[idx], is_active: e.target.checked ? 1 : 0 };
                                  } else {
                                    newHours.push({ day_of_week: index, start_time: '09:00', end_time: '18:00', is_active: e.target.checked ? 1 : 0 });
                                  }
                                  setWorkingHours(newHours);
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                            </label>
                            <span className="font-medium text-text-main w-20">{day}</span>
                          </div>
                          <div className="text-sm font-medium xl:hidden">
                            {hourData.is_active ? (
                              <span className="text-green-600">Aberto</span>
                            ) : (
                              <span className="text-red-500">Fechado</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                          {/* First Shift */}
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Clock className="w-4 h-4 text-text-light shrink-0 hidden sm:block" />
                            <span className="text-xs text-text-light w-10 sm:hidden shrink-0">1º T:</span>
                            <input 
                              type="time" 
                              value={hourData.start_time}
                              disabled={!hourData.is_active}
                              onChange={(e) => {
                                const newHours = [...workingHours];
                                const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                if (idx !== -1) {
                                  newHours[idx] = { ...newHours[idx], start_time: e.target.value };
                                  setWorkingHours(newHours);
                                }
                              }}
                              className="flex-1 sm:flex-none min-w-[80px] px-2 py-1.5 rounded-lg border border-secondary focus:border-accent outline-none text-sm disabled:opacity-50"
                            />
                            <span className="text-text-light text-sm shrink-0">até</span>
                            <Clock className="w-4 h-4 text-text-light shrink-0 hidden sm:block" />
                            <input 
                              type="time" 
                              value={hourData.end_time}
                              disabled={!hourData.is_active}
                              onChange={(e) => {
                                const newHours = [...workingHours];
                                const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                if (idx !== -1) {
                                  newHours[idx] = { ...newHours[idx], end_time: e.target.value };
                                  setWorkingHours(newHours);
                                }
                              }}
                              className="flex-1 sm:flex-none min-w-[80px] px-2 py-1.5 rounded-lg border border-secondary focus:border-accent outline-none text-sm disabled:opacity-50"
                            />
                          </div>
                          
                          {/* Second Shift */}
                          <div className="flex items-center gap-2 w-full sm:w-auto xl:border-l xl:border-secondary xl:pl-3">
                            <span className="text-xs text-text-light w-10 sm:w-auto shrink-0">2º T:</span>
                            <Clock className="w-4 h-4 text-text-light shrink-0 hidden sm:block" />
                            <input 
                              type="time" 
                              value={hourData.start_time_2 || ''}
                              disabled={!hourData.is_active}
                              onFocus={() => {
                                if (!hourData.start_time_2) {
                                  const newHours = [...workingHours];
                                  const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                  if (idx !== -1) {
                                    newHours[idx] = { ...newHours[idx], start_time_2: '14:00' };
                                    setWorkingHours(newHours);
                                  }
                                }
                              }}
                              onChange={(e) => {
                                const newHours = [...workingHours];
                                const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                if (idx !== -1) {
                                  newHours[idx] = { ...newHours[idx], start_time_2: e.target.value };
                                  setWorkingHours(newHours);
                                }
                              }}
                              className="flex-1 sm:flex-none min-w-[80px] px-2 py-1.5 rounded-lg border border-secondary focus:border-accent outline-none text-sm disabled:opacity-50"
                            />
                            <span className="text-text-light text-sm shrink-0">até</span>
                            <Clock className="w-4 h-4 text-text-light shrink-0 hidden sm:block" />
                            <input 
                              type="time" 
                              value={hourData.end_time_2 || ''}
                              disabled={!hourData.is_active}
                              onFocus={() => {
                                if (!hourData.end_time_2) {
                                  const newHours = [...workingHours];
                                  const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                  if (idx !== -1) {
                                    newHours[idx] = { ...newHours[idx], end_time_2: '18:00' };
                                    setWorkingHours(newHours);
                                  }
                                }
                              }}
                              onChange={(e) => {
                                const newHours = [...workingHours];
                                const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                if (idx !== -1) {
                                  newHours[idx] = { ...newHours[idx], end_time_2: e.target.value };
                                  setWorkingHours(newHours);
                                }
                              }}
                              className="flex-1 sm:flex-none min-w-[80px] px-2 py-1.5 rounded-lg border border-secondary focus:border-accent outline-none text-sm disabled:opacity-50"
                            />
                            {(hourData.start_time_2 || hourData.end_time_2) && (
                              <button
                                type="button"
                                disabled={!hourData.is_active}
                                onClick={() => {
                                  const newHours = [...workingHours];
                                  const idx = newHours.findIndex(h => Number(h.day_of_week) === index);
                                  if (idx !== -1) {
                                    newHours[idx] = { ...newHours[idx], start_time_2: '', end_time_2: '' };
                                    setWorkingHours(newHours);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                                title="Remover 2º Turno"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-sm font-medium hidden xl:block">
                          {hourData.is_active ? (
                            <span className="text-green-600">Aberto</span>
                          ) : (
                            <span className="text-red-500">Fechado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Service Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-center">
                <h2 className="text-xl font-display">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-text-light hover:text-text-main">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSaveService} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Nome do Serviço</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-secondary focus:border-accent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Descrição / Observações</label>
                  <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-secondary focus:border-accent outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light mb-1">Duração (minutos)</label>
                    <input required type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-secondary focus:border-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light mb-1">Preço Normal (R$)</label>
                    <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-secondary focus:border-accent outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">Preço Promocional (R$ - Opcional)</label>
                  <input type="number" step="0.01" value={formData.promotional_price} onChange={e => setFormData({...formData, promotional_price: e.target.value})} placeholder="Deixe em branco se não houver" className="w-full px-4 py-2 rounded-xl border border-secondary focus:border-accent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light mb-1">URL da Imagem</label>
                  <input required type="url" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 rounded-xl border border-secondary focus:border-accent outline-none" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl font-medium text-text-light hover:bg-secondary transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2 rounded-xl font-medium bg-accent text-white hover:bg-accent/90 transition-colors">
                    Salvar Serviço
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-12 py-6 border-t border-secondary text-center">
        <p className="text-[10px] text-text-light/60 font-medium tracking-wider uppercase">
          Sistema desenvolvido por <span className="text-primary">João Layon</span> • CEO da <span className="text-accent">DS Company</span>
        </p>
      </footer>
    </div>
  );
}
