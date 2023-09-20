import { MapMatrix } from './helpers/map-matrix';
import { Map } from 'leaflet';
import { LeafletGlVectorLayerOptions } from './types/typings';
import { ICanvasOverlayDrawEvent } from './types/typings';
import chroma from 'chroma-js';
import { IPoint } from './types/typings';
import { DataHelper } from './helpers/data-helper';
import { IPolygon, IQuad, ITriangle } from './types/typings';

export interface GlCollectionWrapper {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  canvas: HTMLCanvasElement;
  matrix: WebGLUniformLocation;
  pointSizeLoc: WebGLUniformLocation;
  vertBuffer: WebGLBuffer;
}

export abstract class BaseRenderer {
  public vertices: number[] = [];
  public numPoints: number = 0;
  public glContextWrapper: GlCollectionWrapper | undefined;
  public mapMatrix: MapMatrix;
  protected map: Map | undefined;
  public customColorMap: chroma.Scale;
  private fragmentShader: WebGLShader;
  private vertexShader: WebGLShader;
  protected vertexValues: number[] = [];
  protected unwrappedGradient: any[][];
  protected colorFidelity: number = 1000;
  protected drawType: GLenum;
  private defaultVertexShader = `    
        uniform mat4 u_matrix;
        uniform float u_pointSize;
        attribute vec4 a_vertex;
        attribute vec4 a_color;
        varying vec4 v_color;
        
        
        void main() {
          // Set the size of the point
        
          // multiply each vertex by a matrix.
          gl_Position = u_matrix * a_vertex;
        
        
          // pass the color to the fragment shader
          v_color = a_color;
          gl_PointSize = u_pointSize;
        }
    
    `;

  private defaultFragmentShader = `
        precision mediump float;
        varying lowp vec4 v_color;
        
        void main() {
            gl_FragColor = v_color;
        }
    `;

  constructor(
    leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions,
    map: Map,
    protected dataHelper: DataHelper,
    private canvas: HTMLCanvasElement
  ) {
    this.unwrappedGradient = [];
    this.mapMatrix = new MapMatrix();
    this.createGlContext(this.canvas, leafletGlVectorLayerOptions);
  }

  private createGlContext(canvas: HTMLCanvasElement, leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions) {
    const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) {
      return;
    }
    this.createShaders(gl);
    const program = gl.createProgram();
    const vertBuffer = gl.createBuffer();

    if (!program || !vertBuffer) {
      return;
    }
    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, this.fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    const matrix = gl.getUniformLocation(program, 'u_matrix');
    if (!matrix) {
      return;
    }
    const pointSizeLoc = gl.getUniformLocation(program, 'u_pointSize');
    if (!pointSizeLoc) {
      return;
    }
    this.mapMatrix.setSize(canvas.width, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(matrix, false, this.mapMatrix.array);
    gl.uniform1f(pointSizeLoc, leafletGlVectorLayerOptions.pointsize ?? 4.0);
    this.glContextWrapper = {
      gl,
      program,
      canvas,
      matrix,
      pointSizeLoc,
      vertBuffer,
    };
  }

  private createShaders(gl: WebGLRenderingContext) {
    this.vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
    gl.shaderSource(this.vertexShader, this.defaultVertexShader as string);
    gl.compileShader(this.vertexShader);

    this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
    gl.shaderSource(this.fragmentShader, this.defaultFragmentShader as string);
    gl.compileShader(this.fragmentShader);

    if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
      throw 'Fragment shader is broken';
    }
    if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
      throw 'Vertex shader is broken';
    }
  }

  protected normalizeValue(value: number) {
    if (value <= this.dataHelper.currentMinValue) {
      return this.dataHelper.currentMinValue;
    } else if (value >= this.dataHelper.currentMaxValue) {
      return this.dataHelper.currentMaxValue;
    } else {
      return value;
    }
  }

  public updateColors() {
    this.unwrappedGradient = [];
    if (!this.customColorMap || !this.colorFidelity) {
      return;
    }
    for (let i = 0; i < this.colorFidelity + 1; i++) {
      try {
        this.unwrappedGradient.push(this.customColorMap(i / this.colorFidelity).rgba());
      } catch (e) {
        console.log(e);
      }
    }
    for (let i = 0; i < this.vertexValues.length; i++) {
      const adjustedValue =
        (this.vertexValues[i] - this.dataHelper.currentMinValue) /
        (this.dataHelper.currentMaxValue - this.dataHelper.currentMinValue || 1);
      const color = this.unwrappedGradient[Math.floor(adjustedValue * this.colorFidelity)];
      const index = i * 6 + 2;

      this.vertices[index] = color[0] / 255;
      this.vertices[index + 1] = color[1] / 255;
      this.vertices[index + 2] = color[2] / 255;
      this.vertices[index + 3] = color[3];
    }
    this.updateBuffers();
  }

  public bindBuffers() {
    if (!this.glContextWrapper) {
      return;
    }
    const colorLoc = this.glContextWrapper.gl.getAttribLocation(this.glContextWrapper.program, 'a_color');
    const vertArray = new Float32Array(this.vertices);
    const fsize = vertArray.BYTES_PER_ELEMENT;

    this.glContextWrapper.gl.bindBuffer(this.glContextWrapper.gl.ARRAY_BUFFER, this.glContextWrapper.vertBuffer);
    this.glContextWrapper.gl.bufferData(
      this.glContextWrapper.gl.ARRAY_BUFFER,
      vertArray,
      this.glContextWrapper.gl.STATIC_DRAW
    );
    const vertLoc = this.glContextWrapper.gl.getAttribLocation(this.glContextWrapper.program, 'a_vertex');
    this.glContextWrapper.gl.vertexAttribPointer(vertLoc, 2, this.glContextWrapper.gl.FLOAT, false, 4 * 6, 0);
    this.glContextWrapper.gl.enableVertexAttribArray(vertLoc);
    this.glContextWrapper.gl.vertexAttribPointer(
      colorLoc,
      4,
      this.glContextWrapper.gl.FLOAT,
      false,
      fsize * 6,
      fsize * 2
    );
    this.glContextWrapper.gl.enableVertexAttribArray(colorLoc);
  }

  public setCustomColorMap(colorMap: chroma.Scale) {
    this.customColorMap = colorMap;
  }
  public updateBuffers() {
    if (!this.glContextWrapper) {
      return;
    }
    const vertArray = new Float32Array(this.vertices);
    this.glContextWrapper.gl.bindBuffer(this.glContextWrapper.gl.ARRAY_BUFFER, this.glContextWrapper.vertBuffer);
    this.glContextWrapper.gl.bufferData(
      this.glContextWrapper.gl.ARRAY_BUFFER,
      vertArray,
      this.glContextWrapper.gl.STATIC_DRAW
    );
  }

  public render(event: ICanvasOverlayDrawEvent) {
    if (!this.glContextWrapper?.gl) return this;
    if (event) {
      const scale = event.scale;
      const bounds = {
        lonMin: event.bounds.getWest(),
        lonMax: event.bounds.getEast(),
        latMin: event.bounds.getSouth(),
        latMax: event.bounds.getNorth(),
      };
      const offset = { ...event.offset };
      this.drawWebGl(bounds, scale, offset);
    }

    return this;
  }

  private drawWebGl(bounds: any, scale: number, offset: any) {
    if (!this.glContextWrapper) {
      return;
    }
    // Keep offset in bounds of canvas
    while (offset.x < -512) {
      offset.x += 256;
    }
    while (offset.x > 256) {
      offset.x -= 256;
    }
    // Clear viewport and draw main image
    this.glContextWrapper.gl.clear(this.glContextWrapper.gl.COLOR_BUFFER_BIT);
    this.glContextWrapper.gl.viewport(0, 0, this.glContextWrapper.canvas.width, this.glContextWrapper.canvas.height);
    this.drawSingleCopyOfData(scale, offset, 0);

    // If map is zoomed out enough to wrap around the world, draw copies of data on the left and right
    if (bounds.lonMin < -180 || bounds.lonMax > 180) {
      const lonDistance = bounds.lonMax - bounds.lonMin;
      const countOfWorldWraps = Math.ceil(lonDistance / 360);
      for (let i = 1; i <= countOfWorldWraps; i++) {
        this.drawSingleCopyOfData(scale, offset, i);
        this.drawSingleCopyOfData(scale, offset, -i);
      }
    }
  }

  private drawSingleCopyOfData(scale: number, offset: { x: number; y: number }, tileMultiplier: number) {
    if (!this.glContextWrapper) {
      return;
    }

    this.mapMatrix
      .setSize(this.glContextWrapper.canvas.width, this.glContextWrapper.canvas.height)
      .scaleTo(scale)
      .translateTo(-offset.x + 256 * tileMultiplier, -offset.y);
    this.glContextWrapper.gl.uniformMatrix4fv(this.glContextWrapper.matrix, false, this.mapMatrix.array);
    this.glContextWrapper.gl.drawArrays(this.drawType, 0, this.numPoints);
  }

  protected buildPixel(xy: IPoint, value: number): [number, number, number, number, number, number] {
    const adjustedValue =
      (value - this.dataHelper.currentMinValue) /
      (this.dataHelper.currentMaxValue - this.dataHelper.currentMinValue || 1);
    const color = this.unwrappedGradient[Math.floor(adjustedValue * this.colorFidelity)];
    return [xy.x, xy.y, color[0] / 255, color[1] / 255, color[2] / 255, color[3]];
  }

  protected processData(callback?: () => void): void {
    this.vertexValues = [];
    this.unwrappedGradient = [];
    for (let i = 0; i < this.colorFidelity + 1; i++) {
      this.unwrappedGradient.push(this.customColorMap(i / this.colorFidelity).rgba());
    }
  }

  protected cutPolygon(polygon: IPolygon): [IPolygon, IPolygon] {
    const newNegativePolygon: IPolygon = [];
    const newPositivePolygon: IPolygon = [];
    for (let i = 0; i < polygon.length; i++) {
      if (polygon[i][1] < 0) {
        newNegativePolygon.push(polygon[i]);
        const nextIndex = (i + 1) % polygon.length;
        const nextLongitude = polygon[nextIndex][1];
        if (nextLongitude > 0) {
          const halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
          newNegativePolygon.push([halfwayPoint, -180]);
          newPositivePolygon.push([halfwayPoint, 180]);
        }
      } else {
        newPositivePolygon.push(polygon[i]);
        const nextIndex = (i + 1) % polygon.length;
        const nextLongitude = polygon[nextIndex][1];
        if (nextLongitude < 0) {
          const halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
          newPositivePolygon.push([halfwayPoint, 180]);
          newNegativePolygon.push([halfwayPoint, -180]);
        }
      }
    }
    return [newNegativePolygon, newPositivePolygon];
  }

  protected createTrianglesFromPolygons(polygons: IPolygon[]): ITriangle[] {
    let triangles: ITriangle[] = [];
    for (const polygon of polygons) {
      triangles = triangles.concat(BaseRenderer.createTrianglesFromPolygon(polygon));
    }
    return triangles;
  }

  public createTrianglesFromQuad(polygon: IQuad): ITriangle[] {
    const triangle1: ITriangle = [
      [polygon[0][0], polygon[0][1]],
      [polygon[1][0], polygon[1][1]],
      [polygon[2][0], polygon[2][1]],
    ];

    const triangle2: ITriangle = [
      [polygon[0][0], polygon[0][1]],
      [polygon[2][0], polygon[2][1]],
      [polygon[3][0], polygon[3][1]],
    ];

    return [triangle1, triangle2];
  }

  private static createTrianglesFromPolygon(polygon: IPolygon): ITriangle[] {
    const latitudesSummed = polygon.reduce((sum: number, point: [number, number]) => sum + point[0], 0);
    const longitudesSummed = polygon.reduce((sum: number, point: [number, number]) => sum + point[1], 0);
    const centerPoint: [number, number] = [latitudesSummed / polygon.length, longitudesSummed / polygon.length];
    const triangles: ITriangle[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const triangle: ITriangle = [polygon[i], polygon[(i + 1) % polygon.length], centerPoint];
      triangles.push(triangle);
    }
    return triangles;
  }

  protected addTrianglesToVertices(triangles: ITriangle[], value: number): void {
    for (const triangle of triangles) {
      const pixel = this.outputPixelFromlatLon(triangle[0][0], triangle[0][1], value);
      const pixel2 = this.outputPixelFromlatLon(triangle[1][0], triangle[1][1], value);
      const pixel3 = this.outputPixelFromlatLon(triangle[2][0], triangle[2][1], value);
      this.vertices.push(pixel[0], pixel[1], pixel[2], pixel[3], pixel[4], pixel[5]);
      this.vertexValues.push(value);
      this.vertices.push(pixel2[0], pixel2[1], pixel2[2], pixel2[3], pixel2[4], pixel2[5]);
      this.vertexValues.push(value);
      this.vertices.push(pixel3[0], pixel3[1], pixel3[2], pixel3[3], pixel3[4], pixel3[5]);
      this.vertexValues.push(value);
    }
  }

  private outputPixelFromlatLon(
    latitude: number,
    longitude: number,
    value: number
  ): [number, number, number, number, number, number] {
    if (!this.map) {
      return [0, 0, 0, 0, 0, 0];
    }
    const xy = this.map.project([latitude, longitude], 0);
    return this.buildPixel(xy, value);
  }

  protected cleanUp() {
    this.glContextWrapper?.gl.deleteBuffer(this.glContextWrapper?.vertBuffer);
    this.glContextWrapper?.gl.deleteProgram(this.glContextWrapper?.program);
    this.glContextWrapper?.gl.deleteShader(this.fragmentShader);
    this.glContextWrapper?.gl.deleteShader(this.vertexShader);
    this.glContextWrapper = undefined;
    this.map = undefined;
    this.dataHelper.cleanUp();
  }
}
