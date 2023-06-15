import { Provider, SimpleChanges, Type } from "@angular/core";
import { Observable, Subscription } from "rxjs";
import { bootstrapModule, CycleType, DecoratedClass, DecoratorMetadata, getCycles, getWatchers, processDependencies } from "./decorators";

const DEFAULT_SUBSCRIPTION_TYPE = '__defaultsubscriptiontype__';

type InternalSubscription = {
    s: Subscription;
    type: string;
}

export function UUID(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function CabledClassFactory(type: Type<any>, deps?: Array<any>) {
    const result = new type(...(deps || []));
    processDependencies(result);
    return result;
}

@DecoratedClass
export class BaseComponent {
    public id: string;

    private __cycles__: Map<string, Array<string>> = new Map<string, Array<string>>();
    private __watchers__: Array<DecoratorMetadata<string>> = [];
    private __subscriptions__: Array<InternalSubscription> = [];

    protected _isValid: boolean = true;

    constructor() {
        this.__watchers__ = getWatchers(this.constructor);
        this.__watchers__.reverse();
        const cycles = getCycles(this.constructor);
        const m = this.__cycles__;
        cycles.forEach(c => {
            const key = c.arg as string;
            if (!m.has(key)) {
                m.set(key, []);
            }

            m.get(key).push(c.prop);
        });
    }

    private _runCycle(cycle: CycleType, args?: any) {
        const cycles = [].concat(this.__cycles__.get(cycle) || []);
        cycles.reverse().forEach(method => this[method](args));
    }

    private ngOnDestroy() {
        this._runCycle('destroy');
        this.__subscriptions__.map(s => s.s).forEach(s => s.unsubscribe());
    }

    private ngAfterViewInit() {
        this._runCycle('afterViewInit');
    }

    private ngOnChanges(changes: SimpleChanges) {
        const toRun = new Map<string, Array<string>>();
        this.__watchers__.filter(w => !!changes[w.arg]).forEach(w => {
            if (!toRun.has(w.prop)) {
                toRun.set(w.prop, []);
            }
            toRun.get(w.prop).push(w.arg);
        });
        Array.from(toRun.keys()).forEach(method => {
            const args = toRun.get(method).reduce((acc, v) => Object.assign(acc, {[v]: changes[v]}), {});
            this[method](args);
        })
        // this.__watchers__.filter(w => !!changes[w.arg]).forEach(w => this[w.prop](changes[w.arg], changes));
        this._runCycle('change', changes);
    }

    private async ngOnInit() {
        if (!this.id) {
            this.id = UUID();
        }
        this._runCycle('init');
    }

    protected connect<T>(obs: Observable<T>, callback: (t: T) => void, type: string = DEFAULT_SUBSCRIPTION_TYPE) {
        this.__subscriptions__.push({type: type, s: obs.subscribe(callback)});
    }

    protected getAllSubscriptions(): Array<Subscription> {
        return this.__subscriptions__.map(s => s.s);
    }

    protected getSubscriptionsByType(type: string): Array<Subscription> {
        return this.__subscriptions__.filter(s => s.type == type).map(s => s.s);
    }
}

export class BaseModule {
    constructor(providers?: Array<Provider>) {
        bootstrapModule(providers || this.constructor['ɵinj'].providers || []);
    }
}
