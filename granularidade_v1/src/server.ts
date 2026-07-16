import { serve } from '@hono/node-server';
import { app } from './main';

const port = 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Product API ouvindo em http://localhost:${info.port}/api/v1/products`);
});
