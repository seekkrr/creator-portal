import { api } from "./api";
import type {
    Attribution,
    BillingOverview,
    BlockEntry,
    Business,
    BusinessAnalytics,
    BusinessApplicationItem,
    BusinessCategory,
    BusinessCollab,
    BusinessHub,
    CheckoutPayload,
    CheckoutResult,
    CollabApplication,
    CollabPayload,
    CollabStatus,
    ContentLibrary,
    CreatorSummary,
    InvitePayload,
    Invoice,
    ListApplicationsParams,
    MatchesResponse,
    MemberRole,
    PartnerPortalSettings,
    RedeemCode,
    ReportPayload,
    SubmitBusinessApplicationPayload,
    SubmittedBusinessApplication,
    Subscription,
    UpdateBusinessPayload,
} from "./business.types";

const BASE = "/api/v2/businesses";
const biz = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

/**
 * Partner Portal API client. Every method unwraps the `{ success, ... }`
 * envelope; errors surface as `ApiRequestError` (status / code / details)
 * from the shared axios client — e.g. 402 `QUOTA_EXCEEDED` for plan limits.
 */
export const businessService = {
    // ── Partner Portal settings ──────────────────────────────────────────────

    /** Which Partner Portal sections the admin has switched on (any signed-in user). */
    async partnerPortalSettings(): Promise<PartnerPortalSettings> {
        const res = await api.get<Partial<PartnerPortalSettings>>("/api/v2/config/partner-portal");
        return {
            sections: (res.data.sections ?? {}) as PartnerPortalSettings["sections"],
            default_plan: res.data.default_plan ?? null,
            updated_at: res.data.updated_at ?? null,
        };
    },

    // ── Businesses & team ────────────────────────────────────────────────────

    /** Predefined categories (and sub-categories) a business can pick. */
    async listCategories(): Promise<BusinessCategory[]> {
        const res = await api.get<{ categories?: BusinessCategory[] }>(`${BASE}/categories`);
        return res.data.categories ?? [];
    },

    /** Businesses the signed-in user is a member of. */
    async listMine(): Promise<Business[]> {
        const res = await api.get<{ businesses?: Business[] }>(`${BASE}/mine`);
        return res.data.businesses ?? [];
    },

    async get(businessId: string): Promise<Business> {
        const res = await api.get<{ business: Business }>(biz(businessId));
        return res.data.business;
    },

    async update(businessId: string, payload: UpdateBusinessPayload): Promise<Business> {
        const res = await api.patch<{ business: Business }>(biz(businessId), payload);
        return res.data.business;
    },

    async addMember(businessId: string, email: string, role: Exclude<MemberRole, "owner">): Promise<Business> {
        const res = await api.post<{ business: Business }>(`${biz(businessId)}/members`, { email, role });
        return res.data.business;
    },

    async changeMemberRole(
        businessId: string,
        userId: string,
        role: Exclude<MemberRole, "owner">
    ): Promise<Business> {
        const res = await api.patch<{ business: Business }>(
            `${biz(businessId)}/members/${encodeURIComponent(userId)}`,
            { role }
        );
        return res.data.business;
    },

    async removeMember(businessId: string, userId: string): Promise<void> {
        await api.delete(`${biz(businessId)}/members/${encodeURIComponent(userId)}`);
    },

    /** Best-effort display name for a team member (public user profile). */
    async getMemberName(userId: string): Promise<string | null> {
        const res = await api.get<{ user?: { first_name?: string; last_name?: string; name?: string } }>(
            `/api/v2/users/${encodeURIComponent(userId)}/public`
        );
        const u = res.data.user;
        if (!u) return null;
        const name = u.name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
        return name || null;
    },

    // ── Redeem codes ─────────────────────────────────────────────────────────

    async getRedeemCode(businessId: string, markerId: string): Promise<RedeemCode> {
        const res = await api.get<RedeemCode>(
            `${biz(businessId)}/markers/${encodeURIComponent(markerId)}/redeem-code`
        );
        return pickRedeemCode(res.data);
    },

    /** Link a place that's already on SeekKrr (manager+). */
    async linkPlace(businessId: string, markerId: string): Promise<Business> {
        const res = await api.post<{ business: Business }>(`${biz(businessId)}/places`, { marker_id: markerId });
        return res.data.business;
    },

    /** Remove a place from the business (owner). */
    async unlinkPlace(businessId: string, markerId: string): Promise<Business> {
        const res = await api.delete<{ business: Business }>(`${biz(businessId)}/places/${encodeURIComponent(markerId)}`);
        return res.data.business;
    },

    /** Propose a new place; it's linked automatically once our team approves it. */
    async requestPlace(
        businessId: string,
        body: { title: string; lat: number; lng: number; address?: string; confirm_nearby?: boolean },
    ): Promise<Business> {
        const res = await api.post<{ business: Business }>(`${biz(businessId)}/place-requests`, body);
        return res.data.business;
    },

    async setRedeemCode(businessId: string, markerId: string, code: string): Promise<RedeemCode> {
        const res = await api.put<RedeemCode>(
            `${biz(businessId)}/markers/${encodeURIComponent(markerId)}/redeem-code`,
            { code }
        );
        return pickRedeemCode(res.data);
    },

    // ── Hub & analytics ──────────────────────────────────────────────────────

    async hub(businessId: string): Promise<BusinessHub> {
        const res = await api.get<BusinessHub>(`${biz(businessId)}/hub`);
        const { business, pending_requests, upcoming_visits, redeemed_today, content_to_review, places, usage } =
            res.data;
        return {
            business,
            pending_requests: pending_requests ?? 0,
            upcoming_visits: upcoming_visits ?? [],
            redeemed_today: redeemed_today ?? 0,
            content_to_review: content_to_review ?? 0,
            places: places ?? [],
            usage,
        };
    },

    async analytics(businessId: string, days = 30): Promise<BusinessAnalytics> {
        const res = await api.get<BusinessAnalytics>(`${biz(businessId)}/analytics`, { params: { days } });
        const { checkins, views, funnel, rating } = res.data;
        return { days: res.data.days ?? days, checkins: checkins ?? 0, views, funnel, rating };
    },

    // ── Collabs ──────────────────────────────────────────────────────────────

    async listCollabs(businessId: string, includeArchived = false): Promise<BusinessCollab[]> {
        const res = await api.get<{ collabs?: BusinessCollab[] }>(`${biz(businessId)}/collabs`, {
            params: { include_archived: includeArchived },
        });
        return res.data.collabs ?? [];
    },

    async createCollab(businessId: string, payload: CollabPayload): Promise<BusinessCollab> {
        const res = await api.post<{ collab: BusinessCollab }>(`${biz(businessId)}/collabs`, payload);
        return res.data.collab;
    },

    async updateCollab(businessId: string, collabId: string, payload: CollabPayload): Promise<BusinessCollab> {
        const res = await api.patch<{ collab: BusinessCollab }>(
            `${biz(businessId)}/collabs/${encodeURIComponent(collabId)}`,
            payload
        );
        return res.data.collab;
    },

    async setCollabStatus(businessId: string, collabId: string, status: CollabStatus): Promise<BusinessCollab> {
        const res = await api.post<{ collab: BusinessCollab }>(
            `${biz(businessId)}/collabs/${encodeURIComponent(collabId)}/status`,
            { status }
        );
        return res.data.collab;
    },

    // ── Requests / applications ──────────────────────────────────────────────

    async listApplications(
        businessId: string,
        params: ListApplicationsParams = {}
    ): Promise<BusinessApplicationItem[]> {
        const res = await api.get<{ applications?: BusinessApplicationItem[] }>(`${biz(businessId)}/applications`, {
            params,
        });
        return res.data.applications ?? [];
    },

    async approve(businessId: string, appId: string): Promise<CollabApplication> {
        return appAction(businessId, appId, "approve");
    },

    async decline(businessId: string, appId: string, reason?: string): Promise<CollabApplication> {
        return appAction(businessId, appId, "decline", { reason: reason || null });
    },

    async cancel(businessId: string, appId: string, reason?: string): Promise<CollabApplication> {
        return appAction(businessId, appId, "cancel", { reason: reason || null });
    },

    /** delivered → completed */
    async verify(businessId: string, appId: string): Promise<CollabApplication> {
        return appAction(businessId, appId, "verify");
    },

    async rate(businessId: string, appId: string, score: number, comment?: string): Promise<CollabApplication> {
        return appAction(businessId, appId, "rating", { score, comment: comment || null });
    },

    // ── Proof of value ───────────────────────────────────────────────────────

    async content(businessId: string): Promise<ContentLibrary> {
        const res = await api.get<ContentLibrary>(`${biz(businessId)}/content`);
        return {
            items: res.data.items ?? [],
            total: res.data.total ?? 0,
            full_access: !!res.data.full_access,
        };
    },

    async attribution(businessId: string): Promise<Attribution> {
        const res = await api.get<Attribution>(`${biz(businessId)}/attribution`);
        return {
            totals: res.data.totals ?? { click: 0, app_open: 0, checkin: 0 },
            by_creator: res.data.by_creator ?? [],
            full_breakdown: !!res.data.full_breakdown,
        };
    },

    // ── SeekKrr Match ────────────────────────────────────────────────────────

    async matches(businessId: string, collabId: string, limit = 30): Promise<MatchesResponse> {
        const res = await api.get<MatchesResponse>(`${biz(businessId)}/matches`, {
            params: { collab_id: collabId, limit },
        });
        return { collab_id: res.data.collab_id, matches: res.data.matches ?? [], usage: res.data.usage };
    },

    /** Consumes one reveal from the monthly quota (once per creator per month). */
    async reveal(businessId: string, creatorUserId: string): Promise<CreatorSummary> {
        const res = await api.post<{ creator: CreatorSummary }>(
            `${biz(businessId)}/matches/${encodeURIComponent(creatorUserId)}/reveal`
        );
        return res.data.creator;
    },

    /** Consumes one invite from the monthly quota. */
    async invite(businessId: string, payload: InvitePayload): Promise<CollabApplication> {
        const res = await api.post<{ application: CollabApplication }>(`${biz(businessId)}/invites`, payload);
        return res.data.application;
    },

    // ── Billing ──────────────────────────────────────────────────────────────

    async billing(businessId: string): Promise<BillingOverview> {
        const res = await api.get<BillingOverview>(`${biz(businessId)}/billing`);
        const { subscription, usage, plans, referral_code, can_manage_billing } = res.data;
        return {
            subscription: subscription ?? null,
            usage,
            plans: plans ?? [],
            referral_code: referral_code ?? null,
            can_manage_billing: !!can_manage_billing,
        };
    },

    async startTrial(businessId: string, planCode: "growth" | "pro" = "growth"): Promise<Subscription | null> {
        const res = await api.post<{ subscription: Subscription | null }>(`${biz(businessId)}/billing/trial`, {
            plan_code: planCode,
        });
        return res.data.subscription;
    },

    async checkout(businessId: string, payload: CheckoutPayload): Promise<CheckoutResult> {
        const body: CheckoutPayload = { plan_code: payload.plan_code, period: payload.period };
        if (payload.coupon_code?.trim()) body.coupon_code = payload.coupon_code.trim();
        if (payload.referral_code?.trim()) body.referral_code = payload.referral_code.trim();
        const res = await api.post<CheckoutResult & { success?: boolean }>(
            `${biz(businessId)}/billing/checkout`,
            body
        );
        const data = res.data;
        if ("changed" in data && data.changed) return { changed: true, effective: data.effective };
        const started = data as Exclude<CheckoutResult, { changed: true }>;
        return {
            razorpay_key_id: started.razorpay_key_id,
            subscription_id: started.subscription_id,
            short_url: started.short_url ?? null,
            plan: started.plan,
            period: started.period,
        };
    },

    async cancelSubscription(businessId: string): Promise<Subscription | null> {
        const res = await api.post<{ subscription: Subscription | null }>(`${biz(businessId)}/billing/cancel`);
        return res.data.subscription;
    },

    async invoices(businessId: string): Promise<Invoice[]> {
        const res = await api.get<{ invoices?: Invoice[] }>(`${biz(businessId)}/billing/invoices`);
        return res.data.invoices ?? [];
    },

    /** Printable GST invoice as HTML (fetched with auth, rendered via a blob URL). */
    async invoiceHtml(businessId: string, invoiceId: string): Promise<string> {
        const res = await api.get<string>(`${biz(businessId)}/billing/invoices/${encodeURIComponent(invoiceId)}`, {
            responseType: "text",
            headers: { Accept: "text/html" },
            transformResponse: [(d: unknown) => d],
        });
        return typeof res.data === "string" ? res.data : String(res.data ?? "");
    },

    // ── Blocks & reports ─────────────────────────────────────────────────────

    async listBlocks(businessId: string): Promise<BlockEntry[]> {
        const res = await api.get<{ blocks?: BlockEntry[] }>(`${biz(businessId)}/blocks`);
        return res.data.blocks ?? [];
    },

    async blockCreator(businessId: string, creatorUserId: string): Promise<void> {
        await api.post(`${biz(businessId)}/blocks`, { creator_user_id: creatorUserId });
    },

    async unblockCreator(businessId: string, creatorUserId: string): Promise<void> {
        await api.delete(`${biz(businessId)}/blocks/${encodeURIComponent(creatorUserId)}`);
    },

    async report(payload: ReportPayload): Promise<void> {
        await api.post("/api/v2/reports", {
            ...payload,
            details: payload.details?.trim() || null,
        });
    },

    // ── Applications to list a business ──────────────────────────────────────

    async submitApplication(payload: SubmitBusinessApplicationPayload): Promise<SubmittedBusinessApplication> {
        const res = await api.post<{ application: SubmittedBusinessApplication }>(
            "/api/v2/business-applications",
            payload
        );
        return res.data.application;
    },
};

function pickRedeemCode(data: RedeemCode): RedeemCode {
    return {
        marker_id: data.marker_id,
        code: data.code ?? null,
        is_set: !!data.is_set,
        set_at: data.set_at ?? null,
    };
}

async function appAction(
    businessId: string,
    appId: string,
    action: "approve" | "decline" | "cancel" | "verify" | "rating",
    body?: Record<string, unknown>
): Promise<CollabApplication> {
    const res = await api.post<{ application: CollabApplication }>(
        `${biz(businessId)}/applications/${encodeURIComponent(appId)}/${action}`,
        body
    );
    return res.data.application;
}
