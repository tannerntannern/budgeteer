import {Mixin} from 'ts-mixer';

class Node {
    constructor(public name: string) {}
}

class Consumable {
    public supplies(amount: number) {
        const supplier = this;

        return {
            to(supplyable: Supplyable) {
                supplyable.consumes(amount).from(supplier);
                return supplier;
            }
        }
    }

    public suppliesAsMuchAsNeeded() {
        const supplier = this;

        return {
            to(supplyable: Supplyable) {
                supplyable.consumesAsMuchAsNeeded().from(supplier);
                return supplier;
            }
        }
    }

    public suppliesRemaining() {
        const supplier = this;
        
        return {
            to(supplyable: Supplyable) {
                supplyable.consumesRemaining().from(supplier);
                return supplier;
            }
        }
    }
}

class Supplyable {
    protected suppliers = {
        contracted: [] as {consumable: Consumable, amount: number}[],
        onCall: [] as Consumable[],
        volunteering: [] as Consumable[]
    };

    public consumes(amount: number) {
        const consumer = this;

        return {
            from(consumable: Consumable) {
                consumer.suppliers.contracted.push({consumable, amount});
                return consumer;
            }
        }
    }

    public consumesAsMuchAsNeeded() {
        const consumer = this;

        return {
            from(consumable: Consumable) {
                consumer.suppliers.onCall.push(consumable);
                return consumer;
            }
        }
    }

    public consumesRemaining() {
        const consumer = this;

        return {
            from(consumable: Consumable) {
                consumer.suppliers.volunteering.push(consumable);
                return consumer;
            }
        }
    }
}

export class Supply extends Mixin(Node, Consumable) {
    constructor(name: string, public amount: number) {
        super(name);
    }
}

export class Consumer extends Mixin(Node, Supplyable) {}

export class Conduit extends Mixin(Node, Consumable, Supplyable) {}

class ResultantNode {
    public inputs: {node: ResultantNode, amount: number}[] = [];
    public outputs: {node: ResultantNode, amount: number}[] = [];

    constructor(public name: string) {}
}

export class Network {
    constructor(private nodes: Node[] = []) {}

    public add(...nodes: Node[]) {
        this.nodes.push(...nodes);
    }

    public getResultantNodes(): ResultantNode[] {
        const nodeMap = new Map<Node, ResultantNode>();
        this.nodes.forEach(node => nodeMap.set(node, new ResultantNode(node.name)));

        // TODO: ...

        return [];
    }
}

// let s = new Supply('Wages', 2000);
// let c = new Consumer('Rent').consumes(1322).from(s);
// let r = new Consumer('Remaining').consumesRemaining().from(s);
