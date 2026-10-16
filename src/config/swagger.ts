import path from 'path';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

/**
 * OpenAPI (Swagger) definition for the Retail BI MVP backend.
 *
 * Route documentation lives next to the handlers as `@openapi` JSDoc comments
 * and is discovered at runtime by swagger-jsdoc.
 *
 * The route glob targets the extension of the running entry point so that the
 * TypeScript sources (under `tsx`) and the compiled JavaScript (under `node`)
 * are each documented exactly once, avoiding duplicate paths.
 */
const routeExtension = path.extname(__filename); // '.ts' under tsx, '.js' under node

const routeGlob = path
  .join(__dirname, '..', 'routes', `*.routes${routeExtension}`)
  .split(path.sep)
  .join('/');

const options: swaggerJsdoc.OAS3Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Retail BI MVP API',
      version: '0.1.0',
      description:
        'Retail Business Intelligence MVP backend. Revenue counts DELIVERED sales only and ' +
        'equals SUM(sale_item.quantity * sale_item.unit_price - sale_item.discount).',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? 3000}`,
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service and database health' },
      { name: 'Ontology', description: 'Palantir-style object and metric endpoints' },
      { name: 'Actions', description: 'Palantir-style write actions on ontology objects' },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' }, message: { type: 'string' } },
          required: ['error'],
        },
        Basis: {
          type: 'object',
          description: 'Explicit definition of how a metric was computed.',
          properties: {
            statusFilter: { type: 'string', example: 'DELIVERED' },
            formula: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [routeGlob],
};

export const swaggerSpec = swaggerJsdoc(options);
