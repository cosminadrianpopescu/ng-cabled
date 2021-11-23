// tslint:disable:no-invalid-this
import {InjectFlags, InjectionToken, Injector, Provider, Type} from '@angular/core';
import 'reflect-metadata';

export class ConvertorContext {
    source: any;
    instance: any;
}

export interface Convertor<T> {
    convert(src: any, ctx?: ConvertorContext): T;
    convertFrom?(src: T): any;
}

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

export const TEST_CASES: Map<Function, Array<TestCase>> = new Map<Function, Array<TestCase>>();
export const TEST_CASES_ONLY: Map<Function, Array<TestCase>> = new Map<Function, Array<TestCase>>();

export type DecoratedClass = {ctor: ClassConstructor, args: Array<any>};
export type DecoratedClasses = Map<string, Array<DecoratedClass>>;
export interface ClassConstructor {
    new (...args: any): any;
    prototype: any;
}
// export type ClassConstructor = {new(...args: any): any, prototype: any};
export type ClassDecorators = Map<Function, Map<string, Array<DecoratorMetadata>>>;
export type DeserializableType<T> = Type<T> | Convertor<T> | 'date';
export type DecoratorMetadata = {prop: string, arg: DecoratorParameterType};
export type NgServiceParamType = Type<any> | string | InjectionToken<any>;
export type NgServiceArguments = {type: NgServiceParamType, def?: any};
export type DecoratorParameterType = CycleType | DeserializableType<any> | TestCase | NgServiceArguments;

export function Cabled(type: NgServiceParamType, def?: any) {
    return __decorateProperty(CABLED_KEY, {type: type, def: def});
}

export function NgCycle(cycle: CycleType) {
    return __decorateProperty(CYCLES_KEY, cycle);
}

export function PostConstruct() {
    return __decorateProperty(POST_CONSTRUCT_KEY, undefined);
}

export function DecoratedClass(ctor: ClassConstructor) {
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

export function getInjectors(ctor: ClassConstructor): Array<DecoratorMetadata> {
    return __getDecorations(ctor.prototype, CABLED_KEY);
}

export function getCycles(instance: Function): Array<DecoratorMetadata> {
    return __getDecorations(instance.prototype, CYCLES_KEY);
}

export function getPostconstruct(instance: Function): Array<DecoratorMetadata> {
    return __getDecorations(instance.prototype, POST_CONSTRUCT_KEY);
}

export function getTestunits(): Array<{new(...args: any): any; prototype: any;}> {
    const classes = __getDecoratedClasses(TEST_UNITS);
    return classes.map(c => c.ctor);
}

export function getTestcases(instance: Function): Array<DecoratorMetadata> {
    return __getDecorations(instance.prototype, TESTS_KEY);
}

export function processAllInjectors(inj: Injector) {
    const classes = __getDecoratedClasses(WITH_SERVICES);
    classes.map(c => c.ctor).filter(c => !c[SERVICE_INSTANTIATED]).forEach(c => {
        processInjectors(c, inj);
        c[SERVICE_INSTANTIATED] = true;
    });
}

export function processInjectors(ctor: ClassConstructor, inj: Injector) {
    const injectors = getInjectors(ctor);
    injectors.forEach(i => {
        const a = i.arg as NgServiceArguments;
        Reflect.defineProperty(ctor.prototype, i.prop, { enumerable: true, writable: true, configurable: true });
        ctor.prototype[i.prop] = inj.get(a.type as Type<any>, typeof(a.def) == 'undefined' ? undefined : a.def, InjectFlags.Default);
    });
}

export function processPostConstruct(inj: Injector) {
    const classes = __getDecoratedClasses(WITH_SERVICES);
    classes
        .filter(c => !c.ctor[PCPROCESSED])
        .map(c => ({c: c.ctor, pc: __getDecorations(c.ctor.prototype, POST_CONSTRUCT_KEY)}))
        .filter(c => c.pc.length > 0)
        .map(c => ({i: inj.get(c.c, null, InjectFlags.Default), pc: c.pc, ctor: c.c}))
        .filter(i => !!i.i)
        .forEach(i => {
            i.pc.forEach(m => i.i[m.prop]());
            i.ctor[PCPROCESSED] = true;
        });
}

export function __decorateProperty(decorationName: string, arg: DecoratorParameterType): any {
    return function(ctor: ClassConstructor, property: string) {
        const c = ctor.constructor;
        let map: ClassDecorators = Reflect.getOwnMetadata(DECORATORS, Object);

        if (!map) {
            map = new Map<ClassConstructor, Map<string, Array<DecoratorMetadata>>>();
        }

        if (!map.get(c)) {
            map.set(c, new Map<string, Array<DecoratorMetadata>>());
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

export function __decorateClass(ctor: ClassConstructor, decoration: string, args?: any) {
    let classes: DecoratedClasses = Reflect.getOwnMetadata(DECORATED_CLASSES, Object);
    if (!classes) {
        classes = new Map<string, Array<DecoratedClass>>();
    }

    if (!Array.isArray(classes.get(decoration))) {
        classes.set(decoration, []);
    }

    classes.get(decoration).push({ctor: ctor, args: args});
    Reflect.defineMetadata(DECORATED_CLASSES, classes, Object);
    return ctor;
}

export function __getDecorations(ctor: ClassConstructor, key: string): Array<DecoratorMetadata> {
    if (ctor == null) {
        return [];
    }
    const decorators: ClassDecorators = Reflect.getOwnMetadata(DECORATORS, Object);
    let result: Array<DecoratorMetadata> = [];
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
