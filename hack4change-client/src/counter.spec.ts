import { describe, it, expect } from "vitest";
import counter from "./counter";

describe("counter", () => {
    it("starts at 0", () => {
        expect(counter().value()).toBe(0);
    });

    it("increments by 1 when incrementing", () => {
        expect(counter().increment().value()).toBe(1);
    });

    it("decrements by 1 when decrementing", () => {
        expect(counter().increment().increment().decrement().value()).toBe(1);
    });

    it("does not decrement below 0", () => {
        expect(counter().decrement().value()).toBe(0);
    });
});