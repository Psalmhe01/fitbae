import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Live integration checks use only the requested, marked QA users. Every write
// is rolled back, so their current workouts, conversations and connection stay intact.
export async function verifyDatabaseBehavior(client) {
  const users = await client.query("select id, email from auth.users where email = any($1::text[]) and raw_app_meta_data->>'fitbae_test_account' = 'true'", [["adminboo@fitbae.test", "adminbabe@fitbae.test"]]);
  assert.equal(users.rows.length, 2, "Both marked QA users must exist");
  const owner = users.rows.find((row) => row.email === "adminboo@fitbae.test").id;
  const partner = users.rows.find((row) => row.email === "adminbabe@fitbae.test").id;
  const key = randomUUID();
  const asUser = async (id, anonymous = false) => {
    await client.query("reset role");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
    await client.query(anonymous ? "set local role anon" : "set local role authenticated");
  };
  const denied = async (query, values = []) => {
    await client.query("savepoint expected_denial");
    let code;
    try { await client.query(query, values); } catch (error) { code = error.code; }
    await client.query("rollback to savepoint expected_denial");
    assert.equal(code, "42501", "Expected an access denial");
  };
  await client.query("begin; set local lock_timeout = '2s'; set local statement_timeout = '5s'");
  try {
    await asUser(owner);
    assert.deepEqual((await client.query("select user_id from public.profiles")).rows.map((row) => row.user_id), [owner]);
    assert.equal((await client.query("select * from public.find_partner_by_email($1)", ["adminbabe@fitbae.test"])).rows[0]?.user_id, partner);
    console.log("PASS: full profiles are private; limited partner lookup works.");

    const plan = (await client.query("select id from public.workout_plans where user_id = $1 order by created_at desc limit 1", [owner])).rows[0];
    assert.ok(plan);
    const payload = { plan_id: plan.id, duration_seconds: 60, notes: "Rollback-only QA check" };
    const logs = [{ exercise_name: "Plank", equipment_id: "bodyweight", set_number: 1, actual_reps: 0, actual_value: 45, actual_unit: "seconds", weight_lbs: 0, skipped: false }];
    const save = "select public.finalize_workout($1::jsonb, $2::jsonb, $3::uuid) as id";
    const saved = (await client.query(save, [JSON.stringify(payload), JSON.stringify(logs), key])).rows[0].id;
    assert.equal((await client.query(save, [JSON.stringify(payload), JSON.stringify(logs), key])).rows[0].id, saved);
    assert.equal((await client.query("select count(*)::int as count from public.workout_sessions where idempotency_key = $1", [key])).rows[0].count, 1);
    const sets = (await client.query("select actual_unit, actual_value::text from public.exercise_logs where session_id = $1", [saved])).rows;
    assert.deepEqual(sets, [{ actual_unit: "seconds", actual_value: "45" }]);
    await asUser(partner);
    assert.equal((await client.query("select id from public.workout_sessions where id = $1", [saved])).rows.length, 0);
    await denied("insert into public.exercise_logs (session_id, user_id, exercise_name, set_number) values ($1, $2, 'QA', 1)", [saved, partner]);
    console.log("PASS: workout save/retry is atomic and private; duration units survive.");

    await asUser(owner);
    let relation = (await client.query("select id, status, recipient_id from public.partnerships where (requester_id = $1 and recipient_id = $2) or (requester_id = $2 and recipient_id = $1)", [owner, partner])).rows[0];
    if (!relation) relation = (await client.query("insert into public.partnerships (requester_id, recipient_id) values ($1, $2) returning id, status, recipient_id", [owner, partner])).rows[0];
    if (relation.status === "declined") {
      await client.query("update public.partnerships set requester_id = $1, recipient_id = $2, status = 'pending' where id = $3", [owner, partner, relation.id]);
      relation = { ...relation, status: "pending", recipient_id: partner };
    }
    if (relation.status === "pending") {
      await asUser(relation.recipient_id);
      await client.query("update public.partnerships set status = 'accepted' where id = $1", [relation.id]);
    }
    for (const [sender, recipient] of [[owner, partner], [partner, owner]]) {
      await asUser(sender);
      const note = (await client.query("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $2, 'Rollback-only QA note') returning id", [sender, recipient])).rows[0];
      await client.query("insert into public.partner_reactions (sender_id, recipient_id, message) values ($1, $2, 'Rollback-only QA encouragement')", [sender, recipient]);
      await denied("insert into public.partner_notes (author_id, recipient_id, content) values ($1, $1, 'Invalid recipient')", [sender]);
      await asUser(recipient);
      assert.equal((await client.query("update public.partner_notes set seen = true where id = $1 returning id", [note.id])).rowCount, 1);
      await denied("update public.partner_notes set content = 'Forged' where id = $1", [note.id]);
    }
    console.log("PASS: chat and encouragement work both ways; read receipts cannot rewrite content.");
    await asUser("", true);
    await denied("select public.get_connected_partner()");
    await denied("select public.get_partner_avatar($1)", [owner]);
    console.log("PASS: anonymous clients cannot call private partner functions.");
  } finally {
    await client.query("rollback");
  }
  assert.equal((await client.query("select count(*)::int as count from public.workout_sessions where idempotency_key = $1", [key])).rows[0].count, 0);
  console.log("All live behavior checks passed. QA writes were rolled back.");
}
