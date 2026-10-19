import { api } from "./api";

export interface CreatorApplicationPayload {
    name: string;
    email: string;
    phone?: string | null;
    social_links: string[];
}

export interface SubmittedCreatorApplication {
    id: string;
    status: string;
}

/** Creator intake (`POST /api/v2/creator-applications`); reviewed by the SeekKrr team. */
export const creatorApplicationService = {
    async submit(payload: CreatorApplicationPayload): Promise<SubmittedCreatorApplication> {
        const res = await api.post<{ application: SubmittedCreatorApplication }>("/api/v2/creator-applications", payload);
        return res.data.application;
    },
};
