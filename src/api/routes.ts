import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import webpush from 'web-push';

const router = Router();

// VAPID keys setup
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@beautynetwork.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Middleware to resolve tenant
const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  const slug = req.headers['x-tenant-slug'] || req.query.tenant;
  if (!slug) {
    return res.status(400).json({ error: 'Tenant slug is required' });
  }

  try {
    const db = await getDb();
    const tenant = await db.get('SELECT * FROM tenants WHERE slug = ?', slug);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Check for subscription
    const isUnpaid = !tenant.subscription_due_date;
    const isExempt = !!tenant.is_exempt;

    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    // Block specific actions for unpaid tenants
    if (!isExempt && isUnpaid && tenant.status !== 'deleted') {
      // Allow GET requests so they can "see" the system
      // But block POST /appointments to prevent receiving appointments
      if (req.method === 'POST' && req.path === '/appointments') {
        return res.status(403).json({ 
          error: 'Sistema em modo de demonstração. Ative sua conta para receber agendamentos.',
          isDemo: true 
        });
      }

      // Block other administrative POST/PUT/DELETE actions if needed, 
      // but the user said "let them see normally", so we allow GETs.
      // We also allow the payment routes.
    }

    if (!isExempt && (tenant.status === 'deleted') && 
        !req.path.includes('/subscription/pay') && 
        !req.path.includes('/webhook') &&
        !(req.path.includes('/admin/tenant') && req.method === 'GET') &&
        !req.path.includes('/tenant-info')) {
      return res.status(403).json({ error: 'Sistema Temporariamente Indisponível.' });
    }

    (req as any).tenant = tenant;
    (req as any).isUnpaid = isUnpaid && !isExempt;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error resolving tenant' });
  }
};

// Public Routes
router.get('/tenants', async (req, res) => {
  try {
    const db = await getDb();
    const tenants = await db.all('SELECT id, slug, name, logo, cover_image FROM tenants WHERE status = "active" ORDER BY created_at DESC');
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tenants' });
  }
});

// Super Admin Routes
router.post('/superadmin/login', async (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.SUPERADMIN_USER || 'Dujao';
  const expectedPass = process.env.SUPERADMIN_PASS || '30031936';

  if (username === expectedUser && password === expectedPass) {
    res.json({ success: true, token: 'superadmin-secret-token' });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Webhook Mercado Pago
router.post('/webhook/mercadopago', async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'payment' || req.query.topic === 'payment') {
    const paymentId = data?.id || req.query.id;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    
    if (accessToken && paymentId) {
      try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const payment = await response.json();
        
        if (payment.status === 'approved' && payment.external_reference) {
          const tenantId = parseInt(payment.external_reference);
          const db = await getDb();
          
          // Check if this payment was already processed
          const alreadyProcessed = await db.get('SELECT id FROM processed_payments WHERE id = ?', paymentId.toString());
          if (alreadyProcessed) {
            return res.status(200).send('OK');
          }

          const tenant = await db.get('SELECT subscription_due_date FROM tenants WHERE id = ?', tenantId);
          if (tenant) {
            let newDueDate = new Date();
            if (tenant.subscription_due_date) {
              const currentDue = new Date(tenant.subscription_due_date);
              if (currentDue > newDueDate) {
                newDueDate = currentDue;
              }
            }
            newDueDate.setDate(newDueDate.getDate() + 30);
            
            await db.run(
              'UPDATE tenants SET subscription_due_date = ?, subscription_status = "active", status = "active" WHERE id = ?',
              newDueDate.toISOString(), tenantId
            );

            // Record the processed payment
            await db.run(
              'INSERT INTO processed_payments (id, tenant_id, amount, status) VALUES (?, ?, ?, ?)',
              paymentId.toString(), tenantId, payment.transaction_amount, payment.status
            );
          }
        }
      } catch (error) {
        console.error('Webhook error:', error);
      }
    }
  }
  
  res.status(200).send('OK');
});

// Subscription Payment Route
router.post('/admin/subscription/pay', resolveTenant, async (req, res) => {
  const tenant = (req as any).tenant;
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  
  if (!accessToken) {
    return res.status(500).json({ error: 'Mercado Pago token not configured' });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    
    let protocol = req.protocol;
    // Force https on Render/Production
    if (req.get('x-forwarded-proto')) {
      protocol = 'https';
    }
    
    const baseUrl = `${protocol}://${req.get('host')}`;
    console.log('Creating preference with baseUrl:', baseUrl);

    const response = await preference.create({
      body: {
        items: [
          {
            id: 'mensalidade',
            title: `Mensalidade Sistema - ${tenant.name}`,
            quantity: 1,
            unit_price: 70.00,
            currency_id: 'BRL',
          }
        ],
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' },
            { id: 'atm' }
          ],
          installments: 1
        },
        external_reference: tenant.id.toString(),
        back_urls: {
          success: `${baseUrl}/${tenant.slug}/admin`,
          failure: `${baseUrl}/${tenant.slug}/admin`,
          pending: `${baseUrl}/${tenant.slug}/admin`
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/webhook/mercadopago`
      }
    });

    res.json({ init_point: response.init_point });
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Erro ao criar pagamento', details: errorMessage });
  }
});

router.get('/superadmin/vapid-public-key', async (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/superadmin/push-subscription', async (req, res) => {
  const { subscription } = req.body;
  try {
    const db = await getDb();
    // We only keep the latest subscription for simplicity or we could keep multiple
    await db.run('INSERT INTO superadmin_subscriptions (subscription) VALUES (?)', JSON.stringify(subscription));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error saving subscription' });
  }
});

router.get('/superadmin/tenants', async (req, res) => {
  try {
    const db = await getDb();
    const tenants = await db.all('SELECT * FROM tenants ORDER BY created_at DESC');
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tenants' });
  }
});

router.post('/superadmin/tenants', async (req, res) => {
  const { slug, name, logo, cover_image, payment_config, admin_username, admin_password } = req.body;
  const primary_color = '#000000';
  const secondary_color = '#E5E7EB';
  try {
    const db = await getDb();
    console.log('Tentando criar tenant:', { slug, name });
    const result = await db.run(
      'INSERT INTO tenants (slug, name, primary_color, secondary_color, logo, cover_image, payment_config, admin_username, admin_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      slug, name, primary_color, secondary_color, logo, cover_image, payment_config, admin_username || 'Dujao', admin_password || '30031936'
    );
    const tenantId = result.lastID;
    console.log('Tenant criado com ID:', tenantId);

    // Seed default settings
    await db.run(`
      INSERT INTO settings (tenant_id, setting_key, value) VALUES 
      (?, 'profile_name', ?),
      (?, 'profile_photo', ?),
      (?, 'cover_photo', ?)
    `, tenantId, name, tenantId, logo || '', tenantId, cover_image || '');

    // Seed default working hours
    await db.run(`
      INSERT INTO working_hours (tenant_id, day_of_week, start_time, end_time, is_active) VALUES 
      (?, 0, '09:00', '18:00', 0),
      (?, 1, '09:00', '18:00', 1),
      (?, 2, '09:00', '18:00', 1),
      (?, 3, '09:00', '18:00', 1),
      (?, 4, '09:00', '18:00', 1),
      (?, 5, '09:00', '18:00', 1),
      (?, 6, '09:00', '18:00', 1)
    `, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId);

    // Notify Super Admin
    try {
      const subscriptions = await db.all('SELECT subscription FROM superadmin_subscriptions');
      const payload = JSON.stringify({
        title: 'Novo Salão Criado! ✨',
        body: `O salão "${name}" acabou de ser registrado no sistema.`,
        url: '/superadmin'
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(JSON.parse(sub.subscription), payload);
        } catch (err) {
          console.error('Error sending push notification:', err);
          // If subscription is expired, remove it
          if ((err as any).statusCode === 410 || (err as any).statusCode === 404) {
            await db.run('DELETE FROM superadmin_subscriptions WHERE subscription = ?', sub.subscription);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching subscriptions for notification:', err);
    }

    res.json({ success: true, tenantId });
  } catch (error) {
    console.error('Erro detalhado ao criar tenant:', error);
    res.status(500).json({ error: 'Error creating tenant', details: error instanceof Error ? error.message : String(error) });
  }
});

router.put('/superadmin/tenants/:id', async (req, res) => {
  const { id } = req.params;
  const { name, primary_color, secondary_color, logo, cover_image, payment_config, is_exempt } = req.body;
  try {
    const db = await getDb();
    await db.run(
      'UPDATE tenants SET name = ?, primary_color = ?, secondary_color = ?, logo = ?, cover_image = ?, payment_config = ?, is_exempt = ? WHERE id = ?',
      name, primary_color, secondary_color, logo, cover_image, payment_config, is_exempt ? 1 : 0, id
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating tenant' });
  }
});

router.put('/superadmin/tenants/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE tenants SET status = ? WHERE id = ?', status, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating tenant status' });
  }
});

router.delete('/superadmin/tenants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.run('DELETE FROM tenants WHERE id = ?', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting tenant' });
  }
});

// Tenant Routes
router.get('/tenant-info', resolveTenant, (req, res) => {
  const tenant = { ...(req as any).tenant };
  delete tenant.admin_password;
  delete tenant.admin_username;
  res.json(tenant);
});

// Get settings
router.get('/settings', resolveTenant, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = (req as any).tenant.id;
    const settings = await db.all('SELECT * FROM settings WHERE tenant_id = ?', tenantId);
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.setting_key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Admin: Get tenant details
router.get('/admin/tenant', resolveTenant, (req, res) => {
  const tenant = { ...(req as any).tenant };
  delete tenant.admin_password; // Still hide password
  res.json(tenant);
});

// Admin: Update tenant details
router.put('/admin/tenant', resolveTenant, async (req, res) => {
  const { name, primary_color, secondary_color, payment_config, logo, cover_image, address, admin_username, admin_password } = req.body;
  try {
    const db = await getDb();
    const tenantId = (req as any).tenant.id;
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (primary_color !== undefined) { updates.push('primary_color = ?'); values.push(primary_color); }
    if (secondary_color !== undefined) { updates.push('secondary_color = ?'); values.push(secondary_color); }
    if (payment_config !== undefined) { updates.push('payment_config = ?'); values.push(payment_config); }
    if (logo !== undefined) { updates.push('logo = ?'); values.push(logo); }
    if (cover_image !== undefined) { updates.push('cover_image = ?'); values.push(cover_image); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (admin_username !== undefined) { updates.push('admin_username = ?'); values.push(admin_username); }
    if (admin_password !== undefined) { updates.push('admin_password = ?'); values.push(admin_password); }
    
    if (updates.length > 0) {
      values.push(tenantId);
      await db.run(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, ...values);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Admin: Update settings
router.put('/admin/settings', resolveTenant, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = (req as any).tenant.id;
    
    const upsertSetting = async (key: string, value: string) => {
      const existing = await db.get('SELECT * FROM settings WHERE tenant_id = ? AND setting_key = ?', tenantId, key);
      if (existing) {
        await db.run('UPDATE settings SET value = ? WHERE tenant_id = ? AND setting_key = ?', value, tenantId, key);
      } else {
        await db.run('INSERT INTO settings (tenant_id, setting_key, value) VALUES (?, ?, ?)', tenantId, key, value);
      }
    };

    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined) {
        await upsertSetting(key, String(value));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Get all services
router.get('/services', resolveTenant, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = (req as any).tenant.id;
    const services = await db.all('SELECT * FROM services WHERE tenant_id = ?', tenantId);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// Get available times on a specific date
router.get('/availability', resolveTenant, async (req, res) => {
  const { date, service_id } = req.query;
  const tenantId = (req as any).tenant.id;
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  try {
    const db = await getDb();
    
    let duration = 40;
    if (service_id) {
      const service = await db.get('SELECT duration FROM services WHERE id = ? AND tenant_id = ?', service_id, tenantId);
      if (service) {
        duration = service.duration;
      }
    }
    
    const dayOfWeek = new Date(date as string).getUTCDay();
    
    const workingHours = await db.all(
      "SELECT * FROM working_hours WHERE tenant_id = ? AND day_of_week = ? AND is_active = 1",
      tenantId, dayOfWeek
    );

    if (!workingHours || workingHours.length === 0) {
      return res.json([]);
    }

    const { start_time, end_time, start_time_2, end_time_2 } = workingHours[0];

    const appointments = await db.all(
      "SELECT time FROM appointments WHERE tenant_id = ? AND date = ? AND status != 'Cancelado'",
      tenantId, date
    );

    const bookedTimes = appointments.map(a => a.time);
    
    const allTimes: string[] = [];
    
    const addTimes = (start?: string, end?: string) => {
      if (!start || !end) return;
      
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      
      let currentInMinutes = startHour * 60 + startMinute;
      const endInMinutes = endHour * 60 + endMinute;
      
      while (currentInMinutes + duration <= endInMinutes) {
        const h = Math.floor(currentInMinutes / 60).toString().padStart(2, '0');
        const m = (currentInMinutes % 60).toString().padStart(2, '0');
        const timeStr = `${h}:${m}`;
        
        if (!allTimes.includes(timeStr)) {
          allTimes.push(timeStr);
        }
        
        currentInMinutes += duration;
      }
    };

    addTimes(start_time, end_time);
    addTimes(start_time_2, end_time_2);
    
    allTimes.sort();

    const availableTimes = allTimes.filter(time => !bookedTimes.includes(time));
    res.json(availableTimes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
  }
});

// Create an appointment
router.post('/appointments', resolveTenant, async (req, res) => {
  const { user_id, client_name, client_phone, service_id, date, time } = req.body;
  const tenantId = (req as any).tenant.id;
  
  if (!client_name || !client_phone || !service_id || !date || !time) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const db = await getDb();
    
    if (user_id) {
      const user = await db.get('SELECT status FROM users WHERE id = ? AND tenant_id = ?', user_id, tenantId);
      if (user && user.status === 'inactive') {
        return res.status(403).json({ error: 'Sua conta está desativada. Entre em contato com o administrador.' });
      }
    }
    
    const existing = await db.all(
      "SELECT id FROM appointments WHERE tenant_id = ? AND date = ? AND time = ? AND status != 'Cancelado'",
      tenantId, date, time
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Time slot is no longer available' });
    }

    await db.run(
      'INSERT INTO appointments (tenant_id, user_id, client_name, client_phone, service_id, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      tenantId, user_id || null, client_name, client_phone, service_id, date, time
    );

    res.json({ message: 'Appointment created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Admin: Get all appointments
router.get('/admin/appointments', resolveTenant, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = (req as any).tenant.id;
    const appointments = await db.all(`
      SELECT a.*, s.name as service_name 
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.tenant_id = ?
      ORDER BY a.date DESC, a.time DESC
    `, tenantId);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Admin: Update appointment status
router.patch('/admin/appointments/:id/status', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const tenantId = (req as any).tenant.id;
  
  if (!['Agendado', 'Confirmado', 'Finalizado', 'Cancelado'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const db = await getDb();
    await db.run('UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?', status, id, tenantId);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Admin: Delete all services (for bulk update)
router.delete('/admin/services-bulk', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    await db.run('DELETE FROM services WHERE tenant_id = ?', tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir serviços' });
  }
});

// Admin: Login
router.post('/admin/login', resolveTenant, async (req, res) => {
  const { username, password } = req.body;
  const tenant = (req as any).tenant;
  
  if (username?.trim() === tenant.admin_username && password?.trim() === tenant.admin_password) {
    res.json({ token: `fake-jwt-token-${tenant.slug}`, success: true });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// User Authentication Routes
router.post('/users/check', resolveTenant, async (req, res) => {
  const { phone } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const results = await db.all('SELECT id, name FROM users WHERE tenant_id = ? AND phone = ?', tenantId, phone);
    if (results && results.length > 0) {
      res.json({ exists: true, name: results[0].name });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar usuário' });
  }
});

router.post('/users/register', resolveTenant, async (req, res) => {
  const { name, phone, password } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const result = await db.run('INSERT INTO users (tenant_id, name, phone, password) VALUES (?, ?, ?, ?)', tenantId, name, phone, password);
    res.json({ success: true, user_id: result.lastID, name, phone });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao registrar usuário. Telefone já existe?' });
  }
});

router.post('/users/login', resolveTenant, async (req, res) => {
  const { phone, password } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const results = await db.all('SELECT id, name, phone, status FROM users WHERE tenant_id = ? AND phone = ? AND password = ?', tenantId, phone, password);
    if (results && results.length > 0) {
      if (results[0].status === 'inactive') {
        return res.status(403).json({ error: 'Sua conta está desativada. Entre em contato com o administrador.' });
      }
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ error: 'Senha incorreta' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.get('/users/:id/appointments', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const appointments = await db.all(`
      SELECT a.*, s.name as service_name, s.price, s.promotional_price, s.image
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.tenant_id = ? AND (a.user_id = ? OR a.client_phone = (SELECT phone FROM users WHERE id = ? AND tenant_id = ?))
      ORDER BY a.date DESC, a.time DESC
    `, tenantId, id, id, tenantId);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos do usuário' });
  }
});

router.post('/admin/services', resolveTenant, async (req, res) => {
  const { name, description, duration, price, promotional_price, image } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    await db.run(
      'INSERT INTO services (tenant_id, name, description, duration, price, promotional_price, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      tenantId, name, description, duration, price, promotional_price || null, image
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

router.put('/admin/services/:id', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const { name, description, duration, price, promotional_price, image } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    await db.run(
      'UPDATE services SET name = ?, description = ?, duration = ?, price = ?, promotional_price = ?, image = ? WHERE id = ? AND tenant_id = ?',
      name, description, duration, price, promotional_price || null, image, id, tenantId
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

router.delete('/admin/services/:id', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    await db.run('DELETE FROM services WHERE id = ? AND tenant_id = ?', id, tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir serviço' });
  }
});

router.get('/admin/stats', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    
    const revenueResult = await db.get(`
      SELECT SUM(COALESCE(s.promotional_price, s.price)) as total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.tenant_id = ? AND a.status IN ('Finalizado', 'Confirmado')
    `, tenantId);
    
    const appointmentsCount = await db.get(`SELECT COUNT(*) as count FROM appointments WHERE tenant_id = ? AND status != 'Cancelado'`, tenantId);
    
    const clientsCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE tenant_id = ?`, tenantId);

    const revenueByDay = await db.all(`
      SELECT a.date, SUM(COALESCE(s.promotional_price, s.price)) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.tenant_id = ? AND a.status IN ('Finalizado', 'Confirmado')
      GROUP BY a.date
      ORDER BY a.date DESC
      LIMIT 7
    `, tenantId);

    const appointmentsByService = await db.all(`
      SELECT s.name, COUNT(a.id) as count
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.tenant_id = ? AND a.status != 'Cancelado'
      GROUP BY s.id
      ORDER BY count DESC
    `, tenantId);

    res.json({
      totalRevenue: revenueResult?.total || 0,
      totalAppointments: appointmentsCount?.count || 0,
      totalClients: clientsCount?.count || 0,
      revenueByDay: revenueByDay.reverse(),
      appointmentsByService
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

router.get('/admin/crm/clients', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const clients = await db.all(`
      SELECT 
        u.id, 
        u.name, 
        u.phone, 
        u.status,
        u.created_at,
        COUNT(a.id) as total_appointments,
        SUM(CASE WHEN a.status IN ('Finalizado', 'Confirmado') THEN COALESCE(s.promotional_price, s.price) ELSE 0 END) as total_spent,
        MAX(a.date) as last_appointment
      FROM users u
      LEFT JOIN appointments a ON u.id = a.user_id AND a.tenant_id = ?
      LEFT JOIN services s ON a.service_id = s.id
      WHERE u.tenant_id = ?
      GROUP BY u.id
      ORDER BY total_spent DESC, total_appointments DESC
    `, tenantId, tenantId);
    
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lista de clientes' });
  }
});

router.patch('/admin/crm/clients/:id/status', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const tenantId = (req as any).tenant.id;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const db = await getDb();
    await db.run('UPDATE users SET status = ? WHERE id = ? AND tenant_id = ?', status, id, tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status do cliente' });
  }
});

router.post('/users/:id/push-subscription', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const { subscription } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    await db.run('UPDATE users SET push_subscription = ? WHERE id = ? AND tenant_id = ?', JSON.stringify(subscription), id, tenantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar inscrição de notificação' });
  }
});

router.get('/admin/working-hours', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const hours = await db.all('SELECT * FROM working_hours WHERE tenant_id = ? ORDER BY day_of_week ASC', tenantId);
    res.json(hours);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar horários de trabalho' });
  }
});

router.put('/admin/working-hours', resolveTenant, async (req, res) => {
  const hours = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    for (const h of hours) {
      await db.run(
        'UPDATE working_hours SET start_time = ?, end_time = ?, start_time_2 = ?, end_time_2 = ?, is_active = ? WHERE day_of_week = ? AND tenant_id = ?',
        h.start_time, h.end_time, h.start_time_2 || null, h.end_time_2 || null, h.is_active ? 1 : 0, h.day_of_week, tenantId
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar horários de trabalho' });
  }
});

export default router;

