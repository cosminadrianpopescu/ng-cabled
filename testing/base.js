import { __decorate, __metadata } from "tslib";
import { DecoratedClass, getCycles, getWatchers, processModifiedClasses } from "./decorators";
const DEFAULT_SUBSCRIPTION_TYPE = '__defaultsubscriptiontype__';
export function UUID() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
let BaseComponent = class BaseComponent {
    id;
    __cycles__ = new Map();
    __watchers__ = [];
    __subscriptions__ = [];
    _isValid = true;
    constructor() {
        this.__watchers__ = getWatchers(this.constructor);
        this.__watchers__.reverse();
        const cycles = getCycles(this.constructor);
        const m = this.__cycles__;
        cycles.forEach(c => {
            const key = c.arg;
            if (!m.has(key)) {
                m.set(key, []);
            }
            m.get(key).push(c.prop);
        });
    }
    _runCycle(cycle, args) {
        const cycles = [].concat(this.__cycles__.get(cycle) || []);
        cycles.reverse().forEach(method => this[method](args));
    }
    ngOnDestroy() {
        this._runCycle('destroy');
        this.__subscriptions__.map(s => s.s).forEach(s => s.unsubscribe());
    }
    ngAfterViewInit() {
        this._runCycle('afterViewInit');
    }
    ngOnChanges(changes) {
        const toRun = new Map();
        this.__watchers__.filter(w => !!changes[w.arg]).forEach(w => {
            if (!toRun.has(w.prop)) {
                toRun.set(w.prop, []);
            }
            toRun.get(w.prop).push(w.arg);
        });
        Array.from(toRun.keys()).forEach(method => {
            const args = toRun.get(method).reduce((acc, v) => Object.assign(acc, { [v]: changes[v] }), {});
            this[method](args);
        });
        // this.__watchers__.filter(w => !!changes[w.arg]).forEach(w => this[w.prop](changes[w.arg], changes));
        this._runCycle('change', changes);
    }
    async ngOnInit() {
        if (!this.id) {
            this.id = UUID();
        }
        this._runCycle('init');
    }
    connect(obs, callback, type = DEFAULT_SUBSCRIPTION_TYPE) {
        this.__subscriptions__.push({ type: type, s: obs.subscribe(callback) });
    }
    getAllSubscriptions() {
        return this.__subscriptions__.map(s => s.s);
    }
    getSubscriptionsByType(type) {
        return this.__subscriptions__.filter(s => s.type == type).map(s => s.s);
    }
};
BaseComponent = __decorate([
    DecoratedClass,
    __metadata("design:paramtypes", [])
], BaseComponent);
export { BaseComponent };
export class BaseModule {
    constructor(_inj) {
        if (!_inj) {
            console.error('You are extending BaseModule without providing the injector.');
            throw 'INJECTOR_NOT_PASSED';
        }
        processModifiedClasses(_inj);
        // processAllInjectors(_inj);
        // processPostConstruct(_inj);
    }
}
//# sourceMappingURL=base.js.map