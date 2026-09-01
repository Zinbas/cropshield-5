import type { Request, Response } from "express";
import { createBaseApp } from "./app";

const appPromise = Promise.resolve(createBaseApp());

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}
