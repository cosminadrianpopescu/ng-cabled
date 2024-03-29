// tslint:disable:no-invalid-this
import { inject, Injectable, InjectFlags, InjectionToken, Provider, Type } from '@angular/core';
import 'reflect-metadata';

export type CycleType = 'destroy' | 'afterViewInit' | 'change' | 'init';
export type TestCase = {name: string, x: boolean, f: boolean};
const DECORATED_CLASSES = '__decoratedclasses__';
const DECORATORS = '__decorators__';

const CABLED_KEY = '__cabled__';
const TEST_UNITS = '__testunits__';
const CLASS_INSTANTIATED = '__classinstantiated__';
const CYCLES_KEY = '__cycles__';
const POST_CONSTRUCT_KEY = '__post-construct__';
const TESTS_KEY = '__testsunits__';
const WITH_SERVICES = '__service__';
const DEPENDENCIES = '__dependencies__';
const WATCHERS_KEY = '__watcherskey__';
const IS_PROXY = '__isproxy__';
const PROXY = '__proxy__';

export const TEST_CASES: Map<Function, Array<TestCase>> = new Map<Function, Array<TestCase>>();
export const TEST_CASES_ONLY: Map<Function, Array<TestCase>> = new Map<Function, Array<TestCase>>();

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

export function getDependencies<T extends DecoratorParameterType>(ctor: ClassConstructor): Array<DecoratorMetadata<T>> {
    return __getDecorations(ctor.prototype, CABLED_KEY);
}

export function getCycles<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, CYCLES_KEY);
}

export function getWatchers<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, WATCHERS_KEY);
}

export function getTestunits(): Array<{new(...args: any): any; prototype: any;}> {
    const classes = __getDecoratedClasses(TEST_UNITS);
    return classes.map(c => c.ctor);
}

export function getTestcases<T extends DecoratorParameterType>(instance: Function): Array<DecoratorMetadata<T>> {
    return __getDecorations(instance.prototype, TESTS_KEY);
}

export function bootstrapModule(providers: Array<Provider>) {
    providers
        .map(p => typeof(p) == 'function' ? p : p['useClass'] ? p['provide'] : null)
        .filter(p => !!p)
        .forEach(p => {
            const i = inject(p, InjectFlags.Optional)
            if (!i) {
                return ;
            }
            processDependencies(i as any);
        });
}

function __createProperty(instance: Function, prop: string, value: any) {
    Object.defineProperty(instance, prop, {
        enumerable: true, configurable: true, writable: true,
        value: value,
    });
}

export function processDependencies(instance: Function) {
    if (instance[CLASS_INSTANTIATED]) {
        return ;
    }
    if (instance[IS_PROXY]) {
        Object.defineProperty(instance, PROXY, {configurable: true, enumerable: true, value: {}});
    }
    const ctor: ClassConstructor = instance.constructor as any;
    const deps = getDependencies(ctor);
    deps.forEach(d => {
        const a = d.arg as NgServiceArguments;
        const optional = typeof(a.def) != 'undefined';
        let i = inject(a.type as Type<any>, InjectFlags.Optional);

        if (i == null && optional) {
            i = a.def;
        }

        if (i) {
            processDependencies(i);
        }
        __createProperty(instance, d.prop, i);
        if (instance[IS_PROXY]) {
            __createProperty(instance[PROXY], d.prop, i);
        }
    });

    const pc = __getDecorations(Object.getPrototypeOf(instance), POST_CONSTRUCT_KEY);
    pc.forEach(p => instance[p.prop].bind(instance)());

    instance[CLASS_INSTANTIATED] = true;

    instance[DEPENDENCIES] = deps.map(d => d.prop);
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
