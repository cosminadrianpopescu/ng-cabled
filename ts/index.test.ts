// import './testing/babel-support';
// import 'ng-cabled/main.test';
import * as path from 'path';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
// import * as jasmine from 'jasmine/lib/jasmine.js';
import { getTestcases, getTestunits } from './decorators';
import { BaseModule } from './base';
import 'reflect-metadata';
import 'zone.js';
// var jasmine = global['jasmine'];
// var j = new jasmine.default({});
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
    new BaseModule(getTestBed(), args.map(a => a.providers).reduce((acc, v) => acc.concat(v), []));
}

// Hack for jasmine-core. 
const oldJoin = path.join;
(path as any).join = (folder: string, file: string) => {
    if (file == 'jasmine-core') {
        folder = './node_modules';
    }
    return oldJoin(folder, file);
}

export async function startTesting() {
    const jasmine = await import('jasmine/lib/jasmine.js');
    const j = new jasmine.default({});

    const units = getTestunits();

    units.forEach(unit => {
        describe(`Running ${unit.name}`, () => {
            afterAll(() => getTestBed().resetTestingModule());
            const tests = getTestcases(unit);
            beforeAll(() => {
                TestBed.configureTestingModule({
                    providers: (unit.prototype.providers || []).concat([unit]),
                });
            });

            tests.forEach(t => {
                const tc = t.arg as any;
                const callback = tc.x ? xit : tc.f ? fit : it;
                callback(`Running test case ${tc.name || t.prop}`, () => {
                    // const instance = Object.create(unit.prototype);
                    const instance = getTestBed().get(unit);
                    return instance[t.prop].bind(instance)();
                });
            });
        });
    });

    j.execute();
}
