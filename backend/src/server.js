import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/db.js';

dotenv.config();

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Closing server.`);
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Backend startup failed.');
    console.error(error.message);

    if (error.message?.includes('Could not connect to any servers in your MongoDB Atlas cluster')) {
      console.error(
        'Atlas DNS resolved, but your network may be blocking outbound MongoDB traffic on port 27017. Try another network, mobile hotspot, VPN, or a local MongoDB URI.'
      );
    }

    process.exit(1);
  }
}

startServer();
