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

    @Watcher('a')
    private _watchA() {
        expect(this.a).toEqual('a');
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
        c['ngоnChanges'](ch);
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

    @FNgTest()
    public testPostConstruct() {
        console.log('i am ', this);
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
        const ch = {a: new SimpleChange(undefined, 'a', true)};
        c['ngоnChanges'](ch);
    }
}

