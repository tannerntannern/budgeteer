import Network from './resources';

let wages = Network.supply('Wages', 2000);
let rent = Network.consumer('Rent');
let other = Network.consumer('Other');

rent.consumes(1322).from(wages);
other.consumesAsMuchAsPossible().from(wages);

let results = Network.solve();

console.log(results.transfers.get(wages, rent).value());
console.log(results.transfers.get(wages, other).value());
