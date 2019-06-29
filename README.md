# 🎩 budgeteer
[![npm version](https://badgen.net/npm/v/@tannerntannern/budgeteer)](https://npmjs.com/package/@tannerntannern/budgeteer)
[![min size](https://badgen.net/bundlephobia/min/@tannerntannern/budgeteer)](https://bundlephobia.com/result?p=@tannerntannern/budgeteer)

> a specialized constraint solver for budget flows

# Overview
Budgeteer allows you to effortlessly balance a budget without doing any monotonous work.  It lets you define intuitive resource flows and automatically balance them for you.  "Resource" is purposely non-specific here -- you can use this tool to balance a monetary budget, manage your time, track calories, or whatever you want.

Budgeteer is written in TypeScript and relies on [kiwi.js][4] to do constraint solving under the hood.

Check out the [demo website][6] to see it in action, or keep reading if you want to integrate the API yourself.

# Installation
```
npm install @tannerntannern/budgeteer
```
or
```
yarn add @tannerntannern/budgeteer
```

# Usage example
```typescript
import { supply, pipe, consumer, solve } from '@tannerntannern/budgeteer';

// 1. Build a network
const wages = supply('Wages', 2500);
const checking = pipe('Checking');
const expenses = pipe('Expenses');

wages
    .supplies(700).to(consumer('Taxes'))
    .supplies(1200).to(checking)
    .suppliesAsMuchAsPossible().to(consumer('Savings'));

checking
    .suppliesAsMuchAsNecessary().to(expenses)
    .suppliesAsMuchAsPossible().to(consumer('Spending Money'));

consumer('Rent').consumes(900).from(expenses);
consumer('Groceries').consumes(200).from(expenses);

// 2. Balance the network and view results
const results = solve();

results.transfers.forEach((node1, node2, amount) => {
    console.log(`${node1.name} -- $${amount} --> ${node2.name}`);
});
```

Which will print:
```
Wages -- $700 --> Taxes
Wages -- $1200 --> Checking
Wages -- $600 --> Savings
Checking -- $1100 --> Expenses
Checking -- $100 --> Spending Money
Expenses -- $900 --> Rent
Expenses -- $200 --> Groceries
```

Notice how the unspecified values (savings, expenses, and spending) have all been calculated for you.

# API
> For more detailed information, see the [generated docs][1].

## Node Types
Budgeteer has three functions for modelling a resource network:

| Function | Description | Example |
| -------- | ----------- | ------- |
| `supply(name, amount, multiplier?)` | Creates a supply node, from which other nodes can draw resources from | Wages, savings interest
| `consumer(name)` | Creates a consumer node, which can draw resources from other nodes, but cannot provide | Rent, grocery expenses
| `pipe(name)` | Creates a mixture between a supply and consumer node; it can both draw and provide resources, although the pipe must draw at least as much as it provides | Bank accounts

### Key Terms
Nodes that provide are "consumable," and nodes that can recieve supply are "supplyable."  Thus, supply nodes are _consumable_, consumer nodes are _supplyable_, and pipe nodes are both.

## Node Relationships
Relationships (i.e., flows) between nodes are established through a chainable API.  Each flow requires two function calls: one that specifies how much, and another that specifies where.  For example: `income.supplies(1000).to(rent)`

### Consumable Node Relationships
All _consumable_ nodes have the following methods, each one followed with a `.to(<supplyable node>)` call, similar to the example above:

| Function | Description |
| -------- | ----------- |
| `supplies(amount)` | Supplies a fixed amount to another node |
| `suppliesAsMuchAsNecessary()` | Supplies only as much as the recieving node needs |
| `suppliesAsMuchAsPossible()` | Supplies any remaining resources to another node |

### Supplyable Node Relationships
All _supplyable_ nodes have the following methods, each one followed with a `.from(<consumable node>)` call.  For example: `rent.consumes(1000).from(wages)`:

| Function | Description |
| -------- | ----------- |
| `consumes(amount)` | Consumes a fixed amount from another node |
| `consumesAsMuchAsNecessary()` | Consumes only as much as necessary from the supplying node |
| `consumesAsMuchAsPossible()` | Consumes any remaining resources from the supplying node |

## Balancing the Network
To resolve the network use `solve()`, which takes the nodes created by the `supply`, `consumer`, and `pipe` functions, along with all the relationships established between them, and calculates the resulting balances and transfers.

`solve()` is called without arguments.  If the network can't be balanced, it will throw an error.  Otherwise, it will return an object with three data structures:

| Property | Description |
| -------- | ----------- |
| `allNodes` | An array of all the nodes that were created by the three node type functions |
| `tranfers` | A `TwoKeyMap` (see the [generated docs][1]) that maps pairs of nodes to the amount transferred between them |
| `balances` | An ES6 `Map` of the final balance at each node after all the consuming and supplying is over |

## Resetting the Network
If you want to clear all nodes and setup a new network, use the `reset()` function.

# How the Math Works
I recently made a post that, among other things, talks in detail about how these function calls translate to mathematical constraints.  If you're interested, [here's a link][5].

# Author
Tanner Nielsen <tannerntannern@gmail.com>

[Website][2] | [GitHub][3]

[1]: https://tannerntannern.github.io/budgeteer
[2]: https://tannernielsen.com
[3]: https://github.com/tannerntannern
[4]: https://github.com/IjzerenHein/kiwi.js/
[5]: https://blog.tannernielsen.com/2019/06/25/Budgeteer-A-Budget-Balancing-Tool/
[6]: https://budgeteer.tannernielsen.com
