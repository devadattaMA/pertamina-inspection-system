import assert from "node:assert/strict";
import test from "node:test";
import { parseLoginInput, parseCreateUserInput, parseUpdateUserInput, isValidNewPassword } from "../app/lib/auth-validation.ts";

test("login validation normalizes email and rejects invalid data",()=>{
  assert.deepEqual(parseLoginInput({email:" ADMIN@example.com ",password:"temp"}),{email:"admin@example.com",password:"temp"});
  assert.equal(parseLoginInput({email:"bad",password:"x"}),null);
});

test("user creation requires valid role, name and temporary password",()=>{
  const input={name:"Inspector A",email:"inspector@example.com",role:"inspector",temporaryPassword:"Temporary-1234"};
  assert.equal(parseCreateUserInput(input)?.mustChangePassword,true);
  assert.equal(parseCreateUserInput({...input,role:"owner"}),null);
  assert.equal(parseCreateUserInput({...input,temporaryPassword:"short"}),null);
});

test("updates validate explicit supported fields only",()=>{
  assert.deepEqual(parseUpdateUserInput({role:"viewer",isActive:false}),{role:"viewer",isActive:false});
  assert.equal(parseUpdateUserInput({}),null);
  assert.equal(parseUpdateUserInput({isActive:"false"}),null);
  assert.equal(isValidNewPassword("Temporary-1234"),true);
  assert.equal(isValidNewPassword("short"),false);
});
