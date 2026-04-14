import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, LogOut, ArrowLeft, Scissors, History, User, Sparkles, ChevronRight } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface Appointment {
  id: number;
  service_name: string;
  date: string;
  time: string;
  status: string;
  price: number;
  promotional_price: number | null;
  image: string;
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

export default function ClientProfile() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  
  const navigate = useNavigate();
  const userStr = localStorage.getItem(`user_${tenantSlug}`);
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user) {
      navigate(`/${tenantSlug}/login`);
      return;
    }

    tenantFetch(tenantSlug!, `/api/users/${user.id}/appointments`)
      .then(res => res.json())
      .then(setAppointments)
      .catch(err => console.warn('Fetch error:', err.message));
  }, [user, navigate, tenantSlug]);

  const handleLogout = () => {
    localStorage.removeItem(`user_${tenantSlug}`);
    navigate(`/${tenantSlug}`);
  };

  if (!user) return null;

  const now = new Date();
  
  const upcoming = appointments.filter(app => {
    const appDate = parseISO(`${app.date}T${app.time}`);
    return isAfter(appDate, now) && app.status !== 'Cancelado';
  });

  const past = appointments.filter(app => {
    const appDate = parseISO(`${app.date}T${app.time}`);
    return !isAfter(appDate, now) || app.status === 'Cancelado';
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-blue-100 text-blue-800';
      case 'Confirmado': return 'bg-accent/20 text-accent';
      case 'Finalizado': return 'bg-green-100 text-green-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar Menu */}
      <aside className="w-full md:w-72 bg-surface border-r border-secondary flex flex-col shrink-0">
        <div className="p-8 border-b border-secondary">
          <Link to={`/${tenantSlug}`} className="inline-flex items-center text-sm text-text-main font-medium hover:text-accent mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Início
          </Link>
          <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display text-text-main">{user.name}</h1>
          <p className="text-text-light text-sm mt-1">{user.phone}</p>
        </div>

        <nav className="flex-grow p-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${
              activeTab === 'overview' 
                ? 'bg-accent text-white shadow-md' 
                : 'text-text-light hover:bg-secondary/50 hover:text-text-main'
            }`}
          >
            <Calendar className="w-5 h-5 mr-3" />
            <span className="font-medium">Meus Agendamentos</span>
            {activeTab === 'overview' && <ChevronRight className="w-4 h-4 ml-auto" />}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${
              activeTab === 'history' 
                ? 'bg-accent text-white shadow-md' 
                : 'text-text-light hover:bg-secondary/50 hover:text-text-main'
            }`}
          >
            <History className="w-5 h-5 mr-3" />
            <span className="font-medium">Histórico de Compras</span>
            {activeTab === 'history' && <ChevronRight className="w-4 h-4 ml-auto" />}
          </button>
        </nav>

        <div className="p-4 border-t border-secondary">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-5 h-5 mr-2" /> Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-display text-text-main">Próximos Agendamentos</h2>
                  <Link 
                    to={`/${tenantSlug}/#servicos`}
                    className="hidden md:inline-flex items-center px-4 py-2 bg-primary text-text-main font-medium rounded-lg hover:bg-primary/90 transition-all"
                  >
                    Novo Agendamento
                  </Link>
                </div>

                {upcoming.length === 0 ? (
                  <div className="bg-surface p-10 rounded-3xl border border-secondary text-center shadow-sm">
                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-text-light" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Nenhum agendamento futuro</h3>
                    <p className="text-text-light mb-6">Você ainda não tem horários marcados conosco.</p>
                    <Link 
                      to={`/${tenantSlug}/#servicos`}
                      className="inline-flex items-center px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-all shadow-md shadow-accent/20"
                    >
                      Ver Serviços Disponíveis
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {upcoming.map((app, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={app.id} 
                        className="bg-surface p-6 rounded-3xl border border-secondary flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden shrink-0">
                          <img src={app.image} alt={app.service_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow text-center md:text-left">
                          <h3 className="text-2xl font-medium mb-3">{app.service_name}</h3>
                          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-text-main">
                            <div className="flex items-center bg-secondary/30 px-3 py-1.5 rounded-lg">
                              <Calendar className="w-4 h-4 mr-2" />
                              {format(parseISO(app.date), "dd 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="flex items-center bg-accent/10 text-accent px-3 py-1.5 rounded-lg font-medium">
                              <Clock className="w-4 h-4 mr-2" />
                              {app.time}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-3 shrink-0 mt-4 md:mt-0">
                          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                          <div className="text-2xl font-display text-text-main">
                            R$ {(app.promotional_price || app.price).toFixed(2)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-3xl font-display text-text-main mb-8">Histórico de Compras</h2>
                
                {past.length === 0 ? (
                  <div className="bg-surface p-10 rounded-3xl border border-secondary text-center shadow-sm">
                    <History className="w-12 h-12 text-text-light mx-auto mb-4 opacity-50" />
                    <p className="text-text-light text-lg">Nenhum histórico encontrado.</p>
                  </div>
                ) : (
                  <div className="bg-surface rounded-3xl border border-secondary shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-secondary/30 text-text-light text-sm">
                            <th className="p-5 font-medium">Serviço</th>
                            <th className="p-5 font-medium">Data e Hora</th>
                            <th className="p-5 font-medium">Status</th>
                            <th className="p-5 font-medium">Valor Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary">
                          {past.map((app) => (
                            <tr key={app.id} className="hover:bg-secondary/10 transition-colors">
                              <td className="p-5 font-medium text-text-main flex items-center">
                                <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 shrink-0">
                                  <img src={app.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                {app.service_name}
                              </td>
                              <td className="p-5 text-text-light">
                                {format(parseISO(app.date), "dd/MM/yyyy")} <br/>
                                <span className="text-xs">{app.time}</span>
                              </td>
                              <td className="p-5">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                  {app.status}
                                </span>
                              </td>
                              <td className="p-5 font-medium text-text-main">
                                R$ {(app.promotional_price || app.price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

