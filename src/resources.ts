import {Mixin} from 'ts-mixer';
import BalanceMap from './balance-map';

abstract class Node {
    constructor(public name: string) {}
}

class Consumable extends Node {
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

    public suppliesAsMuchAsPossible() {
        const supplier = this;
        
        return {
            to(supplyable: Supplyable) {
                supplyable.consumesAsMuchAsPossible().from(supplier);
                return supplier;
            }
        }
    }
}

class Supplyable extends Node {
    public readonly suppliers = {
        contracts: [] as {consumable: Consumable, amount: number}[],
        volunteers: [] as Consumable[],
        leftovers: [] as Consumable[]
    };

    public consumes(amount: number) {
        const consumer = this;

        return {
            from(consumable: Consumable) {
                consumer.suppliers.contracts.push({consumable, amount});
                return consumer;
            }
        }
    }

    public consumesAsMuchAsNeeded() {
        const consumer = this;

        return {
            from(consumable: Consumable) {
                consumer.suppliers.volunteers.push(consumable);
                return consumer;
            }
        }
    }

    public consumesAsMuchAsPossible() {
        const consumer = this;

        return {
            from(consumable: Consumable) {
                consumer.suppliers.leftovers.push(consumable);
                return consumer;
            }
        }
    }
}

export class Supply extends Consumable {
    constructor(name: string, public initialBalance: number) {
        super(name);
    }
}

export class Consumer extends Supplyable {}

export class Conduit extends Mixin(Consumable, Supplyable) {}

function isConduit(node: Node): node is Conduit {
    return node instanceof Conduit;
}

function isSupply(node: Node): node is Supply {
    return node instanceof Supply;
}

function isSupplyable(node: Node): node is Supplyable {
    return !!node['suppliers'];
}

function isConsumer(node: Node): node is Consumer {
    return node instanceof Supply;
}

export class Network {
    private nodes: Node[];

    constructor(...nodes: Node[]) {
        this.nodes = nodes;
    }

    public add(...nodes: Node[]) {
        this.nodes.push(...nodes);
    }

    public resolveBalances() {
        const supplies = new Map<Node, number>();       // Keeps track of the balance on each node
        const consumption = new BalanceMap<Node>();     // Keeps track of how much each node is consuming from each other node
        for (let i = 0; i < this.nodes.length; i ++) {
            const ni = this.nodes[i];
            supplies.set(ni, isSupply(ni) ? ni.initialBalance : 0);

            for (let j = i + 1; j < this.nodes.length; j ++) {
                const nj = this.nodes[j];
                consumption.set(ni, nj, 0);
            }
        }

        const consumers = this.nodes.filter(node => isConsumer(node)) as Consumer[];
        consumers.forEach(node => {
            meetContracts(node);
            requestFromVolunteers(node);
        });
        consumers.forEach(node => consumeLeftovers(node));

        function meetContracts(node: Supplyable) {
            node.suppliers.contracts.forEach(contract => {
                const deficit = contract.amount - consumption.get(node, contract.consumable);
                consume(contract.consumable, node, deficit);
            });
        }

        function requestFromVolunteers(node: Supplyable) {
            // TODO
        }

        function consumeLeftovers(node: Supplyable) {
            // TODO
        }

        function consume(supplier: Consumable, consumer: Supplyable, amount: number) {
            // If our supplier is a conduit, force it to meet contracts before proceeding
            if (isConduit(supplier)) meetContracts(supplier);

            const supplierAmount = supplies.get(supplier);
            const diff = supplierAmount - amount;

            if (diff >= 0) {
                transfer(supplier, consumer, amount);
            } else {
                if (isSupply(supplier)) {
                    throw new Error(`"${consumer.name}" requires ${amount} from "${supplier.name}" which only has ${supplierAmount}`);
                } else {
                    // TODO
                }
            }
        }

        function transfer(from: Consumable, to: Supplyable, amount: number) {
            const fromSupply = supplies.get(from);
            const toSupply = supplies.get(to);

            supplies.set(from, fromSupply - amount);
            supplies.set(to, toSupply + amount);
            consumption.shift(to, from, amount);
        }
    }
}

let s = new Supply('Wages', 2000);
let c = new Consumer('Rent').consumes(1322).from(s);
let r = new Consumer('Remaining').consumesAsMuchAsPossible().from(s);

let network = new Network(s, c, r);
