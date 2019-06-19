/**
 * A Map with two keys as opposed to one.  Order does matter, so `map.get(k1, k2) !== map.get(k2, k1)` for example.
 */
export class TwoKeyMap<K, V> {
    /**
     * Internal storage for the TwoKeyMap, which is just a Map of Maps.
     */
    private values: Map<K, Map<K, V>> = new Map();

    /**
     * Creates a relationship between `[k1, k2]` and `v`, overwriting if one already exists.
     */
    public set (k1: K, k2: K, val: V) {
        if (!this.values.get(k1))
            this.values.set(k1, new Map());

        this.values.get(k1).set(k2, val);
    }

    /**
     * Gets the value associated with `[k1, k2]`.
     */
    public get (k1: K, k2: K) {
        if (!this.values.get(k1))
            return null;
        else
            return this.values.get(k1).get(k2);
    }

    /**
     * Similar to JavaScript's `Map.prototype.forEach`, but with slightly different arguments.
     */
    public forEach (handler: (k1: K, k2: K, val: V) => void) {
        this.values.forEach((internalMap, externalKey) => {
            internalMap.forEach((value, internalKey) => {
                handler(externalKey, internalKey, value);
            });
        });
    }
}
