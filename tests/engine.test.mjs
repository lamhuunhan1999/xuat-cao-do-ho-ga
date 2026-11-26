import test from 'node:test';
import assert from 'node:assert/strict';
import {station,resolveStations} from '../engine.mjs';
const tick=[[0,-.5,0],[0,.5,0]],label=[[0,25,0],[0,35,0]],texts=['C1','Km 0+20'],anchors=[[0,29,0],[1,31,0]];
test('offset labels select tick regardless of record order',()=>{
 assert.deepEqual(station([label,tick],texts,'1',anchors)[2],[0,0,0]);
 assert.deepEqual(station([tick,label],texts,'1',anchors)[2],[0,0,0]);
});
test('ambiguous geometry or missing anchors remain blocked',()=>{
 assert.throws(()=>station([tick,label],texts,'1'));
 assert.throws(()=>station([tick,[[1,25,0],[1,35,0]]],texts,'1',anchors));
 assert.throws(()=>station([tick,label],texts,'1',[[0,0,0],[1,0,0]]));
});
const p=(name,x,n,id)=>[10,name,[x,0,0],n,id];
test('coincident aliases are merged without losing names',()=>{
 const r=resolveStations([p('A',0,[0,1,0],'a'),p('B',0,[0,-1,0],'b')]);
 assert.equal(r.problems.length,0);assert.equal(r.stations.length,1);assert.equal(r.stations[0][1],'A / B');
});
test('nearby station direction needs a valid explicit choice',()=>{
 const rows=[p('A',0,[0,1,0],'a'),p('B',.0004,[.01,Math.sqrt(.9999),0],'b')];
 assert.equal(resolveStations(rows).problems.length,1);
 assert.equal(resolveStations(rows,{'10.00000':'invalid'}).problems.length,1);
 const r=resolveStations(rows,{'10.00000':'b'});assert.equal(r.problems.length,0);assert.deepEqual(r.stations[0],rows[1]);
});
test('distant conflicting chainages cannot be bypassed by a choice',()=>{
 assert.equal(resolveStations([p('A',0,[0,1,0],'a'),p('B',10,[0,1,0],'b')],{'10.00000':'b'}).problems.length,1);
});
