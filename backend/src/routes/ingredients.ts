import { FastifyInstance } from 'fastify';
import { INGREDIENTS } from '../types/ingredients';

export async function ingredientRoutes(fastify: FastifyInstance) {
    // Get ingredient data by ID
    fastify.get('/api/ingredients/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        const ingredient = INGREDIENTS[id];
        if (!ingredient) {
            return reply.status(404).send({ error: 'Ingredient not found' });
        }

        return ingredient;
    });

    // Get all ingredients
    fastify.get('/api/ingredients', async (request, reply) => {
        return Object.values(INGREDIENTS);
    });
} 