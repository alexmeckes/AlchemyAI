import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { craftRoutes } from './routes/craft';
import { ingredientRoutes } from './routes/ingredients';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true
});

// Register CORS
fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(craftRoutes);
fastify.register(ingredientRoutes);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();