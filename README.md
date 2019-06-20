# 🎩 budgeteer
[![npm version](https://badgen.net/npm/v/@tannerntannern/budgeteer)](https://npmjs.com/package/@tannerntannern/budgeteer)

> a specialized constraint solver for budget flows

<!-- TODO: insert link to website -->

# Overview
Budgeteer allows you to effortlessly balance a budget without doing any monotonous work.  It lets you define intuitive resource flows and automatically balance them for you.  "Resource" is purposely non-specific here -- you can use this tool to balance a monetary budget, manage your time, track calories, or whatever you want.

Budgeteer is written in TypeScript and relies on [kiwi.js][4] to do constraint solving under the hood.

## Disclaimer
Budgeteer is a hobby-tool I built for myself.  I would not advise using it in production.

# Installation
```
npm install @tannerntannern/budgeteer
```
or
```
yarn add @tannerntannern/budgeteer
```

# Usage example
Coming soon...

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
The 4th and final function exported by budgeteer is `solve()`, which takes the nodes created by the `supply`, `consumer`, and `pipe` functions, along with all the relationships established between them, and calculates the resulting balances and transfers.

`solve()` is called without arguments.  If the network can't be balanced, it will throw an error.  Otherwise, it will return an object with three data structures:

| Property | Description |
| -------- | ----------- |
| `allNodes` | An array of all the nodes that were created by the three node type functions |
| `tranfers` | A `TwoKeyMap` (see the [generated docs][1]) that maps pairs of nodes to the amount transferred between them |
| `balances` | An ES6 `Map` of the final balance at each node after all the consuming and supplying is over |

# Author
Tanner Nielsen <tannerntannern@gmail.com>

[Website][2] | [GitHub][3]

[1]: https://tannerntannern.github.io/budgeteer
[2]: https://tannernielsen.com
[3]: https://github.com/tannerntannern
[4]: https://github.com/IjzerenHein/kiwi.js/