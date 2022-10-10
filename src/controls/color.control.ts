import * as L from 'leaflet';
import { ColorPicker } from './color-picker';
import { Subject, Subscription } from 'rxjs';
import { ControlsService } from '../services/controls-service';
import { IHandler } from '../types/handlers';
import { ColorService, IColorEdgePoint } from '../services/color-service';
import { getGradientForEdgePoints } from '../helpers/color-transformers';

export class ColorControl {
  private container: HTMLElement;
  private colorPicker: ColorPicker;
  private limitsChangedSubject = new Subject<{
    type: 'min'|'max';
    value: number;
  }>();
  private dataRangeResetSubject = new Subject<boolean>();
  private rangeMinInput: HTMLInputElement;
  private rangeMaxInput: HTMLInputElement;
  private handlers: IHandler[] = [];
  private subscriptions: Subscription[] = [];
  public limits$ = this.limitsChangedSubject.asObservable();
  public dataRangeReset$ = this.dataRangeResetSubject.asObservable();

  constructor(private controlsService: ControlsService, private colorService: ColorService) {
    let defaultLimits = {
      min: this.controlsService.selectedLayer?.dataHelper.currentMinValue,
      max: this.controlsService.selectedLayer?.dataHelper.currentMaxValue
    }
    this.container = L.DomUtil.create('div', 'color-control-container');
    this.colorPicker = new ColorPicker(this.colorService);
    let selectedColorSubscription = this.colorService.colorMapSelectedSubject.subscribe((colorCollection) => {
      this.colorPicker.setEdgePoints(colorCollection.colorPickerEdgePoints);
    });
    let colorWrappersUpdatedSubscription = this.colorPicker.colorEdgePointsUpdated$.subscribe((colorEdgePoints: IColorEdgePoint[]) => {
      let gradient = getGradientForEdgePoints(colorEdgePoints);
      this.colorService.updateEdgePointsOfCurrentColorCollection(colorEdgePoints);
      this.colorService.setGradient(gradient);
    });
    this.subscriptions.push(colorWrappersUpdatedSubscription);
    this.subscriptions.push(selectedColorSubscription);

    let header = L.DomUtil.create('div', 'control-section-header', this.container);
    header.innerHTML = 'Control the color map of the layer';
    this.container.appendChild(this.colorPicker.initialize());

    let colorControlRangeContainer = L.DomUtil.create('div', 'color-control-range-container', this.container);

    let colorRangeControlMinContainer = L.DomUtil.create('div', 'color-range-control min', colorControlRangeContainer);
    let colorRangeControlMaxContainer = L.DomUtil.create('div', 'color-range-control max', colorControlRangeContainer);
    let rangeMinLabel = L.DomUtil.create('span', 'color-range-control-label min', colorRangeControlMinContainer);
    let rangeMaxLabel = L.DomUtil.create('span', 'color-range-control-label max', colorRangeControlMaxContainer);
    rangeMinLabel.innerHTML = 'Limit to min-value:';
    rangeMaxLabel.innerHTML = 'Limit to max-value:';
    this.rangeMinInput = L.DomUtil.create('input', 'color-range-control-input min', colorRangeControlMinContainer);
    this.rangeMaxInput = L.DomUtil.create('input', 'color-range-control-input max', colorRangeControlMaxContainer);


    this.rangeMaxInput.type = 'number';
    this.rangeMinInput.type = 'number';
    this.rangeMinInput.value = String(defaultLimits.min);
    this.rangeMaxInput.value = String(defaultLimits.max);
    let maxHandler = {
      element: this.rangeMaxInput,
      func: this.onDataRangeChange.bind(this, 'max'),
      type: 'change'
    }
    let minHandler = {
      element: this.rangeMinInput,
      func: this.onDataRangeChange.bind(this, 'min'),
      type: 'change'
    }
    this.handlers.push(maxHandler);
    this.handlers.push(minHandler);
    maxHandler['element']?.addEventListener(maxHandler['type'], maxHandler['func']);
    minHandler['element']?.addEventListener(minHandler['type'], minHandler['func']);

    let colorControlButtonContainer = L.DomUtil.create('div', 'color-control-button-container', this.container);

    let rangeResetButton = L.DomUtil.create('div', 'color-control-button range-reset', colorControlButtonContainer);
    let rangeResetButtonInner = L.DomUtil.create('div', 'toggle-button-inner range-reset-button-inner', rangeResetButton);
    rangeResetButtonInner.innerHTML = 'Reset data range';

    let rangeResetHandler = {
      element: rangeResetButton,
      func: this.onRangeResetClick.bind(this),
      type: 'click'
    }
    rangeResetHandler['element'].addEventListener(rangeResetHandler['type'], rangeResetHandler['func']);

    let limitsSubscription = this.controlsService.limitsSubject.subscribe((limits) => {
      this.rangeMinInput.value = String(limits.min);
      this.rangeMaxInput.value = String(limits.max);
    });
    this.subscriptions.push(limitsSubscription);
  }
  private onRangeResetClick(event: any) {
    this.dataRangeResetSubject.next(true);
  }
  public getContainer() {
    return this.container;
  }

  private onDataRangeChange(type: 'min'|'max', event: any) {
    let value = event.target.value;
    if(value === '') {
      value = 0;
    }
    if(type === 'max') {
      this.limitsChangedSubject.next({
        value: parseFloat(this.rangeMaxInput.value),
        type
      })
    } else {
      this.limitsChangedSubject.next({
        type,
        value: parseFloat(this.rangeMinInput.value)
      })
    }
  }

  public cleanUp() {
    for(let handler of this.handlers) {
      if(handler.element) {
        handler.element.removeEventListener(handler.type, handler.func);
      }
    }
    for(let subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.colorPicker.cleanUp();
    this.container.replaceChildren();
  }
}