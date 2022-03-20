// tslint:disable:no-invalid-this
import {InjectFlags, InjectionToken, Injector, Provider, Type} from '@angular/core';
import 'reflect-metadata';

export type CycleType = 'destroy' | 'afterViewInit' | 'change' | 'init';
export type TestCase = {name: string, x: boolean, f: boolean};
const DECORATED_CLASSES = '__decoratedclasses__';
const DECORATORS = '__decorators__';

const CABLED_KEY = '__cabled__';
const TEST_UNITS = '__testunits__';
const SERVICE_INSTANTIATED = '__serviceinstantiated__';
const PCPROCESSED = '__pcprocessed__';
const CYCLES_KEY = '__cycles__';
const POST_CONSTRUCT_KEY = '__post-construct__';
const TESTS_KEY = '__testsunits__';
const WITH_SERVICES = '__service__';
const WATCHERS_KEY = '__watcherskey__';
const CABLES = '__cables__';

export type DecoratedClass = {ctor: ClassConstructor, args: Array<any>};
export type DecoratedClasses = Map<string, Array<DecoratedClass>>;
export interface AngularComponentCtor {
    new (...args: any): any;
    prototype: any;
    ɵfac: any;
    ɵdir: any;
}
export interface ClassConstructor {
    new (...args: any): any;
    prototype: any;
}
export type ClassesCables = Map<ClassConstructor, {[key: string]: any}>;
// export type ClassConstructor = {new(...args: any): any, prototype: any};
export type ClassDecorators<T extends DecoratorParameterType> = Map<Function, Map<string, Array<DecoratorMetadata<T>>>>;
export type DecoratorMetadata<T extends DecoratorParameterType> = {prop: string, arg: T};
export type NgServiceParamType = Type<any> | string | InjectionToken<any>;
export type NgServiceArguments = {type: NgServiceParamType, def?: any};
export type DecoratorParameterType = CycleType | TestCase | NgServiceArguments | string;

export function Cabled(type: NgServiceParamType, def?: any) {
    return __decorateProperty(CABLED_KEY, {type: type, def: def});
}

export function Watcher(prop: string) {
    return __decorateProperty(WATCHERS_KEY, prop);
}

export function NgCycle(cycle: CycleType) {
    return __decorateProperty(CYCLES_KEY, cycle);
}

export function PostConstruct() {
    return __decorateProperty(POST_CONSTRUCT_KEY, undefined);
}

export function DecoratedClass(ctor: ClassConstructor | AngularComponentCtor): any {
    return __decorateClass(ctor, WITH_SERVICES)
}

export function NgTestUnit(providers?: Array<Provider>) {
    return function(ctor: ClassConstructor) {
        ctor.prototype.providers = providers;
        return __decorateClass(ctor, TEST_UNITS);
    }
}

export function NgTest(name?: string) {
    return __decorateProperty(TESTS_KEY, <TestCase>{ name: name, x: false, f: false });
}

export function FNgTest(name?: string) {
    return __decorateProperty(TESTS_KEY, <TestCase>{ name: name, x: false, f: true });
}

export function XNgTest(name?: string) {
    return __decorateProperty(TESTS_KEY, <TestCase>{ name: name, x: true, f: false });
}

export function getInjectors<T extends DecoratorParameterType>(ctor: ClassConstructor): Array<DecoratorMetadata<T>> {
    return __getDecorations(ctor.prototype, CABLED_KEY);
}

export function getCycles<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, CYCLES_KEY);
}

export function getWatchers<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, WATCHERS_KEY);
}

export function getPostconstruct<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, POST_CONSTRUCT_KEY);
}

export function getTestunits(): Array<{new(...args: any): any; prototype: any;}> {
    const classes = __getDecoratedClasses(TEST_UNITS);
    return classes.map(c => c.ctor);
}

export function getTestcases<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, TESTS_KEY);
}

export function processModifiedClasses(inj: Injector) {
    const classes = __getDecoratedClasses(WITH_SERVICES).concat(__getDecoratedClasses(TEST_UNITS));
    classes
        .map(c => ({c: c.ctor, props: Object.getOwnPropertyNames(c.ctor)}))
        .filter(c => c.props.indexOf(SERVICE_INSTANTIATED) == -1)
        .map(c => c.c)
        .forEach(c => {
            let cables: ClassesCables = Reflect.getOwnMetadata(CABLES, Object);
            if (!cables) {
                cables = new Map();
            }
            let x = cables.get(c.prototype);
            if (!x) {
                x = {};
            }
            const injectors = getInjectors(c);
            injectors.forEach(i => {
                const a = i.arg as NgServiceArguments;
                // ctor.prototype[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
                x[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
            });
            cables.set(c.prototype, x);
            Object.defineProperty(c, SERVICE_INSTANTIATED, {});
            Reflect.defineMetadata(CABLES, cables, Object);
        });
}

export function processAllInjectors(inj: Injector) {
    const classes = __getDecoratedClasses(WITH_SERVICES);
    classes
        .map(c => ({c: c.ctor, props: Object.getOwnPropertyNames(c.ctor)}))
        // .filter(c => c.props.indexOf(SERVICE_INSTANTIATED) == -1)
        .map(c => c.c)
        .forEach(c => {
            processInjectors(c, inj);

            Object.defineProperty(c, SERVICE_INSTANTIATED, {});
        });
}

export function processInstanceInjectors(instance: Function, inj: Injector) {
    const injectors = getInjectors(instance.prototype);
    injectors.forEach(i => {
        const a = i.arg as NgServiceArguments;
        instance[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
    });
}

export function processInjectors(ctor: ClassConstructor, inj: Injector) {
    const injectors = getInjectors(ctor);
    injectors.forEach(i => {
        const a = i.arg as NgServiceArguments;
        // ctor.prototype[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
        Object.defineProperty(ctor.prototype, i.prop, {
            enumerable: true, configurable: true, writable: true,
            value: inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default),
        });
    });
}

export function processPostConstruct(inj: Injector, classes: Array<DecoratedClass> = []) {
    (Array.isArray(classes) ? classes.map(c => ({ctor: c})) : __getDecoratedClasses(WITH_SERVICES))
        // .filter(c => !c.ctor[PCPROCESSED])
        .map(c => ({c: c.ctor, pc: __getDecorations(c.ctor.prototype, POST_CONSTRUCT_KEY)}))
        .filter(c => c.pc.length > 0)
        .map(c => ({i: inj.get(c.c, null, InjectFlags.Default), pc: c.pc, ctor: c.c}))
        .filter(i => !!i.i)
        .forEach(i => {
            i.pc.forEach(m => i.i[m.prop]());
            i.ctor[PCPROCESSED] = true;
        });
}

export function __decorateProperty<T extends DecoratorParameterType>(decorationName: string, arg: T): any {
    return function(ctor: ClassConstructor, property: string) {
        const c = ctor.constructor;
        let map: ClassDecorators<DecoratorParameterType> = Reflect.getOwnMetadata(DECORATORS, Object);

        if (!map) {
            map = new Map<ClassConstructor, Map<string, Array<DecoratorMetadata<DecoratorParameterType>>>>();
        }

        if (!map.get(c)) {
            map.set(c, new Map<string, Array<DecoratorMetadata<DecoratorParameterType>>>());
        }
        
        if (!Array.isArray(map.get(c).get(decorationName))) {
            map.get(c).set(decorationName, []);
        }
        map.get(c).get(decorationName).push({prop: property, arg: arg});

        Reflect.defineProperty(ctor, property, { enumerable: true, writable: true, configurable: true });
        Reflect.defineMetadata(DECORATORS, map, Object);
        return ctor;
    };
}

export function __modifyClass(ctor: ClassConstructor, decoration: string, args?: any): any {
    const result = class extends ctor {
        constructor(...args: Array<any>) {
            super(...args);
            const cables: ClassesCables = Reflect.getOwnMetadata(CABLES, Object);
            const proto = Object.getPrototypeOf(this);
            if (!!cables) {
                const props = cables.get(proto) || {};
                Object.keys(props).forEach(k => Object.defineProperty(this, k, {configurable: true, writable: true, value: props[k]}));
            }

            const pc = __getDecorations(proto, POST_CONSTRUCT_KEY);
            pc.forEach(p => this[p.prop]());
        }
    }

    Object.defineProperty(result, 'name', { value: ctor.name, writable: false });
    Object.getOwnPropertyNames(ctor)
        .filter(k => ['length', 'prototype', 'name'].indexOf(k) == -1)
        .forEach(k => Object.defineProperty(result, k, { value: ctor[k], writable: true, }));
    return result;
}

export function __decorateClass(ctor: ClassConstructor, decoration: string, args?: any) {
    let classes: DecoratedClasses = Reflect.getOwnMetadata(DECORATED_CLASSES, Object);
    if (!classes) {
        classes = new Map<string, Array<DecoratedClass>>();
    }

    if (!Array.isArray(classes.get(decoration))) {
        classes.set(decoration, []);
    }

    const result = __modifyClass(ctor, decoration, args);
    classes.get(decoration).push({ctor: result, args: args});
    Reflect.defineMetadata(DECORATED_CLASSES, classes, Object);
    return result;
}

export function __getDecorations<T extends DecoratorParameterType>(ctor: ClassConstructor, key: string): Array<DecoratorMetadata<T>> {
    if (ctor == null) {
        return [];
    }
    const decorators: ClassDecorators<T> = Reflect.getOwnMetadata(DECORATORS, Object);
    let result: Array<DecoratorMetadata<T>> = [];
    if (!decorators) {
        return [];
    }
    const decorations = decorators.get(ctor.constructor);
    if (decorations) {
        result = decorations.get(key) || [];
    }

    return result.concat(__getDecorations(Object.getPrototypeOf(ctor), key));
}

export function __getDecoratedClasses(key: string): Array<DecoratedClass> {
    const classes: DecoratedClasses = Reflect.getOwnMetadata(DECORATED_CLASSES, Object);
    if (!classes) {
        return [];
    }

    return classes.get(key) || [];
}
