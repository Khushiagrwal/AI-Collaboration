import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiPanalModal } from './ai-panal-modal';

describe('AiPanalModal', () => {
  let component: AiPanalModal;
  let fixture: ComponentFixture<AiPanalModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPanalModal],
    }).compileComponents();

    fixture = TestBed.createComponent(AiPanalModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
