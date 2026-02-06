import { getClientPromise } from "@/lib/mongodb";

export async function ensureIndexes() {

  const DB_NAME = process.env.DB_NAME;
  const client = await getClientPromise();
  const db = client.db(DB_NAME);
  const collection = db.collection("user");
  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex({ username: 1 }, { unique: true });
}