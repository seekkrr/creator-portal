import { api } from "./api";
import { API_ENDPOINTS } from "@config/api";
import { normalizeId, toPaginated } from "./_helpers";
import type {
    TaskConfig,
    CreateTaskConfigPayload,
    UpdateTaskConfigPayload,
    Paginated,
} from "@/types";

export interface ListTaskConfigsParams {
    marker_id?: string;
    quest_id?: string;
    task_type?: string;
    page?: number;
    page_size?: number;
}

export const taskService = {
    /** GET /api/v2/tasks → { task_configs, total, page, page_size, total_pages } */
    async listTaskConfigs(params: ListTaskConfigsParams = {}): Promise<Paginated<TaskConfig>> {
        const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.TASKS.BASE, { params });
        const page = toPaginated<Record<string, unknown>>(res.data, "task_configs");
        return { ...page, items: page.items.map((t) => normalizeId<TaskConfig>(t)) };
    },

    /** All task configs for a marker. GET /api/v2/tasks/by-marker/{id} → { task_configs } */
    async getConfigsForMarker(markerId: string): Promise<TaskConfig[]> {
        const res = await api.get<{ task_configs: Record<string, unknown>[] }>(
            API_ENDPOINTS.TASKS.BY_MARKER(markerId)
        );
        return (res.data.task_configs ?? []).map((t) => normalizeId<TaskConfig>(t));
    },

    /** All task configs for a quest. GET /api/v2/tasks/by-quest/{id} → { task_configs } */
    async getConfigsForQuest(questId: string): Promise<TaskConfig[]> {
        const res = await api.get<{ task_configs: Record<string, unknown>[] }>(
            API_ENDPOINTS.TASKS.BY_QUEST(questId)
        );
        return (res.data.task_configs ?? []).map((t) => normalizeId<TaskConfig>(t));
    },

    async createTaskConfig(payload: CreateTaskConfigPayload): Promise<TaskConfig> {
        const res = await api.post<{ task_config: Record<string, unknown> }>(
            API_ENDPOINTS.TASKS.CREATE,
            payload
        );
        return normalizeId<TaskConfig>(res.data.task_config);
    },

    async getTaskConfig(taskId: string): Promise<TaskConfig> {
        const res = await api.get<{ task_config: Record<string, unknown> }>(
            API_ENDPOINTS.TASKS.BY_ID(taskId)
        );
        return normalizeId<TaskConfig>(res.data.task_config);
    },

    async updateTaskConfig(
        taskId: string,
        payload: UpdateTaskConfigPayload
    ): Promise<TaskConfig> {
        const res = await api.put<{ task_config: Record<string, unknown> }>(
            API_ENDPOINTS.TASKS.BY_ID(taskId),
            payload
        );
        return normalizeId<TaskConfig>(res.data.task_config);
    },

    /** Soft delete by default; `hard` requires elevated permission. Returns void. */
    async deleteTaskConfig(taskId: string, hard = false): Promise<void> {
        await api.delete(API_ENDPOINTS.TASKS.BY_ID(taskId), { params: { hard } });
    },

    /** Flip the is_active flag (owner/admin). */
    async toggleActive(taskId: string): Promise<TaskConfig> {
        const res = await api.post<{ task_config: Record<string, unknown> }>(
            API_ENDPOINTS.TASKS.TOGGLE_ACTIVE(taskId)
        );
        return normalizeId<TaskConfig>(res.data.task_config);
    },
};
