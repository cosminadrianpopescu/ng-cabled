// import './testing/babel-support';
// import 'ng-cabled/main.test';
/// <amd-module name="ng-cabled/testing" />
import * as path from 'path';
import * as fs from 'fs';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import 'reflect-metadata';
import 'zone.js';
import { runInInjectionContext } from '@angular/core';
import { BaseModule, getTestcases, getTestunits } from 'ng-cabled';
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

global['Document'] = <any>process;
global['window'] = <any>global;
global['window'].addEventListener = () => {};
(<any>global['window'])['navigator'] = [];
(<any>global['window']['location']) = {
    pathname: '/',
    hash: '',
}
global['document'] = <any>process;
(<any>global['document'])['head'] = {};
global['document']['addEventListener'] = () => {};
(<any>global['document']['querySelectorAll']) = () => [];
(<any>global['document'])['documentElement'] = {style: []};

const tb = getTestBed();

const _config = tb.configureTestingModule;
(tb.configureTestingModule as any) = (...args: Array<any>) => {
    _config.apply(getTestBed(), args);
    runInInjectionContext(TestBed, () => {
        new BaseModule(args.map(a => a.providers).reduce((acc, v) => acc.concat(v), []));
    })
}


// Hack for jasmine-core. 
const oldJoin = path['default'].join;
(path['default'] as any).join = (folder: string, file: string) => {
    if (file == 'jasmine-core') {
        const files = fs.readdirSync('.');
        folder = `${files.indexOf('node_modules') == -1 ? '..' : '.'}/node_modules`;
    }
    return oldJoin(folder, file);
}

export async function startTesting() {
    const jasmine = await import('jasmine');
    const j = new jasmine.default({});

    const units = getTestunits();

    units.forEach(unit => {
        describe(`Running ${unit.name} -`, () => {
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
                callback(`${tc.name || t.prop}`, () => {
                    // const instance = Object.create(unit.prototype);
                    const instance = getTestBed().get(unit);
                    return instance[t.prop].bind(instance)();
                });
            });
        });
    });

    const oldSpecDone = j['reporter_'].specDone;

    j['reporter_'].specDone = function(result: { fullName: any; status: any; }) {
        console.log('Finished', result.fullName, ' => ', result.status);
        oldSpecDone(result as any);
    };
    j.execute();
}
