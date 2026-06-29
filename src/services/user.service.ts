import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import type { User } from "@/types";

/**
 * Fields the creator portal may update on the user's own account. Name and
 * avatar are the only "common" identity fields editable here; everything else
 * on the user profile is managed in the mobile app.
 */
export interface UpdateUserProfilePayload {
    first_name?: string;
    last_name?: string;
    profile_image?: { url: string; public_id?: string } | null;
}

export const userService = {
    /**
     * Update the current user's own profile.
     * PUT /api/v2/users/me → { success, user }
     * Note: the returned user uses to_public_dict() (no `role`); callers should
     * merge only the fields they changed into the auth store, not replace it.
     */
    async updateMe(payload: UpdateUserProfilePayload): Promise<User> {
        const res = await api.put<{ user: User }>(API_ENDPOINTS.USERS.ME, payload);
        return res.data.user;
    },
};
