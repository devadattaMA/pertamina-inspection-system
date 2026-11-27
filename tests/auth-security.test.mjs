import assert from "node:assert/strict";
import test from "node:test";
import { createSessionToken, createSignedSessionCookie, hashSessionToken, readCookie, verifySessionCookie } from "../app/lib/auth-security.ts";

const secret="a-test-secret-with-more-than-thirty-two-characters";

test("session tokens are random and stored only as hashes",()=>{
  const token=createSessionToken();
  assert.equal(token.length>=40,true);
  assert.notEqual(hashSessionToken(token),token);
});

test("signed cookies round trip and reject tampering and expiry",()=>{
  const token=createSessionToken();
  const cookie=createSignedSessionCookie({token,expiresAt:2000000000,mustChangePassword:true},secret);
  assert.deepEqual(verifySessionCookie(cookie,secret,1900000000),{token,expiresAt:2000000000,mustChangePassword:true});
  const [payload,signature]=cookie.split(".");
  const tampered=signature[0]==="a"?"b"+signature.slice(1):"a"+signature.slice(1);
  assert.equal(verifySessionCookie(payload+"."+tampered,secret,1900000000),null);
  assert.equal(verifySessionCookie(cookie,secret,2000000001),null);
});

test("cookie extraction matches exact cookie names",()=>{
  assert.equal(readCookie("theme=dark; phm_session=abc.def; other=x","phm_session"),"abc.def");
  assert.equal(readCookie("not_phm_session=bad","phm_session"),undefined);
});
