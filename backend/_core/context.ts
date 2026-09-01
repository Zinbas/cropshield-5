import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../database/schema";
import { getUserByOpenId } from "../db";
import { getLocalSessionOpenId, LOCAL_SESSION_COOKIE, toSafeUser } from "../localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authorization = opts.req.headers.authorization;
    const bearerToken = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
    const localOpenId = await getLocalSessionOpenId(opts.req.cookies?.[LOCAL_SESSION_COOKIE] ?? bearerToken);
    if (localOpenId) {
      const localUser = await getUserByOpenId(localOpenId);
      user = localUser && localUser.accountStatus === "active" ? toSafeUser(localUser) as User : null;
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
