import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, Instagram, MapPin, MessageCircle, Music2, Sparkles, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import SplashScreen from '../../components/SplashScreen';
import ThreeBackground from '../../components/ThreeBackground';
import { tenantFetch } from '../../lib/api';
import { useTenant } from '../../components/TenantProvider';

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  promotional_price: number | null;
  image: string;
}

export default function Home() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant } = useTenant();
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState({ 
    profile_name: 'Salão de Beleza Premium',
    cover_photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80', 
    profile_photo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80',
    subtitle: 'Realçando sua beleza natural ✨💖',
    services_title: 'Nossos Serviços',
    services_subtitle: 'Escolha o serviço ideal para você.',
    btn_schedule: 'Agendar Agora',
    btn_account: 'Minha Conta',
    btn_service_schedule: 'Agendar este serviço',
    instagram_url: '',
    tiktok_url: ''
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showTrialCard, setShowTrialCard] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!tenantSlug) return;
    
    // Show trial card every 45 seconds if in trial
    const trialInterval = setInterval(() => {
      const isTrial = !tenant?.subscription_due_date && tenant?.created_at && !tenant?.is_exempt;
      if (isTrial) {
        setShowTrialCard(true);
      }
    }, 45000);

    tenantFetch(tenantSlug, '/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error('Error fetching services:', err));

    tenantFetch(tenantSlug, '/api/settings')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSettings(prev => ({
            profile_name: data.profile_name || prev.profile_name,
            cover_photo: data.cover_photo || prev.cover_photo,
            profile_photo: data.profile_photo || prev.profile_photo,
            subtitle: data.subtitle || prev.subtitle,
            services_title: data.services_title || prev.services_title,
            services_subtitle: data.services_subtitle || prev.services_subtitle,
            btn_schedule: data.btn_schedule || prev.btn_schedule,
            btn_account: data.btn_account || prev.btn_account,
            btn_service_schedule: data.btn_service_schedule || prev.btn_service_schedule,
            instagram_url: data.instagram_url || prev.instagram_url,
            tiktok_url: data.tiktok_url || prev.tiktok_url
          }));
        }
      })
      .catch(err => console.error('Error fetching settings:', err));

    // Handle scroll to hash if present
    if (window.location.hash === '#servicos') {
      setTimeout(() => {
        const element = document.getElementById('servicos');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 3100); // Wait for splash screen
    }
    
    return () => {
      if (trialInterval) clearInterval(trialInterval);
    };
  }, [tenantSlug, tenant]);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showTrialCard && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface max-w-sm w-full p-8 rounded-3xl shadow-2xl text-center border-2 border-primary"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-2xl font-display text-accent mb-4">Aviso Importante</h2>
              <p className="text-text-light mb-8">
                Este sistema está em **período de teste (24h)**. Para manter este salão ativo e evitar a exclusão automática, o pagamento da taxa de manutenção de **R$ 70,00** é obrigatório.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handlePayment}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
                >
                  Pagar Agora (R$ 70,00)
                </button>
                <button 
                  onClick={() => setShowTrialCard(false)}
                  className="w-full py-3 text-text-light hover:bg-secondary/50 rounded-xl font-medium transition-colors"
                >
                  Continuar Lendo
                </button>
              </div>
              <p className="mt-4 text-[10px] text-text-light uppercase tracking-widest">
                Exibição obrigatória durante o trial
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background relative">
        <ThreeBackground />
        
        {/* Hero Section */}
        <section className="relative w-full flex flex-col z-10">
          {/* Top Background Image */}
          <div className="h-56 md:h-72 w-full relative">
            <img 
              src={tenant?.cover_image || settings.cover_photo} 
              alt="Capa" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Neutral Bottom Section */}
          <div className="bg-secondary pt-16 pb-12 px-4 text-center relative">
            {/* Curve SVG */}
            <svg 
              viewBox="0 0 1440 100" 
              preserveAspectRatio="none" 
              className="absolute bottom-full left-0 w-full h-12 md:h-16"
            >
              <path d="M0,100 Q720,0 1440,100 L1440,100 L0,100 Z" fill="var(--color-secondary)" />
            </svg>

            {/* Profile Picture */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 3.2, type: "spring", stiffness: 200, damping: 20 }}
              className="absolute -top-16 left-1/2 -translate-x-1/2 z-10"
            >
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-[6px] border-white overflow-hidden shadow-sm bg-white">
                 <img 
                   src={tenant?.logo || settings.profile_photo} 
                   alt="Perfil" 
                   className="w-full h-full object-cover"
                 />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.4, duration: 0.6 }}
              className="relative z-10 mt-4"
            >
              <h1 className="text-3xl md:text-4xl font-medium text-accent mb-2">
                {settings.profile_name}
              </h1>
              <p className="text-xs md:text-sm font-bold tracking-widest text-accent mb-2 uppercase">
                {settings.subtitle}
              </p>
              
              {tenant?.address && (
                <div className="flex items-center justify-center gap-2 text-text-main text-xs md:text-sm mb-6">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{tenant.address}</span>
                </div>
              )}
              
              {/* Social Icons */}
              <div className="flex justify-center gap-6 text-accent mb-10">
                 {settings.instagram_url && (
                   <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors transform hover:scale-110">
                     <Instagram className="w-6 h-6" />
                   </a>
                 )}
                 {settings.tiktok_url && (
                   <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors transform hover:scale-110">
                     <Music2 className="w-6 h-6" />
                   </a>
                 )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                <a 
                  href="#servicos" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-accent text-white font-medium rounded-full hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-accent/30 w-full sm:w-auto"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {settings.btn_schedule}
                </a>
                <Link 
                  to={`/${tenantSlug}/login`} 
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/50 backdrop-blur-sm border border-accent/20 text-accent font-medium rounded-full hover:bg-white/70 transition-all duration-300 w-full sm:w-auto"
                >
                  {settings.btn_account}
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section id="servicos" className="py-20 px-4 max-w-7xl mx-auto scroll-mt-10 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display text-accent mb-4">{settings.services_title}</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
            <p className="text-text-main mt-6">{settings.services_subtitle}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                onClick={() => navigate(`/${tenantSlug}/agendar`, { state: { serviceId: service.id } })}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
                whileHover={{ y: -10 }}
                className="group bg-surface/80 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-secondary cursor-pointer"
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.name} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-0 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
                    <span className="inline-block px-6 py-2 bg-white/20 backdrop-blur-md text-white rounded-full font-medium border border-white/30">
                      {settings.btn_service_schedule}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-display mb-2 text-accent">{service.name}</h3>
                  <p className="text-text-main mb-6 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-text-main text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {service.duration} min
                    </div>
                    <div className="text-right">
                      {service.promotional_price ? (
                        <>
                          <div className="text-xs text-text-light line-through">R$ {service.price.toFixed(2)}</div>
                          <div className="text-lg font-bold text-primary">R$ {service.promotional_price.toFixed(2)}</div>
                        </>
                      ) : (
                        <div className="text-lg font-bold text-primary">R$ {service.price.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-secondary bg-surface/30 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-6 border-2 border-primary">
              <img 
                src={tenant?.logo || settings.profile_photo} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-xl font-display text-accent mb-2">{settings.profile_name}</h3>
            {tenant?.address && (
              <div className="flex items-center gap-2 text-text-light text-sm mb-6 max-w-md">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>{tenant.address}</span>
              </div>
            )}
            <div className="flex gap-6 mb-8">
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings.tiktok_url && (
                <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-primary transition-colors">
                  <Music2 className="w-5 h-5" />
                </a>
              )}
            </div>
            <p className="text-xs text-text-light mb-2">
              © {new Date().getFullYear()} {settings.profile_name}. Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-text-light/60 font-medium tracking-wider uppercase">
              Desenvolvido por <span className="text-primary">João Layon</span> • CEO da <span className="text-accent">DS Company</span>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
