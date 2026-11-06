import { describe, expect, it } from "vitest";
import type { ExperienceSlot } from "@services/experience.types";
import { copyGroups, dayStats, layoutDay, slotState } from "./schedule";

const NOW = new Date(2026, 9, 27, 9, 0);

function slot(over: Partial<ExperienceSlot>): ExperienceSlot {
    return {
        id: "s",
        experience_id: "x",
        option_id: "lap6",
        date: "2026-10-28",
        start_time: "10:00",
        end_time: "10:25",
        capacity: 8,
        booked: 0,
        price: 0,
        status: "open",
        ...over,
    };
}

const exp = { options: [{ id: "lap6", name: "6 laps" }, { id: "lap12", name: "12 laps" }] as never };

describe("slotState", () => {
    it("reads a slot the way the team needs to see it", () => {
        expect(slotState(slot({}), NOW)).toBe("open");
        expect(slotState(slot({ booked: 2 }), NOW)).toBe("booked");
        expect(slotState(slot({ booked: 8 }), NOW)).toBe("full");
        expect(slotState(slot({ booked: 2, unavailable_reason: "private_booked" }), NOW)).toBe("full");
        expect(slotState(slot({ taken_by: { slot_id: "o" } as never }), NOW)).toBe("taken");
        expect(slotState(slot({ blocked: true, booked: 3 }), NOW)).toBe("blocked");
        expect(slotState(slot({ unavailable_reason: "price_not_set" }), NOW)).toBe("no_price");
        expect(slotState(slot({ status: "cancelled" }), NOW)).toBe("cancelled");
        expect(slotState(slot({ date: "2026-10-26" }), NOW)).toBe("past");
    });
});

describe("dayStats", () => {
    it("counts open slots only", () => {
        expect(dayStats([slot({ booked: 2 }), slot({ capacity: 4 }), slot({ status: "cancelled", capacity: 10 })])).toEqual({
            slots: 2,
            booked: 2,
            capacity: 12,
            pct: 17,
        });
        expect(dayStats([]).pct).toBeNull();
    });
});

describe("layoutDay", () => {
    it("puts each option in its lane, in the experience's order, on whole-hour axes", () => {
        const day = layoutDay(
            [
                slot({ id: "b", option_id: "lap12", start_time: "10:00", end_time: "10:50" }),
                slot({ id: "a", start_time: "09:40", end_time: "10:05" }),
                slot({ id: "c", start_time: "10:05", end_time: "10:30" }),
            ],
            exp
        );
        expect(day.start).toBe(9 * 60);
        expect(day.end).toBe(11 * 60);
        expect(day.lanes.map((l) => l.label)).toEqual(["6 laps", "12 laps"]);
        expect(day.lanes[0]?.rows).toHaveLength(1);
        expect(day.lanes[0]?.rows[0]?.map((p) => [p.slot.id, p.left, p.width])).toEqual([
            ["a", 40, 25],
            ["c", 65, 25],
        ]);
    });

    it("gives overlapping slots of one option their own rows", () => {
        const day = layoutDay(
            [slot({ id: "a", start_time: "10:00", end_time: "11:00" }), slot({ id: "b", start_time: "10:30", end_time: "11:30" })],
            exp
        );
        expect(day.lanes[0]?.rows.map((r) => r.map((p) => p.slot.id))).toEqual([["a"], ["b"]]);
    });
});

describe("copyGroups", () => {
    it("groups a day's open slots by option and spots, each time once", () => {
        expect(
            copyGroups([
                slot({ start_time: "11:00", end_time: "11:25" }),
                slot({}),
                slot({ option_id: "lap12", capacity: 4, end_time: "10:50" }),
                slot({ status: "cancelled", start_time: "12:00", end_time: "12:25" }),
            ])
        ).toEqual([
            { option_id: "lap6", capacity: 8, times: [{ start: "10:00", end: "10:25" }, { start: "11:00", end: "11:25" }] },
            { option_id: "lap12", capacity: 4, times: [{ start: "10:00", end: "10:50" }] },
        ]);
    });
});
