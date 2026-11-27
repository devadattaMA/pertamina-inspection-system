import assert from "node:assert/strict";
import test from "node:test";
import { requirePermission } from "../app/lib/auth.ts";

test("direct viewer request to user administration is forbidden",async()=>{
  const viewer={id:"00000000-0000-4000-8000-000000000001",name:"Viewer",email:"viewer@example.com",role:"viewer",mustChangePassword:false};
  const result=await requirePermission(new Request("https://example.test/api/admin/users"),"manage_users",async()=>viewer);
  assert.equal(result.authorized,false);
  if(!result.authorized) assert.equal(result.response.status,403);
});

test("admin can pass account management authorization",async()=>{
  const admin={id:"00000000-0000-4000-8000-000000000003",name:"Admin",email:"admin@example.com",role:"admin",mustChangePassword:false};
  const result=await requirePermission(new Request("https://example.test/api/admin/users"),"manage_users",async()=>admin);
  assert.equal(result.authorized,true);
});

test("a pending password change blocks protected workspace permissions",async()=>{
  const pending={id:"00000000-0000-4000-8000-000000000004",name:"New User",email:"new@example.com",role:"admin",mustChangePassword:true};
  const result=await requirePermission(new Request("https://example.test/api/assets"),"read_workspace",async()=>pending);
  assert.equal(result.authorized,false);
  if(!result.authorized) assert.equal(result.response.status,403);
});

test("an unauthenticated direct request is denied",async()=>{
  const result=await requirePermission(new Request("https://example.test/api/admin/users"),"manage_users",async()=>null);
  assert.equal(result.authorized,false);
  if(!result.authorized) assert.equal(result.response.status,401);
});
