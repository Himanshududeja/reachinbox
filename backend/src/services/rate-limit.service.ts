import redis from "../config/redis";

interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterMs: number;
}

const getHourData = () => {
  const now = Date.now();
  const hourStart =
    Math.floor(now / 3600000) * 3600000;
  const nextHour = hourStart + 3600000;

  return {
    hourStart,
    nextHour
  };
};

export const reserveHourlySlot = async (
  sender: string,
  limit: number
): Promise<RateLimitResult> => {
  const { hourStart, nextHour } = getHourData();
  const key = `rate-limit:${sender}:${hourStart}`;

  const result = (await redis.eval(
    `
    local count = tonumber(redis.call("GET", KEYS[1]) or "0")
    local limit = tonumber(ARGV[1])
    local expiry = tonumber(ARGV[2])

    if count >= limit then
      return {0, count}
    end

    count = redis.call("INCR", KEYS[1])

    if count == 1 then
      redis.call("PEXPIREAT", KEYS[1], expiry)
    end

    return {1, count}
    `,
    1,
    key,
    limit,
    nextHour
  )) as [number, number];

  const allowed = Number(result[0]) === 1;
  const count = Number(result[1]);

  return {
    allowed,
    count,
    retryAfterMs: allowed
      ? 0
      : Math.max(0, nextHour - Date.now())
  };
};

export const releaseHourlySlot = async (
  sender: string
) => {
  const { hourStart } = getHourData();
  const key = `rate-limit:${sender}:${hourStart}`;

  await redis.eval(
    `
    local count = tonumber(redis.call("GET", KEYS[1]) or "0")

    if count <= 0 then
      return 0
    end

    return redis.call("DECR", KEYS[1])
    `,
    1,
    key
  );
};

export const shouldNotifyHourlyLimit = async (
  sender: string
) => {
  const { hourStart, nextHour } = getHourData();

  const key =
    `rate-limit-notified:${sender}:${hourStart}`;

  const result = await redis.set(
    key,
    "1",
    "PXAT",
    nextHour,
    "NX"
  );

  return result === "OK";
};
