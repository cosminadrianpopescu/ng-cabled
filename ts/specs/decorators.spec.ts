import { inject, Injectable, InjectFlags, InjectionToken, runInInjectionContext, SimpleChange, SimpleChanges } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseComponent, CabledClassFactory } from '../base';
import { Cabled, DecoratedClass, FNgTest, NgCycle, NgTest, NgTestUnit, PostConstruct, processDependencies, Watcher } from '../decorators';

const TOKEN = new InjectionToken<string>(undefined);

class DummyComponent extends BaseComponent {
    public a: string;
    public b: string;
    public c: SimpleChanges;
    public d: string;
    public e: string;

    @NgCycle('init')
    private _initMe() {
        this.a = 'init';
    }

    @NgCycle('afterViewInit')
    private _afterView() {
        this.b = 'view';
    }

    @NgCycle('change')
    private _change(changes: SimpleChanges) {
        this.c = changes;
    }

    @NgCycle('destroy')
    private _destroy() {
        this.d = 'destroy';
    }
}

class SecondDummyComponent extends BaseComponent {
    public a: string;
    public b: string;
    public c: string;
    private _x: number = 0;
    public assertions: number = 0;

    @Watcher('a')
    private _watchA(ch: SimpleChanges) {
        this._assert(ch, 'a');
    }

    private _assert(ch: SimpleChanges, which: string) {
        expect(ch[which]).toBeDefined();
        expect(ch[which].currentValue).toEqual(which);
        this.assertions++;
    }

    @Watcher('b')
    @Watcher('c')
    private _watchBC(ch: SimpleChanges) {
        // This should be run only once;
        this._x++;
        expect(this._x).toEqual(1);
        this._assert(ch, 'b');
        this._assert(ch, 'c');
    }

    @Watcher('b')
    private _watchB(ch: SimpleChanges) {
        this._assert(ch, 'b');
    }

    @Watcher('c')
    private _watchC(ch: SimpleChanges) {
        this._assert(ch, 'c');
    }
}

class DummyChildComponent extends DummyComponent {

}

@DecoratedClass
class DummyServiceDecorated {
    public x: string;
    public e: string;

    constructor() {
        this.x = 'hello';
    }

    @PostConstruct()
    private _post() {
        expect(this.x).toEqual('hello');
        this.e = 'post';
    }
}

@Injectable()
class ServiceExtendingCabledClass {
    @Cabled(DummyServiceDecorated) public service: DummyServiceDecorated;
}

@Injectable()
class ServiceExtendingCabledClassWithCables {
    @Cabled(ServiceExtendingCabledClass) public service: ServiceExtendingCabledClass;
}

@DecoratedClass
class DummyServiceWithCables {
    @Cabled(DummyServiceDecorated) public service: DummyServiceDecorated;
}

let angularFactoryClass = class AngularFactory {
    private _service: DummyServiceWithCables;

    static fac(): AngularFactory {
        return new AngularFactory();
    }
}

Cabled(DummyServiceWithCables)(angularFactoryClass.prototype, '_service');
angularFactoryClass = DecoratedClass(angularFactoryClass);

class AngularFactory2 {
    private _service: DummyServiceWithCables;

    static fac(): AngularFactory2 {
        let result: AngularFactory2;
        runInInjectionContext(TestBed, () => {
            result = CabledClassFactory(AngularFactory2);
        })
        return result;
    }
}

let angularFactoryClass2 = AngularFactory2;

Cabled(DummyServiceWithCables)(angularFactoryClass2.prototype, '_service');

class CabledComponent extends BaseComponent {
    @Cabled(DummyServiceDecorated) public service: DummyServiceDecorated;
}

@DecoratedClass
class DummyServiceNotProvided {
    public x: string;
    constructor() {
        this.x = 'world';
    }
}

class DummyServiceOutsideContext {
    public service = inject(DummyServiceWithCables);
}

class DummyComponentWithServiceOutsideContext extends BaseComponent {

}

@NgTestUnit([
    DummyServiceDecorated, {provide: angularFactoryClass, useFactory: angularFactoryClass.fac},
    {provide: angularFactoryClass2, useFactory: angularFactoryClass2.fac},
    DummyServiceWithCables, {provide: TOKEN, useClass: DummyServiceDecorated}, 
    ServiceExtendingCabledClassWithCables, ServiceExtendingCabledClass,
])
export class DecoratorsTest {
    @Cabled(DummyServiceDecorated) private _service: DummyServiceDecorated;
    @Cabled(TOKEN) private _tokenService: DummyServiceDecorated;
    @Cabled(DummyServiceNotProvided, null) private _notProvService: DummyServiceNotProvided;
    @Cabled(ServiceExtendingCabledClassWithCables) private _serviceExtendingCabledClassWithCables: ServiceExtendingCabledClassWithCables;

    constructor() {
        if (process.env['NG_CABLED_USE_PROXY']) {
            window['NG_CABLED_USE_PROXY'] = true;
        }
    }

    private _assertComponent(c: DummyComponent) {
        expect(c.a).toBeUndefined();
        expect(c.b).toBeUndefined();
        expect(c.c).toBeUndefined();
        expect(c.d).toBeUndefined();

        c['ngOnInit']();
        expect(c.a).toEqual('init');
        c['ngAfterViewInit']();
        expect(c.b).toEqual('view');
        const ch = {a: new SimpleChange(undefined, 'abc', true)};
        c['ngOnChanges'](ch);
        expect(c.c).toEqual(ch);
        c['ngOnDestroy']();
        expect(c.d).toEqual('destroy');
    }

    @NgTest()
    public testNgCycle() {
        runInInjectionContext(TestBed, () => {
            const c = new DummyComponent();
            this._assertComponent(c);
        });
    }

    private _assertService(s: DummyServiceDecorated) {
        expect(s).toBeDefined();
        expect(s.constructor.name).toEqual(DummyServiceDecorated.name);
        expect(s instanceof DummyServiceDecorated).toBeTruthy();
    }

    @NgTest()
    public testNgInject() {
        this._assertService(this._service);
        this._assertService(this._tokenService);
        expect(this._notProvService).toBeNull();
    }

    @NgTest()
    public testPostConstruct() {
        expect(this._service.e).toEqual('post');
    }

    @NgTest()
    public testChildComponent() {
        runInInjectionContext(TestBed, () => {
            const c = new DummyChildComponent();
            this._assertComponent(c);
        });
    }

    @NgTest()
    public testWatcher() {
        runInInjectionContext(TestBed, () => {
            const c = new SecondDummyComponent();
            const ch = {a: new SimpleChange(undefined, 'a', true), b: new SimpleChange(undefined, 'b', true), c: new SimpleChange(undefined, 'c', true)};
            c['ngOnChanges'](ch);
            // Expect to make 5 assertions, no more, no less. 
            expect(c.assertions).toEqual(5);
        })
    }

    @NgTest()
    public testComponentWithCabled() {
        runInInjectionContext(TestBed, () => {
            const c = CabledClassFactory(CabledComponent);
            expect(c.service).toBeDefined();
            expect(c.service instanceof DummyServiceDecorated).toBeTrue();
        });
    }

    @NgTest('test case when the angular factory is created before DecoratedClass annotation is applied')
    public testAngularFactory() {
        const i = TestBed.get(angularFactoryClass, null, InjectFlags.Default);
        expect(i._service).toBeUndefined();
        runInInjectionContext(TestBed, () => {
            processDependencies(i);
        })
        expect(i._service).toBeDefined();
        expect(i._service instanceof DummyServiceWithCables).toBeTrue();
        expect((i._service as DummyServiceWithCables).service).toBeDefined();
        expect((i._service as DummyServiceWithCables).service instanceof DummyServiceDecorated).toBeTrue();
        expect((i._service as DummyServiceWithCables).service.e).toEqual('post');
    }

    @NgTest('test case when the angular factory is created before DecoratedClass anotation, but the service extends CabledClass')
    public testAngularFactory2() {
        const i = TestBed.get(angularFactoryClass2, null, InjectFlags.Default);
        expect(i._service).toBeDefined();
        expect(i._service instanceof DummyServiceWithCables).toBeTrue();
        expect((i._service as DummyServiceWithCables).service).toBeDefined();
        expect((i._service as DummyServiceWithCables).service instanceof DummyServiceDecorated).toBeTrue();
        expect((i._service as DummyServiceWithCables).service.e).toEqual('post');
    }

    @NgTest('test case when providing a service that extends CabledClass instead of using DecoratedClass annotation')
    public testServiceExtendingCabledClass() {
        expect(this._serviceExtendingCabledClassWithCables.service).toBeDefined();
        expect(this._serviceExtendingCabledClassWithCables.service.service).toBeDefined();
        expect(this._serviceExtendingCabledClassWithCables.service.service instanceof DummyServiceDecorated).toBeTrue();
    }

    @NgTest('test case when BaseComponent provides an instance based on its own injector')
    public testBaseComponentInstance() {
        let c: DummyComponentWithServiceOutsideContext;
        runInInjectionContext(TestBed, () => {
            c = new DummyComponentWithServiceOutsideContext();
        })
        const service = c['instance'](DummyServiceOutsideContext);
        expect(service).toBeDefined();
        expect(service.service).toBeDefined();
        expect(service.service instanceof DummyServiceWithCables).toBeTrue();
    }
}
