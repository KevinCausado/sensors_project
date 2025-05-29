import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database.js';
import routes from './routes/index.js';
import * as models from './models/index.js';
import { seedData } from './config/seedData.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes - Prefijamos todas las rutas con /api
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Database initialization and server start
const PORT = 3001;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database and create tables
    await sequelize.sync({ force: true }); // This will drop and recreate all tables
    console.log('Database synchronized successfully.');
    
    // Load initial data
    await seedData(models);
    console.log('Initial data loaded successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();