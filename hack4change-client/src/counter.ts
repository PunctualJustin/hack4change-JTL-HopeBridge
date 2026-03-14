/**
 * This is a sample counter used to demonstrate the unit testing functionality of the sample repository. It allows for incrementing and decrementing a given value.
 * 
 * @param startCount The value that the counter contains.
 * @returns A counter instance.
 */
export const counter = (startCount = 0) => {
    /**
     * Provides a new counter with the count value incremented by 1.
     * @returns The new counter.
     */
    const increment = () =>
        counter(startCount + 1);

    /**
     * Provides a new counter with the count value decremented by 1. If the value is already 0, the new counter will also contain 0.
     * @returns the new counter.
     */
    const decrement = () =>
        counter(Math.max(0, startCount - 1));

    /**
     * @returns The value contained by the counter.
     */
    const value = () =>
        startCount;

    return {
        increment,
        decrement,
        value
    };
};

export default counter;