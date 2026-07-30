import { Badge } from "@/components/ui/Badge";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { requireProfile } from "@/lib/auth-helpers";
import { buildIuranViews, buildRutinViews } from "@/lib/kas";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole, Iuran, PaymentStatus } from "@/lib/types";
import {
  currentPeriodKey,
  formatDate,
  formatPeriodLabel,
  formatRp,
  KAS_RUTIN_TARGET,
  payStateLabel,
  payStateTone,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data saya" };

export default async function SayaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const periodKey = currentPeriodKey();

  const [paymentsRes, iuransRes] = await Promise.all([
    supabase
      .from("payment_status")
      .select("*, iuran:iuran(*)")
      .eq("user_id", profile.id)
      .order("paid_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("iuran")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false }),
  ]);

  const payments = (paymentsRes.data ?? []) as PaymentStatus[];
  const iurans = (iuransRes.data ?? []) as Iuran[];
  const role = profile.role as AppRole;

  const [rutin] = buildRutinViews(
    [profile.id],
    periodKey,
    payments,
    KAS_RUTIN_TARGET,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Data saya
        </h1>
        <p className="mt-2 text-sm text-muted">
          Informasi pribadi & status pembayaran.
        </p>
      </div>

      <Card>
        <CardTitle>{profile.name}</CardTitle>
        <CardDesc>{profile.email}</CardDesc>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{ROLE_LABEL[role]}</Badge>
          {profile.nis ? <Badge tone="muted">NISN {profile.nis}</Badge> : null}
        </div>
      </Card>

      <Card>
        <CardTitle>Kas rutin minggu ini</CardTitle>
        <CardDesc>{formatPeriodLabel(periodKey)}</CardDesc>
        {rutin ? (
          <div className="mt-4 row-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone={payStateTone(rutin.state)}>
                {payStateLabel(rutin.state, rutin.sisa, rutin.creditOut)}
              </Badge>
              <p className="text-sm font-semibold">
                {formatRp(rutin.paidAmount)} / {formatRp(rutin.due)}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted">Target minggu</dt>
                <dd className="font-semibold">{formatRp(rutin.baseTarget)}</dd>
              </div>
              <div>
                <dt className="text-muted">
                  {rutin.carryIn < 0 ? "Kredit lalu" : "Utang lalu"}
                </dt>
                <dd className="font-semibold">
                  {formatRp(Math.abs(rutin.carryIn))}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Sisa kurang</dt>
                <dd className="font-semibold">{formatRp(rutin.sisa)}</dd>
              </div>
              <div>
                <dt className="text-muted">
                  {rutin.creditOut > 0 ? "Kredit sisa" : "Utang akumulasi"}
                </dt>
                <dd className="font-semibold">
                  {formatRp(
                    rutin.creditOut > 0 ? rutin.creditOut : rutin.totalDebt,
                  )}
                </dd>
              </div>
            </dl>
            {rutin.due === 0 && rutin.creditOut > 0 ? (
              <p className="mt-2 text-xs text-muted">
                Kredit menutup tagihan minggu ini — tidak perlu bayar. Sisa
                kredit {formatRp(rutin.creditOut)} lanjut ke minggu depan.
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Iuran khusus</CardTitle>
        <CardDesc>Status bayar iuran aktif</CardDesc>
        {iurans.length === 0 ? (
          <div className="mt-4">
            <Empty title="Tidak ada iuran aktif" />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {iurans.map((i) => {
              const [v] = buildIuranViews(
                [profile.id],
                i.id,
                i.target_amount,
                payments,
              );
              return (
                <li
                  key={i.id}
                  className="row-soft flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <div>
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted">
                      Target {formatRp(i.target_amount)}
                      {i.deadline ? ` · tenggat ${formatDate(i.deadline)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={payStateTone(v.state)}>
                      {payStateLabel(v.state, v.sisa)}
                    </Badge>
                    <p className="mt-1 text-sm font-semibold">
                      {formatRp(v.paidAmount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
