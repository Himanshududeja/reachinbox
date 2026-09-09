import pool from "../src/config/database";
import { scheduleEmail } from "../src/services/email.service";

const scheduledAt = new Date(Date.now() + 30000);

const create = (index: number) =>
  scheduleEmail(
    1,
    1,
    `concurrent-${index}@example.com`,
    `Concurrent Test ${index}`,
    `Concurrent test email ${index}`,
    scheduledAt,
    crypto.randomUUID()
  );

const main = async () => {
  const start = Date.now();

  const results = await Promise.all([
    create(1),
    create(2),
    create(3),
    create(4),
    create(5)
  ]);

  console.log("Created:", results);
  console.log(`Time taken: ${Date.now() - start}ms`);

  await pool.end();
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
