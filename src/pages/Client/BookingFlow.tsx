import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { tenantFetch } from '../../lib/api';

// Types
interface Service { id: number; name: string; duration: number; price: number; promotional_price: number | null; }

export default function BookingFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const [clientData, setClientData] = useState({ 
    name: user ? user.name : '', 
    phone: user ? user.phone : '' 
  });
  const [password, setPassword] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register' | 'authenticated'>(user ? 'authenticated' : 'phone');
  const [authError, setAuthError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Fetch initial data
  useEffect(() => {
    tenantFetch(tenantSlug!, '/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        
        // Auto-select service if passed via navigation state
        const preselectedId = location.state?.serviceId;
        if (preselectedId) {
          const service = data.find((s: Service) => s.id === preselectedId);
          if (service) {
            setSelectedService(service);
            setStep(2);
            // Clear state so it doesn't auto-forward again if user goes back
            navigate('.', { replace: true, state: {} });
          }
        }
      });
  }, [location.state, navigate]);

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      tenantFetch(tenantSlug!, `/api/availability?date=${dateStr}&service_id=${selectedService.id}`)
        .then(res => res.json())
        .then(setAvailableTimes);
    }
  }, [selectedDate, selectedService, tenantSlug]);

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const submitBooking = async () => {
    // If not authenticated, we shouldn't be able to submit booking directly
    if (authStep !== 'authenticated') return;
    
    // Get latest user from localStorage in case they just logged in
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    if (!selectedService || !selectedTime || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      const response = await tenantFetch(tenantSlug!, '/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          client_name: currentUser.name,
          client_phone: currentUser.phone,
          service_id: selectedService.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime
        })
      });

      if (response.ok) {
        setBookingSuccess(true);
      } else {
        const data = await response.json();
        if (data.isDemo) {
          alert('Este estabelecimento ainda não ativou o sistema de agendamentos. Por favor, entre em contato diretamente com o profissional.');
        } else {
          alert(data.error || 'Erro ao realizar agendamento. Tente novamente.');
        }
      }
    } catch (error: any) {
      console.warn('Booking error:', error.message);
      alert('Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clientData.phone })
      });
      const data = await res.json();
      if (data.exists) {
        setClientData({ ...clientData, name: data.name });
        setAuthStep('login');
      } else {
        setAuthStep('register');
      }
    } catch (err) {
      setAuthError('Erro ao verificar telefone.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clientData.phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthStep('authenticated');
      } else {
        setAuthError(data.error || 'Senha incorreta.');
      }
    } catch (err) {
      setAuthError('Erro ao fazer login.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientData.name, phone: clientData.phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify({ id: data.user_id, name: data.name, phone: data.phone }));
        setAuthStep('authenticated');
      } else {
        setAuthError(data.error || 'Erro ao criar conta.');
      }
    } catch (err) {
      setAuthError('Erro ao conectar com o servidor.');
    }
  };

  // Generate next 14 days for calendar
  const nextDays = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-surface p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-secondary"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckCircle2 className="w-24 h-24 text-accent mx-auto mb-6" />
          </motion.div>
          <h2 className="text-3xl font-display mb-4">Agendamento Confirmado!</h2>
          <p className="text-text-light mb-8">
            Olá {clientData.name}, seu horário para {selectedService?.name} está marcado para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}.
          </p>
          <button 
            onClick={() => navigate(`/${tenantSlug}`)}
            className="w-full py-4 bg-primary text-text-main font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            Voltar para o Salão
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors duration-300 ${step >= i ? 'bg-accent text-white' : 'bg-secondary text-text-light'}`}>
                  {i}
                </div>
              </div>
            ))}
            <div className="absolute left-0 top-5 w-full h-1 bg-secondary -z-0">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: `${((step - 1) / 2) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-text-light font-medium px-2">
            <span>Serviço</span>
            <span>Data/Hora</span>
            <span>Confirmar</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-surface rounded-3xl shadow-lg border border-secondary overflow-hidden min-h-[500px] relative">
          <AnimatePresence mode="wait">
            {/* STEP 1: SERVICE */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-8 pb-32 md:pb-32"
              >
                <h2 className="text-2xl font-display mb-6">Escolha o Serviço</h2>
                <div className="space-y-4">
                  {services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => { setSelectedService(service); handleNext(); }}
                      className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 flex justify-between items-center gap-4 ${selectedService?.id === service.id ? 'border-accent bg-accent/5' : 'border-secondary hover:border-primary'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium mb-1 truncate">{service.name}</h3>
                        <div className="flex items-center text-sm text-text-light">
                          <Clock className="w-4 h-4 mr-1 shrink-0" /> {service.duration} min
                        </div>
                      </div>
                      <div className="text-right shrink-0 whitespace-nowrap">
                        {service.promotional_price ? (
                          <>
                            <div className="text-xs text-text-light line-through">R$ {service.price.toFixed(2)}</div>
                            <div className="text-lg font-medium text-accent">R$ {service.promotional_price.toFixed(2)}</div>
                          </>
                        ) : (
                          <div className="text-lg font-medium text-accent">R$ {service.price.toFixed(2)}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: DATE & TIME */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-8 pb-32 md:pb-32"
              >
                <h2 className="text-2xl font-display mb-6">Escolha Data e Horário</h2>
                
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-text-light mb-4 uppercase tracking-wider">Datas Disponíveis</h3>
                  <div className="flex overflow-x-auto pb-4 gap-3 snap-x scrollbar-hide">
                    {nextDays.map((date, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`flex-shrink-0 snap-start w-20 h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${isSameDay(selectedDate, date) ? 'border-accent bg-accent text-white' : 'border-secondary hover:border-primary'}`}
                      >
                        <span className="text-xs uppercase mb-1">{format(date, 'EEE', { locale: ptBR })}</span>
                        <span className="text-2xl font-display">{format(date, 'dd')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-light mb-4 uppercase tracking-wider">Horários Disponíveis</h3>
                  {availableTimes.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableTimes.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 rounded-xl border-2 font-medium transition-all ${selectedTime === time ? 'border-accent bg-accent/10 text-accent' : 'border-secondary hover:border-primary text-text-main'}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-text-light bg-secondary/30 rounded-2xl">
                      Nenhum horário disponível nesta data.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: CONFIRMATION */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-8 pb-32 md:pb-32"
              >
                <h2 className="text-2xl font-display mb-6">Confirme seu Agendamento</h2>
                
                <div className="bg-secondary/30 rounded-2xl p-6 mb-8 space-y-4">
                  <div className="flex items-start">
                    <Sparkles className="w-5 h-5 text-accent mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm text-text-light">Serviço</p>
                      <p className="font-medium">{selectedService?.name}</p>
                      <p className="text-sm text-accent">
                        R$ {(selectedService?.promotional_price || selectedService?.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CalendarIcon className="w-5 h-5 text-accent mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm text-text-light">Data e Hora</p>
                      <p className="font-medium capitalize">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                      <p className="font-medium text-accent">{selectedTime}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {authStep === 'authenticated' ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-green-900 mb-1">Pronto para agendar!</h3>
                      <p className="text-green-700 text-sm">Você está logado como <strong>{clientData.name || (user && user.name)}</strong>.</p>
                    </div>
                  ) : (
                    <div className="bg-surface border border-secondary rounded-2xl p-6">
                      <h3 className="text-lg font-medium text-text-main mb-4">
                        {authStep === 'phone' && 'Identifique-se para continuar'}
                        {authStep === 'login' && 'Bem-vinda de volta!'}
                        {authStep === 'register' && 'Crie sua conta'}
                      </h3>
                      
                      {authError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
                          {authError}
                        </div>
                      )}

                      {authStep === 'phone' && (
                        <form onSubmit={handleCheckPhone} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-text-light mb-1">Seu Telefone / WhatsApp</label>
                            <input 
                              type="tel" 
                              required
                              value={clientData.phone}
                              onChange={e => setClientData({...clientData, phone: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-transparent"
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                          <button type="submit" className="w-full py-3 bg-primary text-text-main font-medium rounded-xl hover:bg-primary/90 transition-colors">
                            Continuar
                          </button>
                        </form>
                      )}

                      {authStep === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                          <p className="text-sm text-text-light mb-4">Telefone: {clientData.phone} <button type="button" onClick={() => setAuthStep('phone')} className="text-accent underline ml-2">Alterar</button></p>
                          <div>
                            <label className="block text-sm font-medium text-text-light mb-1">Senha</label>
                            <input 
                              type="password" 
                              required
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-transparent"
                              placeholder="Sua senha"
                            />
                          </div>
                          <button type="submit" className="w-full py-3 bg-primary text-text-main font-medium rounded-xl hover:bg-primary/90 transition-colors">
                            Entrar
                          </button>
                        </form>
                      )}

                      {authStep === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                          <p className="text-sm text-text-light mb-4">Telefone: {clientData.phone} <button type="button" onClick={() => setAuthStep('phone')} className="text-accent underline ml-2">Alterar</button></p>
                          <div>
                            <label className="block text-sm font-medium text-text-light mb-1">Seu Nome Completo</label>
                            <input 
                              type="text" 
                              required
                              value={clientData.name}
                              onChange={e => setClientData({...clientData, name: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-transparent"
                              placeholder="Nome completo"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-light mb-1">Crie uma Senha</label>
                            <input 
                              type="password" 
                              required
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-transparent"
                              placeholder="Mínimo 6 caracteres"
                            />
                          </div>
                          <button type="submit" className="w-full py-3 bg-primary text-text-main font-medium rounded-xl hover:bg-primary/90 transition-colors">
                            Criar Conta
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="absolute bottom-0 left-0 w-full p-6 bg-surface border-t border-secondary flex justify-between">
            {step > 1 ? (
              <button 
                onClick={handlePrev}
                className="flex items-center px-6 py-3 text-text-light hover:text-text-main transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
              </button>
            ) : <div></div>}
            
            {step < 3 ? (
              <button 
                onClick={handleNext}
                disabled={(step === 1 && !selectedService) || (step === 2 && !selectedTime)}
                className="flex items-center px-8 py-3 bg-primary text-text-main font-medium rounded-full hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            ) : (
              <button 
                onClick={submitBooking}
                disabled={authStep !== 'authenticated' || isSubmitting}
                className="flex items-center px-8 py-3 bg-accent text-white font-medium rounded-full hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/30"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
