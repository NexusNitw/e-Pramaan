import { seedDefaultUsers } from '../controllers/authController.js';

export const seedDatabaseIfEmpty = async () => {
  try {
    // Always ensure default demonstration user accounts exist
    await seedDefaultUsers();
    console.log('[Database Seeder] Default demonstration user accounts verified.');
  } catch (err) {
    console.warn('[Database Seeder] Non-blocking seeding error:', err.message);
  }
};
