# Ng Cabled

**Or, extending Angular components the proper way.**

This library contains a few decorators which will make extending components
practical and easy. 

## Install

```bash
npm install --save ng-cabled
```

## Background

***Why is there a need***

Unfortunatelly, Angular is not really oriented via extending components or
services. I heard a lot of times the question "why do you need to extend a
component?" during some interviews or during working on a project. Well, every
time the answer is quite simple: there are lots of cases where inherinting
from a base component is very usefull: 

* I want to have a unified API (I want all my components for example to use a
  label input or to use an ID input). Also, I want this ID to be initialized
  by default with an UID if not defined by the user. 
* I want proper observables subscriptions handling without a lot of
  boilerplate code and of course without repeating myself over and over again
  (and yes, I also want to unsubscribe even if I know that the service that
  I'm subscribing to is just a REST call).
* I want to have some common behavior (for example I would like a dropdown
  component and an autocomplete component to have a common behaviour regarding
  the data source and the sharing of the model).
* I want to be able to define abstract components or (more important) abstract
  services. 

These are just a few examples where inheritance is the most straight forward
solution.


***Counter-arguments / other options / ...***

Between the arguments that I've heard since I'm doing Angular development, the
only valid one was "use object composition". The others like finding different
more complicated solutions just because the code would otherwise be more
complicated are not even worth discussing. I'm not going to discuss the
reasoning that because some misterious reason OOP is evil. 

Regarding object composition, I've tried this and it poses one major issue:
when it comes to modern developing tools, you are left on your own. There is
no IDE nor LSP server for angular which will properly interpret something like
this:

```javascript
const A = {
    method1(): void{
        ...
    }
}

const B = {
    method2(): void{
        ...
    }
}

const c = Object.create(Object.assign({}, A, B));

```

Following such a code, `c` will be of type `any`, because `Object.create`
returns `any`. So, good luck finding definitions, references, and so on. Of
course, a solution would be to have a lot of interfaces, but this is a poor
solution compared with just extending the damn class. That is the
straightforward solution. So, until the IDE's, the tools and the typescript
language will catch up with this, object composition is simply not a useful
practical solution to the problems enumerated previously.


***Challenges***

But, when extending components and services in Angular, you are facing some
major issues:

* Due to the dependency injection made via constructors (one of the worst
  patterns ever invented, but this is another discussion that you can see
  [here](https://github.com/cosminadrianpopescu/tsdim)) you need to know all
  the private dependencies of the component or service you want to extend. 
* A parent component implementing one of the life cycle hooks (like
  `ngOninit`) would risk that hook being overwritten in a child class and so
  having its behaviour broken.


## ng-cabled solution

In order to solve this issues, this library provides a few decorators and a
few base classes.

### `DecoratedClass` and `Cabled` annotations

These two annotations will help with dependency injection. They will be
responsible for injecting dependencies in a class. Use the `DecoratedClass`
annotation on top of all the classes that should contain any of the decorators
provided by the library. This will tell the compiler to check the class for
dependencies. And then, you add the `Cabled` annotation on all the properties
that should be automatically injected. 

***Normal Angular way***

```typescript
export class ParentService {
    constructor(private _parentPrivateService: ParentPrivateService) {}
}

@Injectable({
    ...
})
export class ChildService extends ParentService {
    constructor(_baseClassPrivateService: ParentPrivateService, private _childPrivateService: ChildPrivateService) {
        super(_baseClassPrivateService);
    }
}
```

***ng-cabled way***

```typescript
@DecoratedClass
export class ParentService {
    @Cabled(ParentPrivateService) private _myPrivateService: ParentPrivateService;
}

@Component({
    ...
})
@DecoratedClass
export class ChildService extends ParentService {
    @Cabled(ChildPrivateService) private _childPrivateService: ChildPrivateService;
}
```

Notice how the `ChildService` now does not know and does not care about the
internal private dependencies of `ParentService` (i.e. the private
`ParentPrivateService`).

The first argument of the `Cabled` annotation can be any Angular accepted
dependency injection token (it can be a class, it can be an `InjectionToken`,
it can be a string etc.).

Also, you can pass a second argument to the `Cabled` annotation which would
represent the default value. This would make the injection optional. If the
token is not solved by the dependency injection, no error is thrown and the
property is initialized with the given default value.

The only issue this poses is that you have no way to know in which order the
services will be instantiated. So, you can't use constructors for anything (so
to let any injected service get instantiated). If you need to run some
initialization code for a given service, just move that code in a private
method annotated with the `PostConstruct` annotation like this:

```typescript
@Injectable()
@DecoratedClass
export class MyBaseService {
    @PostConstruct()
    private _init() {
        // Here comes the initialization code that normally would've been run
        // in the constructor: 
        ...
    }
}
```

The `PostConstruct` annotation will not work on components (is meant to be
used only for services). For components see the next paragraph (basically you
should use life cycle hooks).

### `DecoratedClass` usage

Decorating classes with `DecoratedClass` annotation will work without any
issues on singleton services on the current version of Angular and on future
versions. 

Since the components, as you will see bellow, will all extend the
`BaseComponent` class, they do not need the `DecoratedClass` annotation. For
example:

```typescript
@Component({
    ...
})
export class MyComponent extends BaseComponent {
    @Cabled(MyService) private _service: MyService;
}
```

The services will be injected properly after the `PostConstruct` is run.

When it comes to pipes and multiple instance services (like services provided
in components, although I would suggest to use pipes), for the moment you can
use the `DecoratedClass` annotation. This will work for any Angular version
from 9 to 13. 

However, due to [this bug](https://github.com/angular/angular/issues/45477),
the `DecoratedClass` annotation might stop working in the future for pipes and
multiple instances services. In this case, if you want to be bullet proof, use
the `CabledClass`. Instead of annotating the pipes with `DecoratedClass`, you
can extend the `CabledClass` class. 

***Bullet proof (will work in any angular version)***

```typescript
@Pipe(...)
export class MyPipe extends CabledClass {
    @Cabled(MyService) private _service: MyService;
    public transform(...) {
        ...
    }
}
```

***Angular 9 to 13 works for sure, not guaranteed to work in the future***

```typescript
@Pipe(...)
@DecoratedClass
export class MyPipe {
    @Cabled(MyService) private _service: MyService;
    public transform(...) {
        ...
    }
}
```

When extending the `CabledClass`, you don't need to decorate the class with
`DecoratedClass`.

### `NgCycle` annotation

This annotation will solve the second problem of extending components: when
using any of the lifecycle hooks, they can be later overriden in a child
component. 

```typescript
export class ParentComponent implements OnInit {
    @Input() public id: string;
    ngOnInit() {
        if (!id) {
            this.id = UUID();
        }
    }
}

export class ChildComponent extends ParentComponent implements OnInit {
    private _myProperty: string;
    ngOnInit() {
        super.ngOnInit(); //problematic - see below
        this._myProperty = 'value';
    }
}

```

Notice how now the behaviour of the component is changed if you don't call
`super.ngOnInit()`. The one who extends the `ParentComponent` needs to know to
call `super.ngOnInit()` in `ChildComponent`'s `ngOnInit`.  Of course, when you
have to deal with big development teams, such a mistake could slip in the code
resulting in unexpecting behaviour. 

The solution to this problem is given by the `NgCycle` annotation. When using
this library, every component should extend `BaseComponent` class inside the
package. The `BaseComponent` contains the `ngOnInit`, `ngOnDestroy`,
`ngAfterViewInit` and `ngOnChange` methods as private. So, there is no danger
of overriding those methods in a child class, since that would result in a
compilation error. 

But this means that you also can't use them in `ChildComponent`. A better of
way of implementing lifecycle hooks (that Angular should've implemented
itself) is via an annotation. So, instead of using any of those 4 lifecycles,
use the `NgCycle` annotation with any of the arguments: `'init'`,
`'afterViewInit'`, `'destroy'` or `'change'`. Those method will be run on each
of the respective cycle. The example from above can be rewritten safely and
more elegant like this:

```typescript
export class ParentComponent extends BaseComponent {
    @Input() public id: string;
    @NgCycle('init')
    private __initParentComponent__() {
        if (!id) {
            this.id = UUID();
        }
    }
}

@Component({
    ...
})
export class ChildComponent extends ParentComponent {
    private _myProperty: string;
    @NgCycle('init')
    private __initChildComponent__() {
        this._myProperty = 'value';
    }
}

```

Problem solved. No danger of overwritting the parent class method and breaking
the expected behaviour. 

### Bonus: watching for input changes

How many times did you write or encounter this in your angular applications?

```typescript
@Component({...})
export class MyComponent implements OnChange {
    ngOnChange(changes: SimpleChanges) {
        if (changes['input1']) {
            // do stuff related with input1
        }

        if (changes['input2']) {
            // do stuff related with input2
        }
    }
}
```

This looks ugly, right? 

Check out a better way of doing it via `NgCabled`, using the `Watcher`
annotation:

```typescript
@Component({...})
export class MyComponent extends BaseComponent {
    @Watcher('input1')
    private _input1Changed(c: SimpleChanges) {
        // do stuff related to input1 changing.
    }

    @Watcher('input2')
    private _input2Changed(c: SimpleChanges) {
        // do stuff related to input2 changing.
    }
}
```

Much, much nicer, right? You can also watch for more than one input changing,
like this:

```typescript
@Component({...})
export class MyComponent extends BaseComponent {
    @Watcher('input1')
    @Watcher('input2')
    private _input1or2Changed(c: SimpleChanges) {
        // do stuff related with input1 or input2 changing.
    }
}
```

### Bonus: handling of observables

`BaseComponent` brings as bonus the handling of the observables subscription.
By extending `BaseComponent` and using `BaseComponent::connect` function
instead of subscribing to observables you can forget about observables and
unsubscribing from them. 

***Angular way of handling subscriptions***

```typescript
@Component({
    ...
})
export class MyCoolComponent implements OnDestroy, OnInit {
    private _subs: Array<Subscription> = [];

    constructor(private _myService: MyService, private _mySecondService: MySecondService){}

    ngOnInit() {
        this._subs.push(
            this._myService.observable$.subscribe(() => this._doStuff()),
        );

        this._subs.push(
            this._mySecondService.otherObservable$.subscribe(() => this._doOtherStuff()),
        )
    }

    ngOnDestroy() {
        this._subs.forEach(s => s.unsubscribe());
    }
}
```

Notice how ugly this is and also notice all the boilerplate code that we need
to write in each component (this code has to appear in each component
subscribing to an observable). Ugh... Ugly, ugly, ugly. 

Now, compare this ugly thing with the following beauty:

***Ng-cabled way***

```typescript
@Component({
    ...
})
export class MyCoolComponent extends BaseComponent {
    @Cabled(MyService) private _myService: MyService;
    @Cabled(MySecondService) private _mySecondService: MySecondService;

    @NgCycle('init')
    private _init() {
        this.connect(
            this._myService.observable$, 
            () => this._doStuff(),
        );
        this.connect(
            this._mySecondService.otherObservable$, 
            () => this._doOtherStuff(),
        )
    }
}
```

Ta daaaaa!!!! This is it. Nice, right? No boiler plate code, no worries about
unsubscribing. 

Also, you can have a third parameter to the `BaseComponent::connect` function,
in case you want to group the subscriptions to manually unsubscribe from them
at a certain point, like this:

```typescript
const SUBSCRIPTION_TYPE = 'my-separate-subscription';

@Component({
    ...
})
export class MyCoolComponent extends BaseComponent {
    @Cabled(MyService) private _myService: MyService;

    @NgCycle('init')
    private _init() {
        this.connect(
            this._myService.observable$, 
            () => {
                // If we have any subscriptions already running, 
                const subs = this.getSubscriptionsByType(SUBSCRIPTION_TYPE);
                // Unsubscribe from them
                subs.forEach(s => s.unsubscribe());
                // Then subscribe again to the other observable
                this.connect(
                    this._myService.otherObservable$, 
                    () => this._doStuff(),
                    // And group the subscription.
                    SUBSCRIPTION_TYPE,
                );
            }
        )
    }
}
```

Yes, I know, I know, I could've used a `switchMap` for this example. But this
is just an example to give you an idea. Maybe there are scenarios where you
can't use a `switchMap`, I don't know. And fine. If you really think that
there is no other use case, just don't use this feature. You can still use the
other beauties of this library, right? And I'm sure for those you don't have
such a strong counter argument. You see?

### BaseModule

In order to use all these beauties, you only need in each of your module to
pass the `Injector` to a parent module. So, in order for these annotations to
function, all your modules need to extend `BaseModule` and pass the `Injector`
like this:

```typescript
@NgModule({
    ...
})
export class MyCoolModule extends BaseModule {
    constructor(inj: Injector) {
        super(inj);
    }
}
```

That is it. This is the only price (including no money) that you have to pay
to use all these marvels that I just presented to you. 

#### Helping ng-cable

When using the `BaseModule`, there is a second parameter that you can pass to
`ng-cabled`. The second parameter represents the list of providers. This is
not mandatory. If you don't pass it, the `ng-cabled` library will try to
retrieve it from the angular module. The problem with this is that this is not
a public API. So, it might fail in a future version. 

Of course, I will try to maintain this also in future versions, but since it's
not using a public API, it might stop working without any deperecation
notices. If you want to be sure you won't be experiencing any issues, you can
set your module like this:

```typescript
const PROVIDERS = [
    MyService1, MyService2, ... // list is my list of providers
];

@NgModule({
    ...
    providers: PROVIDERS,
    ...
})
export class MyModule extends BaseModule {
    constructor(inj: Injector) {
        super(inj, PROVIDERS);
    }
}
```

Notice that I write the list of providers only once, and I also pass it to
`ng-cabled`. Like this, I am making sure `ng-cabled` is not using Angular
private API's.

Good luck. 

### Testing

`ng-cabled` provides also testing via annotations using `ng-cabled/testing`. 

In my oppinion, `describe`, `it`, `xit` and `fit` are very verbose. I don't
like all the boilerplate code that needs to be written to set the test bed. 

`ng-cabled` provides some annotations that will help testing: `NgTestUnit` and
`NgTest`, `FNgTest` and `XNgTest`. 

Another priciple that I follow when writting unit test cases is that I don't
do unit test cases for components. For testing component we have the e2e
testing. If you need to test the component with a unit test, it means that you
did it wrong. According to the `MVC` principles, the component (which can be
seen as the controller) has to be a dumb class. It should just take values
from the services and pass them to the view. 

I received quite a lot of times the question: "but if you don't test
components, how are you going to test for example that something is displayed
when using an `ngIf`". 

Well, if the component is well designed, that `ngIf` should be something very
simple like `*ngIf="value"` and that value should come from a service, or
something like `*ngIf="model | myPipe"`. What you need to test in an unit test
is the respective service or the pipe. After that you will trust Angular to do
it's job. Testing the fact that the element is displayed in the DOM would mean
actually testing that Angular is doing it's job. I'm sure they have their own
test cases, we don't need to build new ones. 

So, to recap. If you build your components properly and you don't need to unit
test them, if you only test the services in isolation, then you can use the
annotations provided by `ng-cabled/testing`. 

***NgTestUnit***

This should annotate a test unit. It takes as a parameter an array of
providers. Basically, instead of using `configureTestingModule`, you pass the
providers via the `NgTestUnit`. Then, each method of the class, annotated with
`NgTest` is a test case. For example, the following: 

```typescript

@NgTestUnit([
    MyService1, MyService2
])
export class MyFirstTestUnit {
    @Cabled(MyService1) private _service1: MyService1;
    @Cabled(MyService2) private _service2: MyService2;

    @NgTest()
    public testCase1() {
        ...
    }

    @NgTest()
    public testCase2() {
        ...
    }
}
```

would be translated like this:

```typescript
describe('...', () => {
    let _service1: MyService1;
    let _service2: MyService2;

    beforeAll(() => {
        TestBed.configureTestingModule({
            providers: [MyService1, MyService2],
        });

        _service1 = TestBed.get(MyService1);
        _service2 = TestBed.get(MyService2);
    });

    it('runs test case 1', () => {
        ...
    });

    it('runs test case 2', () => {
        ...
    });
})
```

Personally, I prefer to write it the java way, using a simple annotated class. 

The methods annotated with `XNgTest` or `FNgTest` are translated using `xit`
or `fit` instead of `it`.

In order to use these, you need to include all the specs containing the test
units and then to call the method `startTesting` from `ng-cabled/testing`. 

For an example, check the file `main.test.ts`: 

```typescript
import { startTesting } from 'ng-cabled/testing';
import './testing/decorators.spec';

startTesting();
```

Another advantage that you have if you build your components properly, is that
you don't need karma or a browser (meaning a DOM) to run the unit tests. You
can run them as a simple node process. 

If you are interested in how to do this, check out the `angular.json` file of
`ng-cabled`. See the "js" application. Or you can simply build them with
`tsc`. However, running the tests with `tsc` will probably require `babel`.
Even though you will not be testing the components, it is possible that some
services will call in some DOM parts which will fail in node. So you will need
`Babel` to remove those parts. If you don't want to complicate your life with
`Babel`, see the job "test" from the `package.json` of `ng-cabled`.
