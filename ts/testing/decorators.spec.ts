import {InjectionToken, SimpleChange, SimpleChanges} from '@angular/core';
import {BaseComponent} from '../base';
import {Cabled, DecoratedClass, FNgTest, NgCycle, NgTest, NgTestUnit, PostConstruct, Watcher} from '../decorators';

const TOKEN = new InjectionToken<string>(undefined);

@DecoratedClass
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

@DecoratedClass
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

@DecoratedClass
class DummyChildComponent extends DummyComponent {

}

@DecoratedClass
class DummyService {
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

@DecoratedClass
class DummyServiceNotProvided {
    public x: string;
    constructor() {
        this.x = 'world';
    }
}

@NgTestUnit([
    DummyService,
    {provide: TOKEN, useClass: DummyService}
])
export class DecoratorsTest {
    @Cabled(DummyService) private _service: DummyService;
    @Cabled(TOKEN) private _tokenService: DummyService;
    @Cabled(DummyServiceNotProvided, null) private _notProvService: DummyServiceNotProvided;

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
        const c = new DummyComponent();
        this._assertComponent(c);
    }

    private _assertService(s: DummyService) {
        expect(s).toBeDefined();
        expect(s.constructor.name).toEqual('DummyService');
        expect(s instanceof DummyService).toBeTruthy();
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
        const c = new DummyChildComponent();
        this._assertComponent(c);
    }

    @NgTest()
    public testWatcher() {
        const c = new SecondDummyComponent();
        const ch = {a: new SimpleChange(undefined, 'a', true), b: new SimpleChange(undefined, 'b', true), c: new SimpleChange(undefined, 'c', true)};
        c['ngOnChanges'](ch);
        // Expect to make 5 assertions, no more, no less. 
        expect(c.assertions).toEqual(5);
    }
}

