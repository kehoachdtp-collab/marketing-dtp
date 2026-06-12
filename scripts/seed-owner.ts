import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ownerEmail = process.env.SEED_OWNER_EMAIL || "kehoachdtp@gmail.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "123456";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id,email,role")
    .eq("email", ownerEmail)
    .maybeSingle();

  if (existingProfile) {
    await admin
      .from("profiles")
      .update({ role: "owner", status: "pending_password_change", must_change_password: true, updated_at: new Date().toISOString() })
      .eq("id", existingProfile.id);
    console.log(`Owner profile already exists and was normalized: ${ownerEmail}`);
    return;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  });

  if (error || !created.user) {
    throw new Error(error?.message || "Could not create owner auth user");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    email: ownerEmail,
    role: "owner",
    status: "pending_password_change",
    must_change_password: true,
  });

  if (profileError) throw profileError;
  console.log(`Owner created: ${ownerEmail}. Temporary password must be changed on first login.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed owner failed");
  process.exit(1);
});
