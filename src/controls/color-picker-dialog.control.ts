import * as L from 'leaflet';
import { guidGenerator } from '../helpers/guid-generator';
import iro from '@jaames/iro';
import { Subject } from 'rxjs';
export class ColorPickerDialogControl {
  private container: HTMLElement;
  private parent: HTMLElement;
  private colorPicker: iro.ColorPicker|undefined;
  private toggleSubject = new Subject<{
      isOpen: boolean;
      cancel: boolean;
    }>();
  private colorChangeSubject = new Subject<any>();
  public colorChanged$ = this.colorChangeSubject.asObservable();
  public toggled$ = this.toggleSubject.asObservable();
  constructor() {
    this.container = L.DomUtil.create('div', 'color-picker-dialog color-picker-container');
  }

  public attachTo(parent: HTMLElement) {
    this.parent = parent;
    parent.appendChild(this.container);

    let colorPickerElement = L.DomUtil.create('div', 'color-picker', this.container)
    let id = `color-picker-${guidGenerator()}`;
    colorPickerElement.id = id;
    this.colorPicker = new (iro.ColorPicker as any)(`#${id}`, {
      width: 150,
      borderWidth: 2,
      borderColor: '#343434',
      layout: [
        {
          component: iro.ui.Wheel
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'alpha'
          }
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'value'
          }
        }
      ]
    });
    this.colorPicker?.on('color:change', (color: any) => {
      this.colorChangeSubject.next(color);
    });

    let colorPickerDialogButtonContainer = L.DomUtil.create('div', 'color-picker-dialog-button-container', this.container);
    let colorPickerDialogCancelButton = L.DomUtil.create('div', 'color-picker-dialog-button cancel', colorPickerDialogButtonContainer);
    let colorPickerDialogSubmitButton = L.DomUtil.create('div', 'color-picker-dialog-button success', colorPickerDialogButtonContainer);
    L.DomEvent.disableClickPropagation(this.container);

    colorPickerDialogSubmitButton.addEventListener('click', (event: MouseEvent) => {
      this.container.classList.toggle('show');
      this.toggleSubject.next({
        isOpen: false,
        cancel: false
      })
    })

    colorPickerDialogCancelButton.addEventListener('click', (event: MouseEvent) => {
      this.container.classList.toggle('show');
      this.toggleSubject.next({
        isOpen: false,
        cancel: true
      })
    })

  }

  public hide() {
    this.container.classList.remove('show');
  }
  public show() {
    this.container.classList.add('show');
    let anchorElement = document.querySelector('.control-wrapper-inner-container') as HTMLElement;
    let dialogBounds = this.container.getBoundingClientRect() as DOMRect;
    let parentTop = anchorElement.offsetTop;
    let parentLeft = anchorElement.offsetLeft;
    if(anchorElement) {
      let calculatedHeight = parentTop - dialogBounds.height;
      let calculatedWidth = parentLeft - dialogBounds.width;
      this.container.style.top = calculatedHeight < 0 ? 0 + 'px' : calculatedHeight + 'px';
      this.container.style.left = calculatedWidth < 0 ? 0 + 'px' : calculatedWidth + 'px';
    }
  }

  public setColors(colorString: string[]) {
    this.colorPicker?.setColors(colorString);
  }

  public cleanUp() {
    this.colorPicker?.setColors(['#ffffff']);
    this.colorPicker = undefined;
  }
}