import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";

export interface ReelSubmission {
    url: string;
    submittedBy?: string;
}

export interface ReelSubmissionResponse {
    success: boolean;
    message: string;
    submissionId?: string;
}

export const reelService = {
    /**
     * Submit a reel URL for review
     * Backend will send email notification via SMTP
     */
    async submitReelForReview(url: string): Promise<ReelSubmissionResponse> {
        const response = await api.post<ReelSubmissionResponse>(
            API_ENDPOINTS.REELS.SUBMIT,
            { url }
        );
        return response.data;
    },
};
