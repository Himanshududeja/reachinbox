import pool from "../src/config/database";
import { scheduleBulkEmails } from "../src/services/email.service";

const main = async () => {
  const emails = [];

  const scheduledAt = new Date(Date.now() + 30000);

  for (let i = 1; i <= 5; i++) {
    emails.push({
      recipient: `ratetest-${i}@example.com`,
      subject: `Load Test Email ${i}`,
      body: `Load test email ${i}`,
      scheduledAt
    });
  }

  const start = Date.now();

  const emailIds = await scheduleBulkEmails(
    1,
    1,
    emails
  );

  const duration = Date.now() - start;

  console.log(`Scheduled ${emailIds.length} emails`);
  console.log(`Time taken: ${duration}ms`);

  await pool.end();
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});