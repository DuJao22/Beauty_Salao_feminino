import cron from 'node-cron';
import { getDb } from '../db/database';
import { addDays, format, parseISO, isAfter, isBefore, addHours } from 'date-fns';

export function initCronJobs() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    if (!process.env.SQLITE_CLOUD_CONNECTION_STRING) {
      console.log('[NODE-CRON] Skipping check: SQLITE_CLOUD_CONNECTION_STRING not configured.');
      return;
    }

    console.log('Running scheduled notifications check...');
    try {
      const db = await getDb();
      const now = new Date();
      const tomorrow = addDays(now, 1);
      const inOneHour = addHours(now, 1);

      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      const todayStr = format(now, 'yyyy-MM-dd');

      // 1. Check for appointments tomorrow (1 day before)
      
      // 1 Day Before Notifications
      const tomorrowAppointments = await db.all(`
        SELECT a.*, s.name as service_name, u.name as user_name, u.phone as user_phone
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.date = ? AND a.status = 'Agendado' AND a.notified_1day = 0
      `, tomorrowStr) as any[];

      for (const app of tomorrowAppointments) {
        console.log(`[NOTIFICAÇÃO SMS/WHATSAPP] Lembrete: Olá ${app.client_name}, você tem um agendamento amanhã (${app.date}) às ${app.time} para ${app.service_name}.`);
        await db.run('UPDATE appointments SET notified_1day = 1 WHERE id = ?', app.id);
      }

      // 1 Hour Before Notifications
      const todayAppointments = await db.all(`
        SELECT a.*, s.name as service_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.date = ? AND a.status = 'Agendado' AND a.notified_1hour = 0
      `, todayStr) as any[];

      for (const app of todayAppointments) {
        const appDateTime = parseISO(`${app.date}T${app.time}`);
        // If appointment is within the next 60 minutes
        if (isAfter(appDateTime, now) && isBefore(appDateTime, addHours(now, 1.25))) {
          console.log(`[NOTIFICAÇÃO SMS/WHATSAPP] Lembrete: Olá ${app.client_name}, seu agendamento para ${app.service_name} é em menos de 1 hora (às ${app.time}).`);
          await db.run('UPDATE appointments SET notified_1hour = 1 WHERE id = ?', app.id);
        }
      }

    } catch (error) {
      console.error('Error running cron jobs:', error);
    }
  });
}
