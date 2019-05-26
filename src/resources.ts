import { Variable, Solver, Operator, Strength, Expression } from 'kiwi.js';
import { TwoKeyMap } from './two-key-map';
  
type Supply = 'supply';
type Consumer = 'consumer';
type Pipe = 'pipe';
type Supplyable = Consumer | Pipe;
type Consumable = Supply | Pipe;
type NodeType = Supply | Consumer | Pipe;

type To = { to: (node: Node<Supplyable>) => Node<Consumable> };
type From = { from: (node: Node<Consumable>) => Node<Supplyable> };

type NodeBase = { name: string, type: NodeType };
type Node<T extends NodeType = NodeType> = NodeBase & (
    T extends Consumable ? {
        supplies: (amount: number) => To,
        suppliesAsMuchAsNecessary: () => To,
        suppliesAsMuchAsPossible: () => To,
    }
    : T extends Supplyable ? {
        consumes: (amount: number) => From,
        consumesAsMuchAsNecessary: () => From,
        consumesAsMuchAsPossible: () => From,
    }
    : {}
);

/**
 * Maps each Node to the Set of its suppliers.
 */
const suppliers: Map<Node<Supplyable>, Set<Node<Consumable>>> = new Map();

/**
 * Maps each Node to the Set of its consumers.
 */
const consumers: Map<Node<Consumable>, Set<Node<Supplyable>>> = new Map();

/**
 * Maps each Node to its balance.
 */
const balances: Map<Node, Variable> = new Map();

/**
 * Maps a pair of Nodes to the amount transferred between them.
 */
const transfers: TwoKeyMap<Node, Variable> = new TwoKeyMap();

/**
 * Array of functions that setup constraints on the solver.  Due to the nature of some of these constraints,
 * they can't be applied until all the nodes exist, which is why they have to be batched up in functions.
 */
const constraints: (() => void)[] = [];

/**
 * Constraint solver that does all the heavy lifting.
 */
const solver = new Solver();

/**
 * Returns an Expression that represents the total value consumed by the given node's consumers.
 */
function sumOfConsumption (node: Node<Consumable>): Expression {
    let result = new Expression(0);

    consumers.get(node).forEach(consumer => {
        result = result.plus(transfers.get(node, consumer))
    });

    return result;
}

/**
 * Returns an Expression that represents the total value supplied by the given node's suppliers.
 */
function sumOfSupply (node: Node<Supplyable>): Expression {
    let result = new Expression(0);

    suppliers.get(node).forEach(supplier => {
        result = result.plus(transfers.get(supplier, node))
    });

    return result;
}

const consumableMixin = (node): Node<Consumable> => {
    node.supplies = (amount: number) => ({
        to: (supplyable: Node<Supplyable>) => {
            suppliers.get(supplyable).add(node);
            consumers.get(node).add(supplyable);
            
            transfers.set(node, supplyable, new Variable(`T(${node.name}, ${supplyable.name})`));
            transfers.set(supplyable, node, new Variable(`T(${supplyable.name}, ${node.name})`));

            // ...

            return node;
        }
    });

    node.suppliesAsMuchAsNecessary = () => ({
        to: (supplyable: Node<Supplyable>) => {
            // ...
        }
    });

    node.suppliesAsMuchAsPossible = () => ({
        to: (supplyable: Node<Supplyable>) => {
            // ...
        }
    });

    return node;
}

const supplyableMixin = (node): Node<Supplyable> => {
    node.consumes = (amount: number) => ({
        from: (consumable: Node<Consumable>) => {
            // ...
        }
    });

    node.consumesAsMuchAsNecessary = () => ({
        from: (consumable: Node<Consumable>) => {
            // ...
        }
    });

    node.consumesAsMuchAsPossible = () => ({
        from: (consumable: Node<Consumable>) => {
            // ...
        }
    })

    return node;
}

function supply (name: string, capacity: number): Node<Supply> {
    const supply = consumableMixin({ name, type: 'supply' });
    
    const balance = new Variable(`B(${name})`);
    balances.set(supply, balance);

    constraints.push(() => {
        solver.createConstraint(balance, Operator.Ge, 0, Strength.required);
        solver.createConstraint(
            balance,
            Operator.Eq,
            new Expression(capacity).minus(sumOfConsumption(supply)),
            Strength.required
        );
    });

    return supply;
}

function consumer (name: string) {
    // TODO: ...
}

function pipe (name: string) {
    // TODO: ...
}

export default {
    // TODO: ...
};
