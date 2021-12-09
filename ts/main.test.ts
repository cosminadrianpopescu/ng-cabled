import 'reflect-metadata';
import 'zone.js';
import * as fs from 'fs';
import {getTestBed} from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import * as jasmine from 'jasmine/lib/jasmine.js';
import {getTestcases, getTestunits, processInjectors} from '.';
import {Provider} from '@angular/core';
import {ClassConstructor, processPostConstruct} from './decorators';
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

const loadFolder = async function(path: string) {
    let promises = [];
    const files = fs.readdirSync(path);
    files
        .filter(f => f.match(/\.spec\.js$/g))
        .forEach(f => promises.push(import(`${path}/${f.replace(/\.js$/g, '')}`)));

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
        describe(`Running ${unit.constructor.name}`, () => {
            afterAll(() => getTestBed().resetTestingModule());
            const tests = getTestcases(unit);
            beforeAll(() => {
                getTestBed().configureTestingModule({
                    providers: unit.prototype.providers || [],
                });
                processInjectors(unit, getTestBed());
                (unit.prototype.providers || []).filter((p: Provider) => typeof(p) == 'function').forEach((p: ClassConstructor) => processInjectors(p, getTestBed()));
                processPostConstruct(getTestBed());
            });

            tests.forEach(t => {
                const tc = t.arg as any;
                const callback = tc.x ? xit : tc.f ? fit : it;
                callback(`Running test case ${tc.name || t.prop}`, () => {
                    const instance = new unit();
                    instance[t.prop].bind(instance);
                });
            });
        });
    });

    j.execute();
})();
