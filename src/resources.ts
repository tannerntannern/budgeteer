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
type Node<T extends NodeType = NodeType> =
    NodeBase
    & (
        T extends Consumable ? {
            supplies: (amount: number) => To,
            suppliesAsMuchAsNecessary: () => To,
            suppliesAsMuchAsPossible: () => To,
        } : {}
    )
    & (
        T extends Supplyable ? {
            consumes: (amount: number) => From,
            consumesAsMuchAsNecessary: () => From,
            consumesAsMuchAsPossible: () => From,
        } : {}
    );

/**
 * All nodes that are part of the network.
 */
const allNodes: Node[] = [];

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

/**
 * Registers sets for the suppliers and consumers of the given node.
 */
const registerSuppliersAndConsumers = (node: Node) => {
    if (node.type === 'consumer' || node.type === 'pipe')
        suppliers.set(node as Node<Supplyable>, new Set());
    
    if (node.type === 'supply' || node.type === 'pipe')
        consumers.set(node as Node<Consumable>, new Set());
};

/**
 * Registering a transfer between a consumable and a supplyable requires also registering the inverse transfer.
 * This is tedious, so this function takes care of it.
 */
const registerTransfers = (consumable: Node<Consumable>, supplyable: Node<Supplyable>) => {
    suppliers.get(supplyable).add(consumable);
    consumers.get(consumable).add(supplyable);

    const consumableToSupplyable = new Variable(`T(${consumable.name}, ${supplyable.name})`);
    const supplyableToConsumable = new Variable(`T(${supplyable.name}, ${consumable.name})`);
    transfers.set(consumable, supplyable, consumableToSupplyable);
    transfers.set(supplyable, consumable, supplyableToConsumable);

    return { consumableToSupplyable, supplyableToConsumable };
};

/**
 * Registers and returns a balance for the given node.
 */
const registerBalance = (node: Node) => {
    const balance = new Variable(`B(${node.name})`);
    balances.set(node, balance);
    return balance;
}

/**
 * Turns a node into a consumable.  The given node is modified in place and returned.
 */
const consumableMixin = (node: NodeBase | Node<Supply>): Node<Consumable> => {
    // The given node will become a Node<Consumable> by the end of the function, so we preemptively assign
    // the type to make the compiler happy.
    const result: Node<Consumable> = node as any;

    result.supplies = (amount: number) => ({
        to: (supplyable: Node<Supplyable>) => {
            const { consumableToSupplyable, supplyableToConsumable } = registerTransfers(result, supplyable);

            constraints.push(() => {
                solver.createConstraint(supplyableToConsumable, Operator.Eq, amount, Strength.required);
                solver.createConstraint(consumableToSupplyable, Operator.Eq, supplyableToConsumable.multiply(-1), Strength.required);
            });

            return result;
        }
    });

    result.suppliesAsMuchAsNecessary = () => ({
        to: (supplyable: Node<Supplyable>) => {
            const { consumableToSupplyable, supplyableToConsumable } = registerTransfers(result, supplyable);

            constraints.push(() => {
                solver.createConstraint(supplyableToConsumable, Operator.Ge, 0, Strength.required);
                solver.createConstraint(supplyableToConsumable, Operator.Eq, 0, Strength.weak);
                solver.createConstraint(consumableToSupplyable, Operator.Eq, supplyableToConsumable.multiply(-1), Strength.required);
            });

            return result;
        }
    });

    result.suppliesAsMuchAsPossible = () => ({
        to: (supplyable: Node<Supplyable>) => {
            const { consumableToSupplyable, supplyableToConsumable } = registerTransfers(result, supplyable);

            constraints.push(() => {
                solver.createConstraint(supplyableToConsumable, Operator.Ge, 0, Strength.required);
                // TODO: need something to this effect
                // solver.createConstraint(supplyableToConsumable, Operator.Eq, Infinity, Strength.weak);
                solver.createConstraint(consumableToSupplyable, Operator.Eq, supplyableToConsumable.multiply(-1), Strength.required);
            });

            return result;
        }
    });

    return result;
}

/**
 * Turns a node into a supplyable.  The given node is modified in place and returned.
 */
const supplyableMixin = (node: NodeBase | Node<Supply>): Node<Supplyable> => {
    const result = node as Node<Supplyable>;

    result.consumes = (amount: number) => ({
        from: (consumable: Node<Consumable>) => {
            consumable.supplies(amount).to(result);
            return result;
        }
    });

    result.consumesAsMuchAsNecessary = () => ({
        from: (consumable: Node<Consumable>) => {
            consumable.suppliesAsMuchAsNecessary().to(result);
            return result;
        }
    });

    result.consumesAsMuchAsPossible = () => ({
        from: (consumable: Node<Consumable>) => {
            consumable.suppliesAsMuchAsPossible().to(result);
            return result;
        }
    })

    return result;
}

/**
 * Creates a supply node.
 */
function supply (name: string, capacity: number): Node<Supply> {
    const supply = consumableMixin({ name, type: 'supply' });
    const balance = registerBalance(supply);
    registerSuppliersAndConsumers(supply);

    allNodes.push(supply);

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

/**
 * Creates a consumer node.
 */
function consumer (name: string): Node<Consumer> {
    const consumer = supplyableMixin({ name, type: 'consumer' });
    const balance = registerBalance(consumer);
    registerSuppliersAndConsumers(consumer);

    allNodes.push(consumer);

    constraints.push(() => {
        solver.createConstraint(balance, Operator.Eq, sumOfSupply(consumer), Strength.required);
    });

    return consumer;
}

/**
 * Creates a pipe node.
 */
function pipe (name: string): Node<Pipe> {
    const pipe = supplyableMixin(consumableMixin({ name, type: 'pipe' })) as Node<Pipe>;
    const balance = registerBalance(pipe);
    registerSuppliersAndConsumers(pipe);

    allNodes.push(pipe);

    constraints.push(() => {
        solver.createConstraint(balance, Operator.Eq, 0, Strength.required);
        solver.createConstraint(
            balance,
            Operator.Eq,
            sumOfSupply(pipe).minus(sumOfConsumption(pipe)),
            Strength.required
        );
    });

    return pipe;
}

/**
 * Resolves the balances and tranfers of the network.
 */
function solve () {
    for (const constraint of constraints) constraint();
    solver.updateVariables();

    return { allNodes, transfers, balances };
}

export default { supply, consumer, pipe, solve };
