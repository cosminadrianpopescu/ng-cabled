# Ng Cabled

**Or, extending Angular components the proper way.**

This library contains a few decorators which will make extending components
practical and easy. 

***Install***

```
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
  boilerplate code and of course without repeating myself over and over
  again (and yes, I also want to unsubscribe even if I know that the service
  that I'm subscribing to is just a REST call).
* I want to have some common behavior (for example I would like a dropdown
  component and an autocomplete component to have a common behaviour regarding
  the data source and the sharing of the model).
* I want to be able to define abstract components or (more important) abstract
  services. 

These are just a few examples where inheritance is the most straight forward
solution.


***Counter-arguments / other options / ...***

Between the arguments that I've heard since I'm doing
Angular development, the only valid one was "use object composition". The
others like finding different more complicated solutions just because the code
would otherwise be more complicated are not even worth discussing. I'm not
going to discuss the reasoning that because some misterious reason OOP is
evil. 

Regarding object composition, I've tried this and it poses one major issue:
when it comes to modern developing tools, we are left on our own. There is no
IDE nor LSP server for angular which will properly interpret something like
this:

```
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
straightforward solution. So, until the IDE's and the tools (and I think also
the typescript language) will catch up with this, object composition is simply
not a useful practical solution to the problems enumerated previously.


***Challenges***

But, when extending components and services in Angular, we are facing some
major issues:

* Due to the dependency injection made via constructors (one of the worst
  patterns ever invented, but this is another discussion that you can see
  [here](https://github.com/cosminadrianpopescu/tsdim)) we need to know all
  the private dependencies of the component or service we want to extend. 
* A parent component implementing one of the life cycle hooks (like
  `ngOninit`) would risk that hook being overwritten in a child class and so
  having its behaviour broken.


***ng-cabled solution***

In order to solve this issues, this library provides a few decorators:

## `DecoratedClass` and `Cabled` annotations

These two annotations will help with dependency injection. They will be
responsible for injecting dependencies in a class. Use the `DecoratedClass`
annotation on top of all the classes that should contain any of the decorators
provided by the library. This will tell the compiler to check the class for
dependencies. And then, you add the `Cabled` annotation on all the properties
that should be automatically injected. 

Example:

### Normal Angular way:

```
export class ParentComponent {
    constructor(private _myPrivateService: MyService) {}
}

@Component({
    ...
})
export class ChildComponent {
    constructor(_baseClassPrivateService: MyService, private _myPrivateService: MyOtherService) {
        super(_baseClassPrivateService);
    }
}
```

### Ng-cabled way:

```
@DecoratedClass
export class ParentComponent {
    @Cabled(MyService) private _myPrivateService: MyService;
}

@DecoratedClass
export class ChildComponent extends ParentComponent {
    @Cabled(MyOtherService) private _myOtherService: MyOtherService;
}
```

Notice how the `ChildComponent` now does not know and does not care about the
internal private dependencies of `ParentComponent`.

The first argument of the `Cabled` annotation can be any Angular accepted
dependency injection token (it can be a class, it can be an `InjectionToken`,
it can be a string etc.).

Also, you can pass a second argument to the `Cabled` annotation which would
represent the default value. This would make the injection optional. If the
token is not solved by the dependency injection, no error is thrown and the
property is initialized with the given default value.

The only issue this poses is that we have no way to know in which order the
services will be instantiated. So, we can't use any of the services in
constructors. If we need to run some initializing code in the constructor of a
given service, just move that code in a private method annotated with the
`PostConstruct` annotation like this:

```
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

## `NgCycle` annotation

This annotation will solve the second problem of extending components: when
using any of the life cycle hooks, they can be later overriden in a child
component. 

Example: 

```
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
        this._myProperty = 'value';
    }
}

```

Notice how now the behaviour of the component is changed. The user of the
`ParentComponents` needs to know to call in `ChildComponent`'s `ngOnInit` the
`super.ngOnInit()`. Of course, when we have to deal with big development
teams, such a mistake could slip in the code resulting in unexpecting
behaviour. 

The solution to this problem is given by the `NgCycle` annotation. When using
this library, every component should extend `BaseComponent` class inside the
package. The `BaseComponent` contains the `ngOnInit`, `ngOnDestroy`,
`ngAfterViewInit` and `ngOnChange` methods as private. So, there is no danger
of overriding those methods in a child class, since that would result in a
compilation error. 

But this means that you also can't use them. A better of way of implementing
life cycle hooks (that Angular should've implemented itself) is via a
decorator. So, instead of using any of those 4 cycles, use the `NgCycle`
annotation with any of the arguments: `'init'`, `'afterViewInit'`, `'destroy'`
or `'change'`. Those method will be run on each of the respective cycle. The
example from above can be rewritten safely and more elegant like this:

```
@DecoratedClass
export class ParentComponent extends BaseComponent {
    @Input() public id: string;

    @NgCycle('init')
    private __initParentComponent__() {
        if (!id) {
            this.id = UUID();
        }
    }
}

@DecoratedClass
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

Another bonus the `BaseComponent` is bringing is handling of the observables
subscription. By extending `BaseComponent` and then instead of subscribing to
observables, use `BaseComponent::connect` function, you can forget about
observables and unsubscribing from them. 

Example: 

### Angular way of handling subscriptions:

```
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

### Ng-cabled way:

```
@Component({
    ...
})
@DecoratedClass
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
            () => this._doStuff(),
        )
    }
}
```

Ta daaaaa!!!! This is it. Nice, right? No boiler plate code, no worries about
unsubscribing. Also, you can have a third parameter to the
`BaseComponent::connect` function, in case you want to group the subscriptions
to manually unsubscribe from them at a certain point, like this:

```
const SUBSCRIPTION_TYPE = 'my-separate-subscription';

@Component({
    ...
})
@DecoratedClass
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
other beauties of this library right? And I'm sure for those you don't have
such a strong counter argument. You see?

In order to use all these beauties, you only need in each of your module to
pass the `Injector` to a parent module. So, in order for these annotations to
function, all your modules need to extend `BaseModule` and pass the `Injector`
like this:

```
@NgModule({
    ...
})
export class MyCoolModule extends BaseModule {
    constructor(_inj: Injector) {
        super(_inj);
    }
}
```

That is it. This is the only price (including no money) that you have to pay
to use all these marvels that I just presented to you. 

Good luck. 

*NOTE*: As a bonus, you also have the annotations `NgTestUnit` and `NgTest`,
`FNgTest` and `XNgTest`. These annotations are used if you want to generate
test cases instead of using directly `describe` and `it`.

In my oppinion, using `it`, `xit` and `fit` together with `describe` and
`configureTestingModule` is a lot of boilerplate code. So, I prefer to do my
test cases like this:

```
@NgTestUnit({
    // list of providers
    ...
})
export class MyCoolTestUnit {
    @NgTest()
    public myCoolTestCase() {
        ...
    }
}
```

The parameters of the test unit are the providers that you want to pass to
`configureTestingModule`. 

For a detailed example, see the `ts/testing/decorators.spec.ts` file. 
