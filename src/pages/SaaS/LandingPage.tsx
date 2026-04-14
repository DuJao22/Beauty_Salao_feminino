import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  TrendingUp, 
  Smartphone, 
  XOctagon, 
  CheckCircle2, 
  CalendarX, 
  MessageCircle, 
  ArrowRight,
  ShieldCheck,
  Store,
  X,
  ChevronDown,
  Heart
} from 'lucide-react';

interface Tenant {
  id: number;
  slug: string;
  name: string;
  logo: string;
  cover_image: string;
}

export default function LandingPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginSlug, setLoginSlug] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTenants(data);
        }
      })
      .catch(err => console.error('Error fetching tenants:', err));
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginSlug.trim()) {
      navigate(`/${loginSlug.trim().toLowerCase()}/admin/login`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-secondary">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-primary hidden sm:block">Beauty Network</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="text-sm font-medium text-text-light hover:text-primary transition-colors"
            >
              Login Admin
            </button>
            <Link to="/criar-conta" className="px-5 py-2.5 bg-primary text-white rounded-full font-medium text-sm hover:bg-accent transition-colors">
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>

      {/* Login Admin Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-secondary rounded-3xl p-8 w-full max-w-md relative shadow-2xl"
            >
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Acesso Restrito</h3>
              <p className="text-zinc-500 mb-6">Digite o link do seu negócio para acessar o painel administrativo.</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-2">Link do Salão</label>
                  <div className="flex items-center">
                    <span className="text-zinc-400 mr-2">app.com/</span>
                    <input 
                      type="text" 
                      required
                      placeholder="seu-salao"
                      value={loginSlug}
                      onChange={(e) => setLoginSlug(e.target.value)}
                      className="w-full p-3 rounded-xl border border-secondary bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-accent transition-colors shadow-lg shadow-primary/20"
                >
                  Acessar Painel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary mb-6 inline-block">
              O sistema definitivo para salões, manicures e clínicas de estética
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-zinc-900 tracking-tight mb-6 leading-tight">
              Seu negócio no <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                piloto automático.
              </span>
            </h1>
            <p className="text-xl text-text-main max-w-2xl mx-auto mb-10 leading-relaxed">
              Pare de perder tempo agendando pelo WhatsApp. Tenha seu próprio aplicativo de agendamentos para seu salão, estúdio de unhas ou clínica, e foque no que realmente importa: suas clientes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/criar-conta" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-accent transition-all flex items-center justify-center group shadow-lg shadow-primary/20">
                Profissionalizar meu negócio
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#detalhes" className="w-full sm:w-auto px-8 py-4 bg-white border border-secondary text-zinc-900 rounded-full font-bold text-lg hover:bg-zinc-50 transition-all flex items-center justify-center">
                Ver mais informações
              </a>
            </div>
            
            <motion.div 
              animate={{ y: [0, 10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="mt-16 flex justify-center"
            >
              <a href="#detalhes" className="w-12 h-12 rounded-full border border-secondary flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary transition-all">
                <ChevronDown className="w-6 h-6" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The Problem (Drawbacks) */}
      <section id="detalhes" className="py-24 px-6 bg-secondary/30 border-y border-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">O preço invisível de não ter um sistema</h2>
            <p className="text-text-light text-lg max-w-2xl mx-auto">
              Continuar agendando de forma manual está custando dinheiro, tempo e a imagem do seu negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-white border border-secondary shadow-sm"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Escravidão do WhatsApp</h3>
              <p className="text-zinc-500 leading-relaxed">
                Você para o atendimento a todo momento para responder mensagens. Se demorar, a cliente procura outro profissional. Seu tempo livre desaparece.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-white border border-secondary shadow-sm"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <CalendarX className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Furos e Esquecimentos</h3>
              <p className="text-zinc-500 leading-relaxed">
                Clientes esquecem o horário, você confunde as anotações no caderno e acaba com horários vagos que não geram faturamento.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-white border border-secondary shadow-sm"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <XOctagon className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Imagem Amadora</h3>
              <p className="text-zinc-500 leading-relaxed">
                Sem um link profissional, seu negócio é visto como apenas "mais um". Você perde a chance de transmitir autoridade e valor.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Solution (Benefits) */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">A revolução no seu negócio</h2>
            <p className="text-text-light text-lg max-w-2xl mx-auto">
              O Beauty Network entrega tudo que você precisa para escalar seu negócio de beleza e oferecer uma experiência premium.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Agenda Lotada 24/7</h3>
                  <p className="text-text-light">Seu link de agendamento funciona de madrugada, nos finais de semana e feriados. A cliente escolhe o horário sozinha, sem depender de você.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Sua Marca, Suas Cores</h3>
                  <p className="text-text-light">Não é um app genérico. Você personaliza o sistema com seu logo, foto de capa e as cores do seu negócio. Uma experiência 100% sua.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Gestão Inteligente</h3>
                  <p className="text-text-light">Painel administrativo completo para acompanhar faturamento, serviços mais populares e histórico de clientes. Tome decisões baseadas em dados.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-3xl transform rotate-3 scale-105 border border-secondary" />
              <div className="bg-white border border-secondary rounded-3xl p-8 relative z-10 shadow-2xl">
                <div className="flex items-center justify-between mb-8 border-b border-secondary pb-6">
                  <div>
                    <h4 className="text-zinc-900 font-bold text-lg">Salão de Beleza Premium</h4>
                    <p className="text-sm text-text-light">app.com/premium</p>
                  </div>
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-secondary bg-zinc-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-zinc-900 font-medium text-sm">Corte Feminino</p>
                          <p className="text-xs text-text-light">60 min</p>
                        </div>
                      </div>
                      <span className="text-primary font-bold">R$ 120,00</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-6 bg-secondary/20 border-y border-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-12 text-center">A diferença é clara</h2>
          
          <div className="bg-white rounded-3xl border border-secondary overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 border-b border-secondary">
              <div className="p-6 text-center border-r border-secondary bg-red-50/30">
                <h3 className="text-lg font-bold text-zinc-400">Sem Sistema (Manual)</h3>
              </div>
              <div className="p-6 text-center bg-primary/5">
                <h3 className="text-lg font-bold text-primary">Com Beauty Network</h3>
              </div>
            </div>
            
            {[
              ['Agendamento depende da sua resposta', 'Cliente agenda sozinho em segundos'],
              ['Risco alto de esquecimentos e furos', 'Organização impecável e automática'],
              ['Mistura vida pessoal e profissional no WhatsApp', 'Painel profissional separado'],
              ['Imagem de negócio amadora', 'Autoridade e percepção de alto valor'],
              ['Dificuldade em saber o faturamento exato', 'Métricas e relatórios na palma da mão']
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-2 border-b border-secondary last:border-0">
                <div className="p-6 border-r border-secondary flex items-center gap-3 text-zinc-500">
                  <XOctagon className="w-5 h-5 text-red-500 shrink-0" />
                  <span className="text-sm">{row[0]}</span>
                </div>
                <div className="p-6 flex items-center gap-3 text-zinc-900">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{row[1]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lojas Parceiras */}
      {tenants.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">Negócios Parceiros</h2>
              <p className="text-text-light text-lg max-w-2xl mx-auto">
                Conheça alguns dos profissionais e salões que já estão utilizando o Beauty Network para escalar seus negócios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tenants.map(tenant => (
                <Link 
                  key={tenant.id} 
                  to={`/${tenant.slug}`}
                  className="group bg-white border border-secondary rounded-3xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 block"
                >
                  <div className="h-40 w-full relative bg-zinc-50 overflow-hidden">
                    {tenant.cover_image ? (
                      <img src={tenant.cover_image} alt="Capa" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                        <Store className="w-12 h-12 text-zinc-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
                  </div>
                  <div className="p-6 relative">
                    <div className="w-16 h-16 rounded-2xl border-4 border-white bg-white absolute -top-10 left-6 overflow-hidden shadow-xl flex items-center justify-center">
                      {tenant.logo ? (
                        <img src={tenant.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="mt-8">
                      <h3 className="text-xl font-bold text-zinc-900 mb-1">{tenant.name}</h3>
                      <p className="text-sm text-zinc-400 mb-4">app.com/{tenant.slug}</p>
                      <div className="flex items-center text-sm font-medium text-zinc-600 group-hover:text-primary transition-colors">
                        Acessar página <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section className="py-24 px-6 bg-secondary/10 border-t border-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">Simples e Transparente</h2>
          <p className="text-text-light text-lg mb-12">Sem taxas escondidas, sem comissão por agendamento. Um valor fixo para você crescer.</p>
          
          <div className="bg-white border border-secondary rounded-3xl p-10 max-w-lg mx-auto relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-2">Plano Profissional</h3>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-5xl font-display font-bold text-primary">R$ 70</span>
              <span className="text-zinc-400">/mês</span>
            </div>
            <ul className="space-y-4 mb-8 text-left">
              <li className="flex items-center text-zinc-600"><CheckCircle2 className="w-5 h-5 text-primary mr-3 shrink-0" /> Agendamentos ilimitados</li>
              <li className="flex items-center text-zinc-600"><CheckCircle2 className="w-5 h-5 text-primary mr-3 shrink-0" /> Página com a sua marca</li>
              <li className="flex items-center text-zinc-600"><CheckCircle2 className="w-5 h-5 text-primary mr-3 shrink-0" /> Painel de gestão completo</li>
              <li className="flex items-center text-zinc-600"><CheckCircle2 className="w-5 h-5 text-primary mr-3 shrink-0" /> Suporte prioritário</li>
            </ul>
            <Link to="/criar-conta" className="block w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-accent transition-colors text-center shadow-lg shadow-primary/20">
              Começar agora
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-display font-bold text-zinc-900 mb-6">
            Pronta para dar o próximo passo?
          </h2>
          <p className="text-xl text-text-light mb-10">
            Junte-se aos salões que estão dominando o mercado. Crie seu sistema agora e transforme a gestão do seu negócio hoje mesmo.
          </p>
          <Link to="/criar-conta" className="inline-flex items-center px-10 py-5 bg-primary text-white rounded-full font-bold text-lg hover:bg-accent transition-all group shadow-xl shadow-primary/30">
            Criar minha conta agora
            <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-secondary text-center text-zinc-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Beauty Network. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
