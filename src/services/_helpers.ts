import type { Paginated } from "@/types";

/**
 * V2 list endpoints return FLAT pagination under an entity-specific key, e.g.
 *   { success, quests: [...], total, page, page_size, total_pages }
 * Normalize any of those into the portal's generic {@link Paginated} shape.
 */
export function toPaginated<T>(body: Record<string, unknown>, key: string): Paginated<T> {
    const items = (body?.[key] as T[]) ?? [];
    return {
        items,
        total: (body?.total as number) ?? items.length,
        page: (body?.page as number) ?? 1,
        page_size: (body?.page_size as number) ?? items.length,
        total_pages: (body?.total_pages as number) ?? 0,
    };
}

/**
 * Some V2 models (Narrative, TaskConfig, StepReward) serialize via the base
 * `to_dict()`, which emits the raw Mongo `_id` rather than `id`. Normalize to
 * `id` at the service boundary so the rest of the portal only ever sees `id`.
 */
export function normalizeId<T extends { id: string }>(doc: Record<string, unknown>): T {
    if (doc && doc.id == null && doc._id != null) {
        const { _id, ...rest } = doc;
        return { id: String(_id), ...rest } as unknown as T;
    }
    return doc as unknown as T;
}
