import { Variable, Solver, Operator, Strength, Expression } from 'kiwi.js';
import { TwoKeyMap } from './two-key-map';
  
type Supply = 'supply';
type Consumer = 'consumer';
type Pipe = 'pipe';
type Supplyable = Consumer | Pipe;
type Consumable = Supply | Pipe;
type NodeType = Supply | Consumer | Pipe;

type To<T extends NodeType = Consumable> = { to: (node: FlowNode<Supplyable>) => FlowNode<T> };
type From<T extends NodeType = Supplyable> = { from: (node: FlowNode<Consumable>) => FlowNode<T> };

type NodeBase = { name: string, type: NodeType };
type FlowNode<T extends NodeType = NodeType> =
    NodeBase
    & (
        T extends Consumable ? {
            supplies: (amount: number, multiplier?: number) => To<T>,
            suppliesAsMuchAsNecessary: () => To<T>,
            suppliesAsMuchAsPossible: () => To<T>,
        } : {}
    )
    & (
        T extends Supplyable ? {
            consumes: (amount: number, multiplier?: number) => From<T>,
            consumesAsMuchAsNecessary: () => From<T>,
            consumesAsMuchAsPossible: () => From<T>,
        } : {}
    );

/**
 * All nodes that are part of the network.
 */
const allNodes: FlowNode[] = [];

/**
 * Maps each Node to the Set of its suppliers.
 */
const suppliers: Map<FlowNode<Supplyable>, Set<FlowNode<Consumable>>> = new Map();

/**
 * Maps each Node to the Set of its consumers.
 */
const consumers: Map<FlowNode<Consumable>, Set<FlowNode<Supplyable>>> = new Map();

/**
 * Maps each Node to its balance.
 */
const balances: Map<FlowNode, Variable> = new Map();

/**
 * Maps a pair of Nodes to the amount transferred between them.
 */
const transfers: TwoKeyMap<FlowNode, Variable> = new TwoKeyMap();

/**
 * Array of functions that setup constraints on the solver.  Due to the nature of some of these constraints,
 * they can't be applied until all the nodes exist, which is why they have to be batched up in functions.
 */
const constraints: (() => void)[] = [];

/**
 * Constraint solver that does all the heavy lifting.
 */
let solver = new Solver();

/**
 * Clears all nodes, relationships, and constraints, and resets the kiwi.js solver.
 */
const reset = () => {
    allNodes.length = 0;
    constraints.length = 0;

    [suppliers, consumers, balances, transfers]
        .forEach(collection => collection.clear());
    
    let solver = new Solver();
};

/**
 * Returns an Expression that represents the total value consumed by the given node's consumers.
 */
function sumOfConsumption (node: FlowNode<Consumable>): Expression {
    let result = new Expression(0);

    consumers.get(node).forEach(consumer => {
        result = result.plus(transfers.get(node, consumer));
    });

    return result;
}

/**
 * Returns an Expression that represents the total value supplied by the given node's suppliers.
 */
function sumOfSupply (node: FlowNode<Supplyable>): Expression {
    let result = new Expression(0);

    suppliers.get(node).forEach(supplier => {
        result = result.plus(transfers.get(supplier, node))
    });

    return result;
}

/**
 * Registers sets for the suppliers and consumers of the given node.
 */
const registerSuppliersAndConsumers = (node: FlowNode) => {
    if (node.type === 'consumer' || node.type === 'pipe')
        suppliers.set(node as FlowNode<Supplyable>, new Set());
    
    if (node.type === 'supply' || node.type === 'pipe')
        consumers.set(node as FlowNode<Consumable>, new Set());
};

/**
 * Registering a transfer between a consumable and a supplyable requires also registering the inverse transfer.
 * This is tedious, so this function takes care of it.
 */
const registerTransfers = (consumable: FlowNode<Consumable>, supplyable: FlowNode<Supplyable>) => {
    suppliers.get(supplyable).add(consumable);
    consumers.get(consumable).add(supplyable);

    const consumableToSupplyable = new Variable(`${consumable.name}->${supplyable.name}`);
    const supplyableToConsumable = new Variable(`${supplyable.name}->${consumable.name}`);
    transfers.set(consumable, supplyable, consumableToSupplyable);
    transfers.set(supplyable, consumable, supplyableToConsumable);

    return { consumableToSupplyable, supplyableToConsumable };
};

/**
 * Registers and returns a balance for the given node.
 */
const registerBalance = (node: FlowNode) => {
    const balance = new Variable(`Bal-${node.name}`);
    balances.set(node, balance);
    return balance;
}

/**
 * Turns a node into a consumable.  The given node is modified in place and returned.
 */
const consumableMixin = <T extends NodeBase | FlowNode<Consumer>>(node: T): T extends NodeBase ? FlowNode<Consumable> : FlowNode<Pipe> => {
    // The given node will become a Node<Consumable> by the end of the function, so we preemptively assign
    // the type to make the compiler happy.
    const result: FlowNode<Consumable> = node as any;

    result.supplies = (amount: number, multiplier: number = 1) => ({
        to: (supplyable: FlowNode<Supplyable>) => {
            amount *= multiplier;

            const { consumableToSupplyable, supplyableToConsumable } = registerTransfers(result, supplyable);

            constraints.push(() => {
                solver.createConstraint(consumableToSupplyable, Operator.Eq, amount, Strength.required);
                solver.createConstraint(supplyableToConsumable, Operator.Eq, consumableToSupplyable.multiply(-1), Strength.required);
            });

            return result;
        }
    });

    result.suppliesAsMuchAsNecessary = () => ({
        to: (supplyable: FlowNode<Supplyable>) => {
            const { consumableToSupplyable, supplyableToConsumable } = registerTransfers(result, supplyable);

            constraints.push(() => {
                solver.createConstraint(consumableToSupplyable, Operator.Ge, 0, Strength.required);
                solver.createConstraint(consumableToSupplyable, Operator.Eq, 0, Strength.weak);
                solver.createConstraint(supplyableToConsumable, Operator.Eq, consumableToSupplyable.multiply(-1), Strength.required);
            });

            return result;
        }
    });

    result.suppliesAsMuchAsPossible = () => ({
        to: (supplyable: FlowNode<Supplyable>) => {
            const { consumableToSupplyable, supplyableToConsumable } = registerTransfers(result, supplyable);

            constraints.push(() => {
                solver.createConstraint(consumableToSupplyable, Operator.Ge, 0, Strength.required);
                solver.createConstraint(consumableToSupplyable, Operator.Eq, Number.MAX_SAFE_INTEGER, Strength.weak);
                solver.createConstraint(supplyableToConsumable, Operator.Eq, consumableToSupplyable.multiply(-1), Strength.required);
            });

            return result;
        }
    });

    return result as any;
}

/**
 * Turns a node into a supplyable.  The given node is modified in place and returned.
 */
const supplyableMixin = <T extends NodeBase | FlowNode<Supply>>(node: T): T extends NodeBase ? FlowNode<Consumer> : FlowNode<Pipe> => {
    const result: FlowNode<Supplyable> = node as any;

    result.consumes = (amount: number, multiplier: number = 1) => ({
        from: (consumable: FlowNode<Consumable>) => {
            consumable.supplies(amount, multiplier).to(result);
            return result;
        }
    });

    result.consumesAsMuchAsNecessary = () => ({
        from: (consumable: FlowNode<Consumable>) => {
            consumable.suppliesAsMuchAsNecessary().to(result);
            return result;
        }
    });

    result.consumesAsMuchAsPossible = () => ({
        from: (consumable: FlowNode<Consumable>) => {
            consumable.suppliesAsMuchAsPossible().to(result);
            return result;
        }
    })

    return result as any;
}

/**
 * Creates a supply node.
 */
function supply (name: string, capacity: number, multiplier: number = 1): FlowNode<Supply> {
    capacity *= multiplier;

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
function consumer (name: string): FlowNode<Consumer> {
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
function pipe (name: string): FlowNode<Pipe> {
    const pipe = supplyableMixin(consumableMixin({ name, type: 'pipe' })) as FlowNode<Pipe>;
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

    // Make a transfer map with just numbers rather than kiwi variables
    const resultTransfers = new TwoKeyMap<FlowNode, number>();
    transfers.forEach((node1, node2, value) =>  {
        const amount = value.value();
        if (amount > 0)
            resultTransfers.set(node1, node2, amount);
    });

    // Make a balance map with just numbers rather than kiwi variables
    const resultBalances = new Map<FlowNode, number>();
    balances.forEach((value, node) => resultBalances.set(node, value.value()));

    return { allNodes, transfers: resultTransfers, balances: resultBalances };
}

export { supply, consumer, pipe, solve, reset };
