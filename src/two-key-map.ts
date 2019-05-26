/**
 * A Map with two keys.
 */
export class TwoKeyMap<K, V> {
    private values: Map<K, Map<K, V>> = new Map();

    public set(k1: K, k2: K, val: V) {
        if (!this.values.get(k1))
            this.values.set(k1, new Map());

        this.values.get(k1).set(k2, val);
    }

    public get(k1: K, k2: K) {
        if (!this.values.get(k1))
            return null;
        else
            return this.values.get(k1).get(k2);
    }
}
