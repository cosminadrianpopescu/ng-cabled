import { __decorate, __metadata } from "tslib";
import { Cabled, DecoratedClass } from '../decorators';
import { TestBed } from '@angular/core/testing';
let Injected = class Injected {
    prop;
    constructor() {
        this.prop = 'prop';
    }
};
Injected = __decorate([
    DecoratedClass,
    __metadata("design:paramtypes", [])
], Injected);
export { Injected };
let DummyService = class DummyService {
    service;
};
__decorate([
    Cabled(Injected),
    __metadata("design:type", Injected)
], DummyService.prototype, "service", void 0);
DummyService = __decorate([
    DecoratedClass
], DummyService);
export { DummyService };
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
//# sourceMappingURL=spec.spec.js.map