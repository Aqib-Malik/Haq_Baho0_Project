import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuotationPrint } from './quotation-print';

describe('QuotationPrint', () => {
  let component: QuotationPrint;
  let fixture: ComponentFixture<QuotationPrint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuotationPrint]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuotationPrint);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
