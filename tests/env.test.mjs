import assert from "node:assert/strict";
import test from "node:test";
import { getAuthSecret, getDatabaseUrl, getDirectUrl } from "../app/lib/env.ts";

test("pooled runtime URL requires Neon pooler and SSL",()=>{
  const valid="postgresql://user:pass@ep-app-pooler.region.aws.neon.tech/db?sslmode=require";
  assert.equal(getDatabaseUrl({DATABASE_URL:valid}),valid);
  assert.throws(()=>getDatabaseUrl({DATABASE_URL:"postgresql://u:p@ep-app.region.aws.neon.tech/db?sslmode=require"}),/pooled Neon hostname/);
  assert.throws(()=>getDatabaseUrl({DATABASE_URL:"postgresql://u:p@ep-app-pooler.region.aws.neon.tech/db"}),/sslmode=require/);
});

test("direct URL rejects pooler hosts and requires SSL",()=>{
  const valid="postgresql://user:pass@ep-app.region.aws.neon.tech/db?sslmode=require";
  assert.equal(getDirectUrl({DIRECT_URL:valid}),valid);
  assert.throws(()=>getDirectUrl({DIRECT_URL:"postgresql://u:p@ep-app-pooler.region.aws.neon.tech/db?sslmode=require"}),/direct Neon hostname/);
});

test("auth secret must have at least 32 characters",()=>{
  const valid="this-is-a-test-secret-that-is-at-least-32-chars";
  assert.equal(getAuthSecret({AUTH_SECRET:valid}),valid);
  assert.throws(()=>getAuthSecret({AUTH_SECRET:"short"}),/at least 32 characters/);
});
