import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const purge = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas:', mongoose.connection.name);

    const db = mongoose.connection.db;

    const appRes = await db.collection('applications').deleteMany({});
    console.log(`Deleted ${appRes.deletedCount} applications.`);

    const docRes = await db.collection('documentrecords').deleteMany({});
    console.log(`Deleted ${docRes.deletedCount} document records.`);

    const instRes = await db.collection('institutions').deleteMany({});
    console.log(`Deleted ${instRes.deletedCount} institutions.`);

    const auditRes = await db.collection('audittrails').deleteMany({});
    console.log(`Deleted ${auditRes.deletedCount} audit trails.`);

    const userCount = await db.collection('users').countDocuments({});
    console.log(`Retained ${userCount} users for authentication.`);

    console.log('Database purge complete!');
    process.exit(0);
  } catch (err) {
    console.error('Purge error:', err);
    process.exit(1);
  }
};

purge();
