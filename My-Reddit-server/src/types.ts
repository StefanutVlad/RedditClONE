import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";
import { Session } from "inspector";

interface SessionData {
  userId: number;
}

export type MyContext = {
  req: Request & { session: Session & Partial<SessionData> & { userId?: number }}; //joins types
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  voteLoader: ReturnType<typeof createVoteLoader>;
};