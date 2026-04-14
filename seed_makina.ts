import "dotenv/config";
import { getDb } from "./src/db/database";

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

async function seedServices() {
  try {
    const db = await getDb();
    const tenant = await db.get("SELECT id FROM tenants WHERE slug = 'makinadocortez'");
    
    if (!tenant) {
      console.error("Barbearia 'makinadocortez' não encontrada.");
      process.exit(1);
    }

    console.log(`Limpando serviços antigos para tenant ${tenant.id}...`);
    await db.run("DELETE FROM services WHERE tenant_id = ?", tenant.id);

    console.log(`Adicionando ${services.length} novos serviços...`);
    for (const service of services) {
      await db.run(
        "INSERT INTO services (tenant_id, name, description, duration, price, image) VALUES (?, ?, ?, ?, ?, ?)",
        tenant.id, service.name, "", service.duration, service.price, service.image
      );
    }

    console.log("Serviços adicionados com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao adicionar serviços:", error);
    process.exit(1);
  }
}

seedServices();
