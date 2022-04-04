// tslint:disable:no-invalid-this
import { InjectFlags } from '@angular/core';
import 'reflect-metadata';
const DECORATED_CLASSES = '__decoratedclasses__';
const DECORATORS = '__decorators__';
const CABLED_KEY = '__cabled__';
const TEST_UNITS = '__testunits__';
const SERVICE_INSTANTIATED = '__serviceinstantiated__';
const PCPROCESSED = '__pcprocessed__';
const CYCLES_KEY = '__cycles__';
const POST_CONSTRUCT_KEY = '__post-construct__';
const TESTS_KEY = '__testsunits__';
const INJECTOR = '__injector__';
const WITH_SERVICES = '__service__';
const WATCHERS_KEY = '__watcherskey__';
const CABLES = '__cables__';
export function Cabled(type, def) {
    return __decorateProperty(CABLED_KEY, { type: type, def: def });
}
export function Watcher(prop) {
    return __decorateProperty(WATCHERS_KEY, prop);
}
export function NgCycle(cycle) {
    return __decorateProperty(CYCLES_KEY, cycle);
}
export function PostConstruct() {
    return __decorateProperty(POST_CONSTRUCT_KEY, undefined);
}
export function DecoratedClass(ctor) {
    return __decorateClass(ctor, WITH_SERVICES);
}
export function NgTestUnit(providers) {
    return function (ctor) {
        ctor.prototype.providers = providers;
        return __decorateClass(ctor, TEST_UNITS);
    };
}
export function NgTest(name) {
    return __decorateProperty(TESTS_KEY, { name: name, x: false, f: false });
}
export function FNgTest(name) {
    return __decorateProperty(TESTS_KEY, { name: name, x: false, f: true });
}
export function XNgTest(name) {
    return __decorateProperty(TESTS_KEY, { name: name, x: true, f: false });
}
export function getInjectors(ctor) {
    return __getDecorations(ctor.prototype, CABLED_KEY);
}
export function getCycles(instance) {
    return __getDecorations(instance.prototype, CYCLES_KEY);
}
export function getWatchers(instance) {
    return __getDecorations(instance.prototype, WATCHERS_KEY);
}
export function getPostconstruct(instance) {
    return __getDecorations(instance.prototype, POST_CONSTRUCT_KEY);
}
export function getTestunits() {
    const classes = __getDecoratedClasses(TEST_UNITS);
    return classes.map(c => c.ctor);
}
export function getTestcases(instance) {
    return __getDecorations(instance.prototype, TESTS_KEY);
}
export function processModifiedClasses(inj, ctors) {
    const classes = ctors ? ctors.map(c => ({ ctor: c, args: null })) : __getDecoratedClasses(WITH_SERVICES);
    classes
        .map(c => ({ c: c.ctor, props: Object.getOwnPropertyNames(c.ctor) }))
        // .filter(c => c.props.indexOf(SERVICE_INSTANTIATED) == -1)
        .map(c => c.c)
        // .forEach(c => c[INJECTOR] = inj);
        .forEach(c => processInjectorsOfModifiedClass(c, inj));
    const instances = [];
    classes.forEach(c => {
        const injectors = getInjectors(c.ctor);
        injectors.forEach(i => {
            const a = i.arg;
            const instance = inj.get(a.type, typeof (a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
            if (!instance) {
                return;
            }
            instances.push(instance);
        });
    });
    instances.forEach(i => processModifiedClassPostConstruct(i));
}
export function processInjectorsOfModifiedClass(ctor, inj) {
    // let cables: ClassesCables = Reflect.getOwnMetadata(CABLES, Object);
    // if (!cables) {
    //     cables = new Map();
    // }
    // let x = cables.get(ctor.prototype);
    // if (!x) {
    //     x = {};
    // }
    // const injectors = getInjectors(ctor);
    // injectors.forEach(i => {
    //     const a = i.arg as NgServiceArguments;
    //     // ctor.prototype[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
    //     x[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
    // });
    // cables.set(ctor.prototype, x);
    // Object.defineProperty(ctor, SERVICE_INSTANTIATED, {});
    // Reflect.defineMetadata(CABLES, cables, Object);
    ctor[INJECTOR] = inj;
}
export function processAllInjectors(inj) {
    const classes = __getDecoratedClasses(WITH_SERVICES);
    classes
        .map(c => ({ c: c.ctor, props: Object.getOwnPropertyNames(c.ctor) }))
        // .filter(c => c.props.indexOf(SERVICE_INSTANTIATED) == -1)
        .map(c => c.c)
        .forEach(c => {
        processInjectors(c, inj);
        Object.defineProperty(c, SERVICE_INSTANTIATED, {});
    });
}
export function processInjectors(ctor, inj) {
    const injectors = getInjectors(ctor);
    injectors.forEach(i => {
        const a = i.arg;
        // ctor.prototype[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
        Object.defineProperty(ctor.prototype, i.prop, {
            enumerable: true, configurable: true, writable: true,
            value: inj.get(a.type, typeof (a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default),
        });
    });
}
export function processPostConstruct(inj, classes = []) {
    (Array.isArray(classes) ? classes.map(c => ({ ctor: c })) : __getDecoratedClasses(WITH_SERVICES))
        // .filter(c => !c.ctor[PCPROCESSED])
        .map(c => ({ c: c.ctor, pc: __getDecorations(c.ctor.prototype, POST_CONSTRUCT_KEY) }))
        .filter(c => c.pc.length > 0)
        .map(c => ({ i: inj.get(c.c, null, InjectFlags.Default), pc: c.pc, ctor: c.c }))
        .filter(i => !!i.i)
        .forEach(i => {
        i.pc.forEach(m => i.i[m.prop]());
        i.ctor[PCPROCESSED] = true;
    });
}
export function __decorateProperty(decorationName, arg) {
    return function (ctor, property) {
        const c = ctor.constructor;
        let map = Reflect.getOwnMetadata(DECORATORS, Object);
        if (!map) {
            map = new Map();
        }
        if (!map.get(c)) {
            map.set(c, new Map());
        }
        if (!Array.isArray(map.get(c).get(decorationName))) {
            map.get(c).set(decorationName, []);
        }
        map.get(c).get(decorationName).push({ prop: property, arg: arg });
        Reflect.defineProperty(ctor, property, { enumerable: true, writable: true, configurable: true });
        Reflect.defineMetadata(DECORATORS, map, Object);
        return ctor;
    };
}
export function __modifyClass(ctor, decoration, args) {
    const result = class extends ctor {
        constructor(...args) {
            super(...args);
            // const cables: ClassesCables = Reflect.getOwnMetadata(CABLES, Object);
            const proto = Object.getPrototypeOf(this);
            const injectors = getInjectors(this.constructor);
            const inj = this.constructor[INJECTOR];
            injectors.forEach(i => {
                const a = i.arg;
                // ctor.prototype[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
                Object.defineProperty(this, i.prop, {
                    enumerable: true, configurable: true, writable: true,
                    value: inj.get(a.type, typeof (a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default),
                });
            });
            // if (!!cables) {
            //     const props = cables.get(proto) || {};
            //     Object.keys(props).forEach(k => Object.defineProperty(this, k, {configurable: true, writable: true, value: props[k]}));
            // }
        }
    };
    Object.defineProperty(result, 'name', { value: ctor.name, writable: false });
    Object.getOwnPropertyNames(ctor)
        .filter(k => ['length', 'prototype', 'name'].indexOf(k) == -1)
        .forEach(k => Object.defineProperty(result, k, { value: ctor[k], writable: true, }));
    return result;
}
export function processModifiedClassPostConstruct(instance) {
    if (instance[PCPROCESSED]) {
        return;
    }
    const pc = __getDecorations(Object.getPrototypeOf(instance), POST_CONSTRUCT_KEY);
    pc.forEach(p => instance[p.prop].bind(instance)());
    instance[PCPROCESSED] = true;
}
export function __decorateClass(ctor, decoration, args) {
    let classes = Reflect.getOwnMetadata(DECORATED_CLASSES, Object);
    if (!classes) {
        classes = new Map();
    }
    if (!Array.isArray(classes.get(decoration))) {
        classes.set(decoration, []);
    }
    const result = __modifyClass(ctor, decoration, args);
    classes.get(decoration).push({ ctor: result, args: args });
    Reflect.defineMetadata(DECORATED_CLASSES, classes, Object);
    return result;
}
export function __getDecorations(ctor, key) {
    if (ctor == null) {
        return [];
    }
    const decorators = Reflect.getOwnMetadata(DECORATORS, Object);
    let result = [];
    if (!decorators) {
        return [];
    }
    const decorations = decorators.get(ctor.constructor);
    if (decorations) {
        result = decorations.get(key) || [];
    }
    return result.concat(__getDecorations(Object.getPrototypeOf(ctor), key));
}
export function __getDecoratedClasses(key) {
    const classes = Reflect.getOwnMetadata(DECORATED_CLASSES, Object);
    if (!classes) {
        return [];
    }
    return classes.get(key) || [];
}
//# sourceMappingURL=decorators.js.map