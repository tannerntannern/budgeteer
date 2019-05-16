/**
 * Data structure that keeps track of numeric balances between arbitrary items.
 */
export default class BalanceMap<T> {
    private balances: Map<T, Map<T, number>> = new Map();

    /**
     * Returns the numeric balance between a & b, inferring if necessary.  Returns undefined if there is no balance.
     */
    public get(a: T, b: T) {
        const bal = this.balances;

        if (bal.get(a))
            return bal.get(a).get(b);
        else if (bal.get(b))
            return -bal.get(b).get(a);
        else
            return undefined;
    }

    /**
     * Sets the balance between a & b.
     */
    public set(a: T, b: T, balance: number) {
        const bal = this.balances;

        if (!bal.get(a)) {
            if (!bal.get(b)) {
                const map = new Map();
                bal.set(a, map);
                map.set(b, balance);
            } else {
                bal.get(b).set(a, -balance);
            }
        } else {
            bal.get(a).set(b, balance);
        }
    }

    /**
     * Shifts the balance between a & b by the given delta.
     */
    public shift(a: T, b: T, delta: number) {
        const bal = this.balances;

        if (!bal.get(a)) {
            if (!bal.get(b)) {
                const map = new Map();
                bal.set(a, map);
                map.set(b, delta);
            } else {
                const bbal = bal.get(b);
                bbal.set(a, -bbal.get(a) + delta);
            }
        } else {
            const abal = bal.get(a);
            abal.set(b, abal.get(b) + delta);
        }
    }
}
