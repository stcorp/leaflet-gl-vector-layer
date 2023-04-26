import { ColorService } from '../services/color-service';
import { ReplaySubject, takeUntil } from 'rxjs';
import { ControlsService } from '../services/controls-service';
import throttle from 'lodash/throttle';

export class ColorBar {

  private wrapper: HTMLElement;
  private innerContainer: HTMLElement;
  private barWrapper: HTMLElement;
  private tickContainer: HTMLElement;
  private bar: HTMLCanvasElement;
  private destroyed$ = new ReplaySubject(1);
  private resizeObserver: ResizeObserver;
  private leafletControlContainer: HTMLElement;
  private label: HTMLElement;
  private throttledResizeBar = throttle(this.resizeBar.bind(this), 50);
  constructor(private colorService: ColorService, private controlsService: ControlsService) {
    this.initialize();
  }

  private initialize() {
    this.wrapper = L.DomUtil.create('div', 'color-bar-wrapper');
    this.innerContainer = L.DomUtil.create('div', 'color-bar-inner-container', this.wrapper);
    this.barWrapper = L.DomUtil.create('div', 'color-bar-bar-wrapper', this.innerContainer);
    this.tickContainer = L.DomUtil.create('div', 'color-bar-tick-container', this.barWrapper);
    this.label = L.DomUtil.create('div', 'color-bar-label', this.barWrapper);
    this.bar = L.DomUtil.create('canvas', 'color-bar', this.barWrapper);
    this.bar.height = 30;

    this.leafletControlContainer = document.querySelector('.leaflet-control-container') as HTMLElement;
    this.resizeObserver = new ResizeObserver(this.throttledResizeBar.bind(this));
    this.resizeObserver.observe(this.leafletControlContainer);
    this.label.innerHTML = this.controlsService.selectedLayer?.options?.leafletGlVectorLayerOptions?.label ?? '';

    this.controlsService.layerSelected$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(layer => {
      this.label.innerHTML = layer.options.leafletGlVectorLayerOptions?.label ?? '';
    });

    this.controlsService.limits$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(limits => {
      this.tickContainer.innerHTML = '';
      let min = limits.min;
      let max = limits.max;
      let range = max - min;
      let tickCount = 4;
      let tickWidth = this.bar.width / tickCount;
      for(let i = 0; i < tickCount + 1; i++) {
        let tickWrapper = L.DomUtil.create('div', 'tick-wrapper', this.tickContainer);
        let tickBar = L.DomUtil.create('div', 'tick-bar', tickWrapper);
        let tick = L.DomUtil.create('div', 'tick', tickWrapper);
        const number = min + (range / (tickCount)) * i;
        if(number > 1000 || (number < 0.01 && number !== 0)) {
          tick.innerHTML = number.toExponential(2);
        } else {
          tick.innerHTML = (min + (range / (tickCount)) * i).toFixed(2);
        }
      }
    })

    this.colorService.gradient$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(gradientData => {
      let context = this.bar.getContext('2d');
      if(context) {
        context.clearRect(0, 0, this.bar.width, this.bar.height);
        let gradient = context.createLinearGradient(0, 0, this.bar.width, 0);
        for(let i = 0; i <= 255; i++) {
          var color = gradientData.gradient(i / 255).rgba();
          gradient.addColorStop(i / 255, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`)
        }

        const region = new Path2D();
        context.beginPath();
        region.rect(0, 0, this.bar.width, this.bar.height);
        region.closePath();
        context.fillStyle = gradient;
        context.fill(region);
        context.strokeStyle = 'grey';
        context.lineCap = 'round';
        context.lineWidth = 1;
        context.stroke(region);
      }
    })
  }

  public getContainer() {
    return this.wrapper;
  }

  private resizeBar() {
    const bbox = this.leafletControlContainer.getBoundingClientRect();
    const multiplier = bbox.width / 1200;
    const newScale = (multiplier + 1) / 2;
    this.wrapper.style.transform = `scale(${Math.min(newScale, 1)}) translateX(${-100*(1-Math.min(newScale, 1))}px)`;
  }

  public cleanUp() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.resizeObserver.unobserve(this.leafletControlContainer);
    this.wrapper.replaceChildren();
    this.wrapper.remove();
  }
}