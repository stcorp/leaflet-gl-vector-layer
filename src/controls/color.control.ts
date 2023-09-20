import * as L from 'leaflet';
import { ColorPicker } from './color-picker';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';
import { ControlsService } from '../services/controls-service';
import { IHandler } from '../types/typings';
import { ColorService, IColorEdgePoint } from '../services/color-service';
import { getGradientForEdgePoints } from '../helpers/color-transformers';

export class ColorControl {
  private container: HTMLElement;
  private colorPicker: ColorPicker;
  private collapsibleToggle: HTMLElement;
  private collapsibleContent: HTMLElement;
  private limitsChangedSubject = new Subject<{
    type: 'min' | 'max';
    value: number;
  }>();
  private dataRangeResetSubject = new Subject<boolean>();
  private destroyed$ = new ReplaySubject(1);
  private rangeMinInput: HTMLInputElement;
  private rangeMaxInput: HTMLInputElement;
  private handlers: IHandler[] = [];
  public limits$ = this.limitsChangedSubject.asObservable();
  public dataRangeReset$ = this.dataRangeResetSubject.asObservable();

  constructor(
    private controlsService: ControlsService,
    private colorService: ColorService
  ) {
    const defaultLimits = {
      min: this.controlsService.selectedLayer?.dataHelper.currentMinValue,
      max: this.controlsService.selectedLayer?.dataHelper.currentMaxValue,
    };
    this.container = L.DomUtil.create('div', 'color-control-container');

    this.collapsibleToggle = L.DomUtil.create('div', 'collapsible-toggle', this.container);
    this.collapsibleToggle.innerHTML = 'Toggle color-picker';
    const colorControlCaret = L.DomUtil.create('span', 'color-control-caret', this.collapsibleToggle);
    colorControlCaret.innerHTML = '<sub><strong>v</strong></sub>';
    this.collapsibleContent = L.DomUtil.create('div', 'collapsible-content', this.container);
    if (this.controlsService.isColorPickerOpen) {
      this.collapsibleContent.classList.add('open');
      this.collapsibleToggle.classList.add('open');
    }
    this.collapsibleToggle.addEventListener('click', () => {
      this.controlsService.isColorPickerOpen = !this.controlsService.isColorPickerOpen;
      this.collapsibleContent.classList.toggle('open');
      this.collapsibleToggle.classList.toggle('open');
    });
    this.colorPicker = new ColorPicker(this.colorService);
    this.colorService.colorMapSelected$.pipe(takeUntil(this.destroyed$)).subscribe(colorCollection => {
      this.colorPicker.setEdgePoints(colorCollection.colorPickerEdgePoints);
    });

    this.colorPicker.colorEdgePointsUpdated$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((colorEdgePoints: IColorEdgePoint[]) => {
        const gradient = getGradientForEdgePoints(colorEdgePoints);
        this.colorService.updateEdgePointsOfCurrentColorCollection(colorEdgePoints);
        this.colorService.setGradient(gradient);
      });

    this.collapsibleContent.appendChild(this.colorPicker.initialize());

    const colorControlRangeContainer = L.DomUtil.create(
      'div',
      'color-control-range-container',
      this.collapsibleContent
    );

    const colorRangeControlMinContainer = L.DomUtil.create(
      'div',
      'color-range-control min',
      colorControlRangeContainer
    );
    const colorRangeControlMaxContainer = L.DomUtil.create(
      'div',
      'color-range-control max',
      colorControlRangeContainer
    );
    const rangeMinLabel = L.DomUtil.create('span', 'color-range-control-label min', colorRangeControlMinContainer);
    const rangeMaxLabel = L.DomUtil.create('span', 'color-range-control-label max', colorRangeControlMaxContainer);
    rangeMinLabel.innerHTML = 'Limit to min-value:';
    rangeMaxLabel.innerHTML = 'Limit to max-value:';
    this.rangeMinInput = L.DomUtil.create('input', 'color-range-control-input min', colorRangeControlMinContainer);
    this.rangeMaxInput = L.DomUtil.create('input', 'color-range-control-input max', colorRangeControlMaxContainer);

    this.rangeMaxInput.type = 'number';
    this.rangeMinInput.type = 'number';
    this.rangeMinInput.value = String(defaultLimits.min);
    this.rangeMaxInput.value = String(defaultLimits.max);
    const maxHandler = {
      element: this.rangeMaxInput,
      func: this.onDataRangeChange.bind(this, 'max'),
      type: 'change',
    };
    const minHandler = {
      element: this.rangeMinInput,
      func: this.onDataRangeChange.bind(this, 'min'),
      type: 'change',
    };
    this.handlers.push(maxHandler);
    this.handlers.push(minHandler);
    maxHandler['element']?.addEventListener(maxHandler['type'], maxHandler['func']);
    minHandler['element']?.addEventListener(minHandler['type'], minHandler['func']);

    const colorControlButtonContainer = L.DomUtil.create(
      'div',
      'color-control-button-container',
      this.collapsibleContent
    );

    const rangeResetButton = L.DomUtil.create('div', 'color-control-button range-reset', colorControlButtonContainer);
    const rangeResetButtonInner = L.DomUtil.create(
      'div',
      'toggle-button-inner range-reset-button-inner',
      rangeResetButton
    );
    rangeResetButtonInner.innerHTML = 'Reset data range';

    const rangeResetHandler = {
      element: rangeResetButton,
      func: this.onRangeResetClick.bind(this),
      type: 'click',
    };
    rangeResetHandler['element'].addEventListener(rangeResetHandler['type'], rangeResetHandler['func']);

    this.controlsService.limits$.pipe(takeUntil(this.destroyed$)).subscribe(limits => {
      this.rangeMinInput.value = String(limits.min);
      this.rangeMaxInput.value = String(limits.max);
    });
  }

  private onRangeResetClick(event: any) {
    this.dataRangeResetSubject.next(true);
  }

  public getContainer() {
    return this.container;
  }

  private onDataRangeChange(type: 'min' | 'max', event: any) {
    let value = event.target.value;
    if (value === '') {
      value = 0;
    }
    if (type === 'max') {
      this.limitsChangedSubject.next({
        value: parseFloat(this.rangeMaxInput.value),
        type,
      });
    } else {
      this.limitsChangedSubject.next({
        type,
        value: parseFloat(this.rangeMinInput.value),
      });
    }
  }

  public cleanUp() {
    for (const handler of this.handlers) {
      if (handler.element) {
        handler.element.removeEventListener(handler.type, handler.func);
      }
    }
    this.colorPicker.cleanUp();
    this.container.replaceChildren();
  }
}
