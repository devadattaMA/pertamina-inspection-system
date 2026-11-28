import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, rolesForPermission } from "../app/lib/permissions.ts";

test("viewer is read-only",()=>{
  assert.equal(hasPermission("viewer","read_workspace"),true);
  assert.equal(hasPermission("viewer","write_inspections"),false);
  assert.equal(hasPermission("viewer","manage_users"),false);
});

test("inspector has operational but not account administration permissions",()=>{
  assert.equal(hasPermission("inspector","write_inspections"),true);
  assert.equal(hasPermission("inspector","import_data"),true);
  assert.equal(hasPermission("inspector","manage_users"),false);
});

test("only admin can manage users or system health",()=>{
  assert.deepEqual(rolesForPermission("manage_users"),["admin"]);
  assert.deepEqual(rolesForPermission("view_system_health"),["admin"]);
});
