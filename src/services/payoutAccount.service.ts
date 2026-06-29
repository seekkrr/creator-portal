import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import type {
    PayoutAccount,
    CreatePayoutAccountPayload,
    UpdatePayoutAccountPayload,
} from "@/types";

export const payoutAccountService = {
    /**
     * The current creator's own payout accounts.
     * GET /api/v2/payout-accounts/me → { success, accounts }
     */
    async listMine(): Promise<PayoutAccount[]> {
        const res = await api.get<{ accounts: PayoutAccount[] }>(
            API_ENDPOINTS.PAYOUT_ACCOUNTS.ME
        );
        return res.data.accounts ?? [];
    },

    /** Create a payout account (starts pending_verification). */
    async createAccount(payload: CreatePayoutAccountPayload): Promise<PayoutAccount> {
        const res = await api.post<{ account: PayoutAccount }>(
            API_ENDPOINTS.PAYOUT_ACCOUNTS.CREATE,
            payload
        );
        return res.data.account;
    },

    async getAccount(accountId: string): Promise<PayoutAccount> {
        const res = await api.get<{ account: PayoutAccount }>(
            API_ENDPOINTS.PAYOUT_ACCOUNTS.BY_ID(accountId)
        );
        return res.data.account;
    },

    async updateAccount(
        accountId: string,
        payload: UpdatePayoutAccountPayload
    ): Promise<PayoutAccount> {
        const res = await api.put<{ account: PayoutAccount }>(
            API_ENDPOINTS.PAYOUT_ACCOUNTS.BY_ID(accountId),
            payload
        );
        return res.data.account;
    },

    /** Soft delete by default; `hard` requires super_admin on the backend. */
    async deleteAccount(accountId: string, hard = false): Promise<void> {
        await api.delete(API_ENDPOINTS.PAYOUT_ACCOUNTS.BY_ID(accountId), { params: { hard } });
    },

    /** Mark this account as the creator's primary payout destination. */
    async setPrimary(accountId: string): Promise<PayoutAccount> {
        const res = await api.post<{ account: PayoutAccount }>(
            API_ENDPOINTS.PAYOUT_ACCOUNTS.SET_PRIMARY(accountId)
        );
        return res.data.account;
    },
};
