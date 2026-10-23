import { useState, type ReactNode } from "react";
import { Banknote, Construction, Info, Landmark, Percent, Receipt, Scale, Wallet } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@components/ui";
import type { EarningsBooking } from "@services/experience.types";
import { useBusiness } from "../context";
import { useBusinessDetail } from "../queries";
import { errorMessage, formatDate, plural } from "../utils";
import { Banner, KpiCard, PageHeader, Pill, SectionCard, inputClass } from "../components/bits";
import { useEarnings } from "../experiences/queries";
import { formatMoney, isRouteMissing, paymentStatusLabel } from "../experiences/money";

const th = "py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap";
const td = "py-3 px-4 text-sm align-top";

const pct = (n: number) => `${Math.round(n * 100) / 100}%`;

function NotLive() {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200">
            <EmptyState
                icon={<Construction className="w-7 h-7" />}
                title="This isn't available on the server yet"
                description="Your earnings will show here once the server update is live."
            />
        </div>
    );
}

function Money({ value, strong = false }: { value: number | null; strong?: boolean }) {
    return <span className={`tabular-nums whitespace-nowrap ${strong ? "font-semibold text-neutral-900" : "text-neutral-700"}`}>{formatMoney(value)}</span>;
}

function TableShell({ head, children, minWidth }: { head: ReactNode; children: ReactNode; minWidth: string }) {
    return (
        <div className="-mx-5 -mb-5 overflow-x-auto border-t border-neutral-100">
            <table className={`w-full text-left border-collapse ${minWidth}`}>
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>{head}</tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">{children}</tbody>
            </table>
        </div>
    );
}

function BookingRow({ b }: { b: EarningsBooking }) {
    const status = paymentStatusLabel(b.payment_status);
    return (
        <tr className="hover:bg-neutral-50/70">
            <td className={td}>
                <p className="font-mono font-semibold text-neutral-900">{b.code ?? b.id.slice(-8)}</p>
                <p className="text-xs text-neutral-400">{formatDate(b.paid_at ?? b.date)}</p>
                {b.source === "offline" && <Pill className="mt-1 bg-violet-50 text-violet-700 border-violet-200">Offline</Pill>}
            </td>
            <td className={`${td} max-w-[16rem]`}>
                <p className="font-medium text-neutral-900 truncate">{b.experience_title || "Experience"}</p>
                <p className="text-xs text-neutral-500">
                    {[b.customer_name, b.people ? plural(b.people, "person", "people") : null].filter(Boolean).join(" · ")}
                </p>
            </td>
            <td className={`${td} text-right`}>
                <Money value={b.subtotal} />
            </td>
            <td className={`${td} text-right`}>
                {b.gst_amount ? (
                    <span className="tabular-nums whitespace-nowrap text-neutral-700">
                        {formatMoney(b.gst_amount)}
                        {b.gst_rate_pct !== null && <span className="text-xs text-neutral-400"> ({pct(b.gst_rate_pct)})</span>}
                    </span>
                ) : (
                    <span className="text-xs text-neutral-400">No GST</span>
                )}
            </td>
            <td className={`${td} text-right`}>
                <Money value={b.total} />
            </td>
            <td className={`${td} text-right`}>
                <span className="tabular-nums whitespace-nowrap text-neutral-700">
                    {b.commission === null ? "—" : `− ${formatMoney(b.commission)}`}
                    {b.commission_pct !== null && <span className="text-xs text-neutral-400"> ({pct(b.commission_pct)})</span>}
                </span>
            </td>
            <td className={`${td} text-right`}>
                <Money value={b.net} strong />
            </td>
            <td className={td}>{status ? <Pill className={status.className}>{status.label}</Pill> : "—"}</td>
        </tr>
    );
}

/**
 * Earnings (owners and managers): what customers paid for the business's
 * experiences, SeekKrr's commission, and the payouts SeekKrr has made.
 */
export function EarningsPage() {
    const { business, canManage } = useBusiness();
    const detail = useBusinessDetail();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const earnings = useEarnings({ from: from || undefined, to: to || undefined }, canManage);

    if (!canManage) {
        return (
            <div className="space-y-6">
                <PageHeader title="Earnings" />
                <Banner tone="info" icon={<Info className="w-5 h-5" />} title="Only owners and managers can see earnings">
                    Ask the owner of {business.name} if you need these numbers.
                </Banner>
            </div>
        );
    }

    const data = earnings.data;
    const commissionPct = data?.commission_pct ?? detail.data?.commission_pct ?? business.commission_pct ?? null;
    const summary = data?.summary;
    const filtered = !!from || !!to;

    return (
        <div className="space-y-6">
            <PageHeader title="Earnings" description="What customers paid for your experiences and what SeekKrr has paid you." />

            <Banner
                tone="info"
                icon={<Info className="w-5 h-5" />}
                title={`SeekKrr collects payments and pays you out${commissionPct !== null ? `; commission ${pct(commissionPct)}` : ""}.`}
            >
                Customers pay in the SeekKrr app when they book. SeekKrr keeps its commission on the price before GST — with or without GST —
                and transfers the rest to your bank account. GST isn't commissioned and isn't part of your earnings.
            </Banner>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
                <div>
                    <label htmlFor="earnings-from" className="block text-sm font-medium text-neutral-700 mb-1.5">
                        From
                    </label>
                    <input id="earnings-from" type="date" className={`${inputClass} w-auto`} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="earnings-to" className="block text-sm font-medium text-neutral-700 mb-1.5">
                        To
                    </label>
                    <input id="earnings-to" type="date" className={`${inputClass} w-auto`} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </div>
                {filtered && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setFrom("");
                            setTo("");
                        }}
                    >
                        All time
                    </Button>
                )}
            </div>

            {earnings.isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} height={92} />
                        ))}
                    </div>
                    <Skeleton height={220} />
                </div>
            ) : earnings.isError ? (
                isRouteMissing(earnings.error) ? (
                    <NotLive />
                ) : (
                    <div className="bg-white rounded-2xl border border-neutral-200">
                        <ErrorState message={errorMessage(earnings.error, "We couldn't load your earnings.")} onRetry={() => void earnings.refetch()} />
                    </div>
                )
            ) : data && summary ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <KpiCard label="Paid by customers" value={formatMoney(summary.gross)} icon={<Receipt className="w-5 h-5" />} hint={summary.refunds ? `${formatMoney(summary.refunds)} refunded` : undefined} />
                        <KpiCard
                            label="SeekKrr commission"
                            value={formatMoney(summary.commission)}
                            icon={<Percent className="w-5 h-5" />}
                            tone="violet"
                            hint={commissionPct !== null ? `${pct(commissionPct)} of the price before GST` : "On the price before GST"}
                        />
                        <KpiCard label="Your earnings" value={formatMoney(summary.net)} icon={<Scale className="w-5 h-5" />} tone="green" hint="After commission and refunds" />
                        <KpiCard label="Paid out to you" value={formatMoney(summary.paid_out)} icon={<Banknote className="w-5 h-5" />} tone="blue" />
                        <KpiCard
                            label="Balance"
                            value={formatMoney(summary.balance)}
                            icon={<Wallet className="w-5 h-5" />}
                            tone="amber"
                            hint={summary.balance > 0.004 ? "SeekKrr will pay this out" : "Nothing waiting"}
                        />
                        {summary.gst_collected !== null && (
                            <KpiCard label="GST collected" value={formatMoney(summary.gst_collected)} icon={<Landmark className="w-5 h-5" />} hint="Not part of your earnings" />
                        )}
                    </div>

                    <SectionCard title="Paid bookings" description={data.bookings.length ? plural(data.bookings.length, "booking") : undefined}>
                        {data.bookings.length === 0 ? (
                            <EmptyState
                                icon={<Receipt className="w-7 h-7" />}
                                title={filtered ? "No paid bookings in these dates" : "No paid bookings yet"}
                                description="Bookings show here once customers pay for them in the SeekKrr app."
                            />
                        ) : (
                            <TableShell
                                minWidth="min-w-[920px]"
                                head={
                                    <>
                                        <th className={th}>Booking</th>
                                        <th className={th}>Experience</th>
                                        <th className={`${th} text-right`}>Price</th>
                                        <th className={`${th} text-right`}>GST</th>
                                        <th className={`${th} text-right`}>Total paid</th>
                                        <th className={`${th} text-right`}>Commission</th>
                                        <th className={`${th} text-right`}>You earn</th>
                                        <th className={th}>Payment</th>
                                    </>
                                }
                            >
                                {data.bookings.map((b, i) => (
                                    <BookingRow key={b.id || i} b={b} />
                                ))}
                            </TableShell>
                        )}
                    </SectionCard>

                    <SectionCard title="Payouts" description="Bank transfers from SeekKrr to you.">
                        {data.payouts.length === 0 ? (
                            <EmptyState
                                icon={<Banknote className="w-7 h-7" />}
                                title="No payouts yet"
                                description="SeekKrr transfers your balance to your bank account and lists each transfer here."
                            />
                        ) : (
                            <TableShell
                                minWidth="min-w-[560px]"
                                head={
                                    <>
                                        <th className={th}>Paid on</th>
                                        <th className={`${th} text-right`}>Amount</th>
                                        <th className={th}>Reference</th>
                                        <th className={th}>Note</th>
                                    </>
                                }
                            >
                                {[...data.payouts]
                                    .sort((a, b) => (b.paid_on ?? "").localeCompare(a.paid_on ?? ""))
                                    .map((p, i) => (
                                        <tr key={p.id || i} className="hover:bg-neutral-50/70">
                                            <td className={`${td} whitespace-nowrap font-medium text-neutral-900`}>{formatDate(p.paid_on)}</td>
                                            <td className={`${td} text-right`}>
                                                <Money value={p.amount} strong />
                                            </td>
                                            <td className={`${td} font-mono text-xs text-neutral-700`}>{p.reference || "—"}</td>
                                            <td className={`${td} text-neutral-600`}>{p.note || "—"}</td>
                                        </tr>
                                    ))}
                            </TableShell>
                        )}
                    </SectionCard>
                </>
            ) : null}
        </div>
    );
}
