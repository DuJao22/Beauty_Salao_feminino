const services = [
  { name: "Corte (tesoura + máquina)", price: 35.00, duration: 45, image: "https://images.unsplash.com/photo-1621605815841-2941a58112c4?w=500&q=80" },
  { name: "Corte navalhado", price: 35.00, duration: 45, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80" },
  { name: "Corte pigmentado", price: 50.00, duration: 60, image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=500&q=80" },
  { name: "Corte + alisamento", price: 50.00, duration: 90, image: "https://images.unsplash.com/photo-1599351431247-f13b28ce283d?w=500&q=80" },
  { name: "Corte + luzes", price: 85.00, duration: 120, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80" },
  { name: "Corte + barba", price: 45.00, duration: 75, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80" },
  { name: "Alisamento", price: 20.00, duration: 45, image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=500&q=80" },
  { name: "Luzes", price: 50.00, duration: 90, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80" },
  { name: "Desenho (a partir)", price: 10.00, duration: 20, image: "https://images.unsplash.com/photo-1588514930263-8a9d18728a55?w=500&q=80" },
  { name: "Barba (toalha quente)", price: 30.00, duration: 30, image: "https://images.unsplash.com/photo-1599351431247-f13b28ce283d?w=500&q=80" },
  { name: "Barba pigmentada", price: 35.00, duration: 40, image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=500&q=80" },
  { name: "Pézinho / perfil", price: 10.00, duration: 15, image: "https://images.unsplash.com/photo-1588514930263-8a9d18728a55?w=500&q=80" },
  { name: "Sobrancelha", price: 8.00, duration: 15, image: "https://images.unsplash.com/photo-1588514930263-8a9d18728a55?w=500&q=80" },
  { name: "Gel cola", price: 35.00, duration: 5, image: "https://images.unsplash.com/photo-1599351431247-f13b28ce283d?w=500&q=80" },
  { name: "Pomada", price: 30.00, duration: 5, image: "https://images.unsplash.com/photo-1599351431247-f13b28ce283d?w=500&q=80" }
];

async function seed() {
  const tenantSlug = 'makinadocortez';
  
  console.log('Limpando serviços antigos...');
  await fetch(`/api/admin/services-bulk?tenant=${tenantSlug}`, {
    method: 'DELETE',
    headers: { 'x-tenant-slug': tenantSlug }
  });

  console.log('Adicionando novos serviços...');
  for (const s of services) {
    await fetch(`/api/admin/services?tenant=${tenantSlug}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-slug': tenantSlug
      },
      body: JSON.stringify({
        ...s,
        description: "",
        promotional_price: null
      })
    });
  }
  console.log('Concluído!');
}

seed();
