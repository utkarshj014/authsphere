import { createClient, defineScript } from "redis";
import { env } from "../config/env.js";

export const rateLimitIncrExpire = defineScript({
  NUMBER_OF_KEYS: 1,
  SCRIPT: `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
    return { count, redis.call('TTL', KEYS[1]) }
  `,
  parseCommand(parser, key: string, expireSeconds: string | number) {
    parser.push(key, String(expireSeconds));
  },
  transformReply(reply: [number, number]): [number, number] {
    return reply;
  },
});

export const redis = createClient({
  url: env.REDIS_URL,
  scripts: {
    rateLimitIncrExpire,
  },
});
