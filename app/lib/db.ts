import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./env";

export const sql = neon(getDatabaseUrl());
