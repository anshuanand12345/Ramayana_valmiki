import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let clientPromise;

function getClient() {
  clientPromise ??= new MongoClient(env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 15_000 })
    .connect()
    .then((client) => {
      logger.info({ db: env.MONGODB_DB }, 'mongodb connected');
      return client;
    });
  return clientPromise;
}

export async function getDb() {
  return (await getClient()).db(env.MONGODB_DB);
}

export async function closeDb() {
  if (!clientPromise) return;
  await (await clientPromise).close();
  clientPromise = undefined;
}
