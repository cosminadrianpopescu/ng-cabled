import {Injectable} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {AngularComponentCtor, Cabled, ClassConstructor, NgTestUnit, XNgTest} from '../decorators';

function Annotation(ctor: ClassConstructor | AngularComponentCtor): any {
    const result = class extends ctor {
        constructor(...args: Array<any>) {
            super(...args);
            console.log('i am new class');
        }
    }

    Injectable()(result);

    return result;
}

@Annotation
export class TestService {
    constructor() {
        console.log('hello test service');
    }
}

@NgTestUnit([TestService])
export class FutureTesting {
    @Cabled(TestService) private _service: TestService;

    @XNgTest()
    public testOverwriteNgAnnotations() {
        console.log('service is', TestBed.get(TestService));
    }
}
