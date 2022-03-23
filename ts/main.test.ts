import 'reflect-metadata';
import 'zone.js';
import * as fs from 'fs';
import {getTestBed} from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import * as jasmine from 'jasmine/lib/jasmine.js';
import {getTestcases, getTestunits, processInjectors, processInjectorsOfModifiedClass, processModifiedClasses} from './decorators';
import {Provider} from '@angular/core';
import {ClassConstructor, processPostConstruct} from './decorators';
import { BaseModule } from './base';
// var jasmine = global['jasmine'];
var j = new jasmine.default({});
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

global['Document'] = <any>process;
global['window'] = <any>global;
global['window'].addEventListener = () => {};
(<any>global['window'])['navigator'] = [];
global['document'] = <any>process;
(<any>global['document'])['head'] = {};
global['document']['addEventListener'] = () => {};
(<any>global['document']['querySelectorAll']) = () => [];
(<any>global['document'])['documentElement'] = {style: []};

const tb = getTestBed();

const _config = tb.configureTestingModule;
tb.configureTestingModule = (...args: Array<any>) => {
    _config.apply(getTestBed(), args);
    // processModifiedClasses(getTestBed());
    args
        .filter(a => !!a.providers)
        .map(a => a.providers || [])
        .reduce((acc, v) => acc.concat(v), [])
        .filter((p: Provider) => typeof(p) == 'function')
        .forEach((c: ClassConstructor) => processInjectorsOfModifiedClass(c, getTestBed()));
}

// declare var describe: (desc: string, specs: any) => void;
// declare var beforeEach: (inits: any) => void;
// 
// const __describe__ = describe;
// const __beforeEach__ = beforeEach;
// 
// beforeEach = function(inits: any) {
//     return __beforeEach__(() => {
//         if ()
//         inits();
//         new BaseModule(getTestBed());
//     });
// }
// 
// describe = function(description, specs) {
//     return __describe__(description, () => {
//         beforeEach(() => {
//             console.log('i am before each');
//         });
// 
//         specs();
//     });
// }

const loadFolder = async function(path: string) {
    let promises = [];
    const files = fs.readdirSync(path);
    files
        .filter(f => f.match(/\.spec\.m?js$/g))
        .forEach(f => promises.push(import(`${path}/${f.replace(/\.m?js$/g, '')}`)));

    await Promise.all(promises);
    promises = [];

    files
        .filter(f => fs.statSync(`${path}/${f}`).isDirectory())
        .forEach(f => promises.push(loadFolder(`${path}/${f}`)));

    await Promise.all(promises);
};
(async () => {
    await loadFolder(process.cwd());

    const units = getTestunits();

    units.forEach(unit => {
        describe(`Running ${unit.name}`, () => {
            afterAll(() => getTestBed().resetTestingModule());
            const tests = getTestcases(unit);
            beforeAll(() => {
                getTestBed().configureTestingModule({
                    providers: unit.prototype.providers || [],
                });
                processInjectorsOfModifiedClass(unit, getTestBed());
            });

            tests.forEach(t => {
                const tc = t.arg as any;
                const callback = tc.x ? xit : tc.f ? fit : it;
                callback(`Running test case ${tc.name || t.prop}`, () => {
                    // const instance = Object.create(unit.prototype);
                    const instance = new unit();
                    return instance[t.prop].bind(instance)();
                });
            });
        });
    });

    j.execute();
})();
