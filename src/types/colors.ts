export type IRGBA = [number, number, number, number];
export type IXRGBA = [number, number, number, number, number];
export type IRGB = [number, number, number];
export type IColorWithLabel = [string, (IRGBA|IXRGBA|IRGB)[]];

export type IColor = IRGBA | IXRGBA | IRGB;
export type IColorMap = (IRGBA | IXRGBA | IRGB)[] | IColorWithLabel;