// Opt-in integration test. Uses two real TEST accounts and a PUBLIC key, never a service key.
// Credentials come only from shell environment; do not commit or paste them into chat.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "TEST_A_EMAIL",
  "TEST_A_PASSWORD",
  "TEST_B_EMAIL",
  "TEST_B_PASSWORD",
];
for (const name of required)
  if (!process.env[name]) throw new Error(`Missing ${name}`);
const make = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
const a = make(),
  b = make(),
  anon = make();
let aId, bId;
const own = [];
try {
  for (const [c, prefix] of [
    [a, "A"],
    [b, "B"],
  ]) {
    const { data, error } = await c.auth.signInWithPassword({
      email: process.env[`TEST_${prefix}_EMAIL`],
      password: process.env[`TEST_${prefix}_PASSWORD`],
    });
    assert.ifError(error);
    if (prefix === "A") aId = data.user.id;
    else bId = data.user.id;
  }
  assert.notEqual(aId, bId, "Use two different test accounts");
  const insert = await a
    .from("leads")
    .insert({ user_id: aId, name: "RLS integration test", status: "New" })
    .select()
    .single();
  assert.ifError(insert.error);
  const id = insert.data.id;
  own.push(id);
  assert.equal(
    (await a.from("leads").select("id").eq("id", id)).data?.length,
    1,
    "A can read own row",
  );
  assert.equal(
    (await b.from("leads").select("id").eq("id", id)).data?.length,
    0,
    "B cannot read A row",
  );
  assert.ok(
    (await b.from("leads").insert({ user_id: aId, name: "Forbidden insert" }))
      .error,
    "B cannot insert for A",
  );
  const crossUpdate = await b
    .from("leads")
    .update({ name: "Forbidden update" })
    .eq("id", id)
    .select();
  assert.ifError(crossUpdate.error);
  assert.equal(crossUpdate.data.length, 0);
  const crossDelete = await b.from("leads").delete().eq("id", id).select();
  assert.ifError(crossDelete.error);
  assert.equal(crossDelete.data.length, 0);
  assert.ok(
    (await a.from("leads").update({ user_id: bId }).eq("id", id)).error,
    "Ownership cannot be reassigned",
  );
  assert.ok(
    (await anon.from("leads").select("*")).error,
    "Anonymous SELECT denied",
  );
  assert.ok(
    (await anon.from("leads").insert({ user_id: aId, name: "Anonymous" }))
      .error,
    "Anonymous INSERT denied",
  );
  assert.ok(
    (await anon.from("leads").update({ name: "Anonymous" }).eq("id", id)).error,
    "Anonymous UPDATE denied",
  );
  assert.ok(
    (await anon.from("leads").delete().eq("id", id)).error,
    "Anonymous DELETE denied",
  );
  const updated = await a
    .from("leads")
    .update({ status: "Won", name: "Updated RLS test" })
    .eq("id", id)
    .select()
    .single();
  assert.ifError(updated.error);
  assert.equal(updated.data.status, "Won");
  assert.equal(
    (await a.from("leads").select("name").eq("id", id)).data?.[0].name,
    "Updated RLS test",
  );
  const deleted = await a.from("leads").delete().eq("id", id).select("id");
  assert.ifError(deleted.error);
  assert.equal(deleted.data.length, 1);
  console.log(
    "PASS: own CRUD, cross-account isolation, immutable ownership, anonymous denial.",
  );
} finally {
  for (const id of own) await a.from("leads").delete().eq("id", id);
  await a.auth.signOut();
  await b.auth.signOut();
}
