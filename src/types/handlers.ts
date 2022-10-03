export interface IHandler {
  element?: HTMLElement|Document;
  func: (event: any) => void;
  type: string;
}