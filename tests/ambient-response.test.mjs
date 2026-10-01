import test from 'node:test';
import assert from 'node:assert/strict';
import {proximityEnergy,resonantRegions} from '../shared/ambient-response.mjs';

test('ambient response is bounded and falls smoothly with distance',()=>{
  assert.equal(proximityEnergy(2),1);
  assert.equal(proximityEnergy(14),0);
  assert.ok(proximityEnergy(7)>proximityEnergy(10));
});

test('world resonance counts regions rather than repeated discoveries',()=>{
  const entries=[
    {id:'ai-a',regionId:'ai'},
    {id:'ai-b',regionId:'ai'},
    {id:'science-a',regionId:'science'},
  ];
  assert.deepEqual([...resonantRegions(entries,new Set(['ai-a','ai-b','science-a']))].sort(),['ai','science']);
});
