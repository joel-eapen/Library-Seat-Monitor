import express, { type Express } from 'express';
import type { PushDispatcher } from './dispatcher.js';
import {
  deleteSubscriptionSchema,
  subscriptionInputSchema,
  testNotificationSchema,
  type SubscriptionStore,
} from './subscriptions.js';
import type { PollStatus, PushSender } from './types.js';

type AppDependencies = {
  subscriptions: SubscriptionStore;
  dispatcher: PushDispatcher;
  sender: PushSender;
  getStatus: () => PollStatus;
};

function validationError(
  issues: Array<{ path: PropertyKey[]; message: string }>
) {
  return {
    error: 'Invalid request',
    details: issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/', (_request, response) => {
    response.json({
      name: 'NITJ library seat push relay',
      endpoints: [
        'GET /health',
        'POST /api/subscriptions',
        'DELETE /api/subscriptions',
        'POST /api/test-notification',
      ],
    });
  });

  app.get('/health', (_request, response) => {
    const status = dependencies.getStatus();
    response.json({
      ...status,
      subscriptions: dependencies.subscriptions.count(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.post('/api/subscriptions', async (request, response) => {
    const parsed = subscriptionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json(validationError(parsed.error.issues));
      return;
    }

    const subscription = await dependencies.subscriptions.upsert(
      parsed.data.token,
      parsed.data.floors
    );
    dependencies.dispatcher.clear(subscription.token);

    response.json({
      ok: true,
      subscription: {
        floors: subscription.floors,
        updatedAt: subscription.updatedAt,
      },
    });
  });

  app.delete('/api/subscriptions', async (request, response) => {
    const parsed = deleteSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json(validationError(parsed.error.issues));
      return;
    }

    await dependencies.subscriptions.remove(parsed.data.token);
    dependencies.dispatcher.clear(parsed.data.token);
    response.json({ ok: true });
  });

  app.post('/api/test-notification', async (request, response) => {
    const parsed = testNotificationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json(validationError(parsed.error.issues));
      return;
    }

    try {
      const result = await dependencies.sender.send([
        {
          token: parsed.data.token,
          title: 'Library seat alerts are working',
          body: 'This is a test push from the NITJ library seat relay.',
          data: { type: 'test' },
        },
      ]);

      if (result.invalidTokens.length > 0) {
        await dependencies.subscriptions.remove(parsed.data.token);
        response.status(410).json({
          error: 'Push token is no longer registered',
        });
        return;
      }

      response.json({ ok: true });
    } catch (error) {
      console.error('Could not send test notification:', error);
      response.status(502).json({
        error: 'Could not reach the push provider',
      });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not found' });
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction
    ) => {
      if (
        error instanceof SyntaxError &&
        'status' in error &&
        (error as { status?: number }).status === 400
      ) {
        response.status(400).json({ error: 'Invalid JSON body' });
        return;
      }

      console.error('Unhandled request error:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}
