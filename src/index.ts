import Network from './resources';

let wages = Network.supply('Wages', 2000);
let rent = Network.consumer('Rent');
let other = Network.consumer('Other');

rent.consumes(1322).from(wages);
other.consumesAsMuchAsPossible().from(wages);

let results = Network.solve();

console.log('\n=== Transfer Summary ===');
results.transfers.forEach((from, to, value) => {
    if (value.value() > 0)
        console.log(`${from.name} --> ${value.value()}) --> ${to.name}`);
});
console.log();
