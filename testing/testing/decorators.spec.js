import { __decorate, __metadata } from "tslib";
import { InjectionToken, SimpleChange } from '@angular/core';
import { BaseComponent } from '../base';
import { Cabled, DecoratedClass, NgCycle, NgTest, NgTestUnit, PostConstruct, Watcher } from '../decorators';
const TOKEN = new InjectionToken(undefined);
let DummyComponent = class DummyComponent extends BaseComponent {
    a;
    b;
    c;
    d;
    e;
    _initMe() {
        this.a = 'init';
    }
    _afterView() {
        this.b = 'view';
    }
    _change(changes) {
        this.c = changes;
    }
    _destroy() {
        this.d = 'destroy';
    }
};
__decorate([
    NgCycle('init'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DummyComponent.prototype, "_initMe", null);
__decorate([
    NgCycle('afterViewInit'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DummyComponent.prototype, "_afterView", null);
__decorate([
    NgCycle('change'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DummyComponent.prototype, "_change", null);
__decorate([
    NgCycle('destroy'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DummyComponent.prototype, "_destroy", null);
DummyComponent = __decorate([
    DecoratedClass
], DummyComponent);
let SecondDummyComponent = class SecondDummyComponent extends BaseComponent {
    a;
    b;
    c;
    _x = 0;
    assertions = 0;
    _watchA(ch) {
        this._assert(ch, 'a');
    }
    _assert(ch, which) {
        expect(ch[which]).toBeDefined();
        expect(ch[which].currentValue).toEqual(which);
        this.assertions++;
    }
    _watchBC(ch) {
        // This should be run only once;
        this._x++;
        expect(this._x).toEqual(1);
        this._assert(ch, 'b');
        this._assert(ch, 'c');
    }
    _watchB(ch) {
        this._assert(ch, 'b');
    }
    _watchC(ch) {
        this._assert(ch, 'c');
    }
};
__decorate([
    Watcher('a'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecondDummyComponent.prototype, "_watchA", null);
__decorate([
    Watcher('b'),
    Watcher('c'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecondDummyComponent.prototype, "_watchBC", null);
__decorate([
    Watcher('b'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecondDummyComponent.prototype, "_watchB", null);
__decorate([
    Watcher('c'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecondDummyComponent.prototype, "_watchC", null);
SecondDummyComponent = __decorate([
    DecoratedClass
], SecondDummyComponent);
let DummyChildComponent = class DummyChildComponent extends DummyComponent {
};
DummyChildComponent = __decorate([
    DecoratedClass
], DummyChildComponent);
let DummyService = class DummyService {
    x;
    e;
    constructor() {
        this.x = 'hello';
    }
    _post() {
        expect(this.x).toEqual('hello');
        this.e = 'post';
    }
};
__decorate([
    PostConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DummyService.prototype, "_post", null);
DummyService = __decorate([
    DecoratedClass,
    __metadata("design:paramtypes", [])
], DummyService);
let DummyServiceNotProvided = class DummyServiceNotProvided {
    x;
    constructor() {
        this.x = 'world';
    }
};
DummyServiceNotProvided = __decorate([
    DecoratedClass,
    __metadata("design:paramtypes", [])
], DummyServiceNotProvided);
let DecoratorsTest = class DecoratorsTest {
    _service;
    _tokenService;
    _notProvService;
    _assertComponent(c) {
        expect(c.a).toBeUndefined();
        expect(c.b).toBeUndefined();
        expect(c.c).toBeUndefined();
        expect(c.d).toBeUndefined();
        c['ngOnInit']();
        expect(c.a).toEqual('init');
        c['ngAfterViewInit']();
        expect(c.b).toEqual('view');
        const ch = { a: new SimpleChange(undefined, 'abc', true) };
        c['ngOnChanges'](ch);
        expect(c.c).toEqual(ch);
        c['ngOnDestroy']();
        expect(c.d).toEqual('destroy');
    }
    testNgCycle() {
        const c = new DummyComponent();
        this._assertComponent(c);
    }
    _assertService(s) {
        expect(s).toBeDefined();
        expect(s.constructor.name).toEqual('DummyService');
        expect(s instanceof DummyService).toBeTruthy();
    }
    testNgInject() {
        this._assertService(this._service);
        this._assertService(this._tokenService);
        expect(this._notProvService).toBeNull();
    }
    testPostConstruct() {
        expect(this._service.e).toEqual('post');
    }
    testChildComponent() {
        const c = new DummyChildComponent();
        this._assertComponent(c);
    }
    testWatcher() {
        const c = new SecondDummyComponent();
        const ch = { a: new SimpleChange(undefined, 'a', true), b: new SimpleChange(undefined, 'b', true), c: new SimpleChange(undefined, 'c', true) };
        c['ngOnChanges'](ch);
        // Expect to make 5 assertions, no more, no less. 
        expect(c.assertions).toEqual(5);
    }
};
__decorate([
    Cabled(DummyService),
    __metadata("design:type", DummyService)
], DecoratorsTest.prototype, "_service", void 0);
__decorate([
    Cabled(TOKEN),
    __metadata("design:type", DummyService)
], DecoratorsTest.prototype, "_tokenService", void 0);
__decorate([
    Cabled(DummyServiceNotProvided, null),
    __metadata("design:type", DummyServiceNotProvided)
], DecoratorsTest.prototype, "_notProvService", void 0);
__decorate([
    NgTest(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DecoratorsTest.prototype, "testNgCycle", null);
__decorate([
    NgTest(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DecoratorsTest.prototype, "testNgInject", null);
__decorate([
    NgTest(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DecoratorsTest.prototype, "testPostConstruct", null);
__decorate([
    NgTest(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DecoratorsTest.prototype, "testChildComponent", null);
__decorate([
    NgTest(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DecoratorsTest.prototype, "testWatcher", null);
DecoratorsTest = __decorate([
    NgTestUnit([
        DummyService,
        { provide: TOKEN, useClass: DummyService }
    ])
], DecoratorsTest);
export { DecoratorsTest };
//# sourceMappingURL=decorators.spec.js.map