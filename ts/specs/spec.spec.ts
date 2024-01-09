import {Cabled, DecoratedClass} from '../decorators';
import {TestBed} from '@angular/core/testing';

@DecoratedClass
export class Injected {
    public prop: string;

    constructor() {
        this.prop = 'prop';
    }
}

@DecoratedClass
export class DummyService {
    @Cabled(Injected) public service: Injected;
}

describe('Testing describe spec', () => {
    beforeAll(() => {
        TestBed.configureTestingModule({
            providers: [Injected, DummyService],
        });
    });

    it('should work', () => {
        const x = TestBed.inject(DummyService);
        expect(x).toBeDefined();
        expect(x.service).toBeDefined();
        expect(x instanceof DummyService).toBeTrue();
        expect(x.service instanceof Injected).toBeTrue();
        expect(x.service.prop).toEqual('prop');
    });

    afterAll(TestBed.resetTestingModule);
});
