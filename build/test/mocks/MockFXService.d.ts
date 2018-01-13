import { FXService } from '../../src/FXService/FXService';
import { Biglike } from '../../src/lib/types';
export declare class MockFXService extends FXService {
    setRate(rate: Biglike): void;
    setTime(time: Date): void;
    setChange(change: Biglike): void;
}
export declare const mockFXService: MockFXService;
