import {MapMatrix} from "./map-matrix";
import {Map} from "leaflet";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import {ICanvasOverlayDrawEvent} from "./types/canvas-overlay-draw-event";
import chroma from "chroma-js";
import {IPoint} from "./types/point";
import {DataHelper} from "./helpers/data-helper";
import {IPolygon, IQuad, ITriangle} from "./types/polygon";


export abstract class BaseRenderer {

    public vertices: number[] = [];
    public numPoints: number = 0;
    public canvas: any;
    public gl: WebGLRenderingContext | WebGL2RenderingContext;
    public program: any;
    public mapMatrix: MapMatrix;
    public matrix: any;
    public abstract map: Map;
    public customColorMap: chroma.Scale;
    private vertBuffer: WebGLBuffer | null;
    private fragmentShader: WebGLShader;
    private vertexShader: WebGLShader;
    protected vertexValues: number[] = [];
    protected unwrappedGradient: any[][];
    protected colorFidelity: number = 10000;
    protected drawType: GLenum;
    private pointSizeLoc: any;
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
    
    `

    private defaultFragmentShader = `
        precision mediump float;
        varying lowp vec4 v_color;
        
        void main() {
            gl_FragColor = v_color;
        }
    `

    constructor(leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, canvas: HTMLCanvasElement, map: Map, private dataHelper: DataHelper) {
        this.unwrappedGradient = [];
        this.canvas = canvas;
        this.gl = this.canvas.getContext('webgl', { antialias: true });
        this.mapMatrix = new MapMatrix();
        this.createShaders();
        this.program = this.gl.createProgram();
        this.vertBuffer = this.gl.createBuffer();

        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);
        this.matrix = this.gl.getUniformLocation(this.program, "u_matrix");
        this.pointSizeLoc = this.gl.getUniformLocation(this.program, "u_pointSize");
        this.mapMatrix.setSize(this.canvas.width, this.canvas.height);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniformMatrix4fv(this.matrix, false, this.mapMatrix.array);
        this.gl.uniform1f(this.pointSizeLoc, leafletGlVectorLayerOptions.pointsize ?? 4.0);
    }

    private createShaders() {
        this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER) as WebGLShader;
        this.gl.shaderSource(this.vertexShader, this.defaultVertexShader as string);
        this.gl.compileShader(this.vertexShader);

        this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER) as WebGLShader;
        this.gl.shaderSource(this.fragmentShader, this.defaultFragmentShader as string);
        this.gl.compileShader(this.fragmentShader);

        if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
            throw('Fragment shader is broken');
        }
        if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
            throw('Vertex shader is broken');
        }
    }

    protected normalizeValue(value: number) {
        if(value <= this.dataHelper.currentMinValue) {
            return this.dataHelper.currentMinValue;
        } else if (value >= this.dataHelper.currentMaxValue) {
            return this.dataHelper.currentMaxValue;
        } else {
            return value;
        }
    }

    public updateColors() {
        this.unwrappedGradient = [];
        for(let i = 0; i < this.colorFidelity + 1; i++) {
            this.unwrappedGradient.push(this.customColorMap(i / this.colorFidelity).rgba());
        }

        for(let i = 0; i < this.vertexValues.length; i++) {
            let adjustedValue = (this.vertexValues[i] + this.dataHelper.absoluteCurrentMinValue) / (this.dataHelper.currentMaxValue + this.dataHelper.absoluteCurrentMinValue);
            let color = this.unwrappedGradient[Math.floor(adjustedValue * this.colorFidelity)];
            let index = i * 6 + 2;

            this.vertices[index] = color[0]/255;
            this.vertices[index + 1] = color[1]/255;
            this.vertices[index + 2] = color[2]/255;
            this.vertices[index + 3] = color[3];
        }
        this.updateBuffers();
        this.render();
    }

    public bindBuffers() {
        let colorLoc = this.gl.getAttribLocation(this.program, "a_color");
        var vertArray = new Float32Array(this.vertices);
        var fsize = vertArray.BYTES_PER_ELEMENT;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertArray, this.gl.STATIC_DRAW);
        let vertLoc = this.gl.getAttribLocation(this.program, "a_vertex");
        this.gl.vertexAttribPointer(vertLoc, 2, this.gl.FLOAT, false,4*6,0);
        this.gl.enableVertexAttribArray(vertLoc);
        this.gl.vertexAttribPointer(colorLoc, 4, this.gl.FLOAT, false, fsize*6, fsize*2);
        this.gl.enableVertexAttribArray(colorLoc);
    }

    public setCustomColorMap(colorMap: chroma.Scale) {
        this.customColorMap = colorMap;
    }
    public updateBuffers() {
        var vertArray = new Float32Array(this.vertices);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertArray, this.gl.STATIC_DRAW);
    }

    public render(event?: ICanvasOverlayDrawEvent) {
        if (!this.gl) return this;

        if(event) {
            const scale = Math.pow(2, event.zoom);
            // set base matrix to translate canvas pixel coordinates -> webgl coordinates
            this.mapMatrix
              .setSize(this.canvas.width, this.canvas.height)
              .scaleTo(scale)
              .translateTo(-event.offset.x, -event.offset.y);

        }

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniformMatrix4fv(this.matrix, false, this.mapMatrix.array);
        this.gl.drawArrays(this.drawType, 0, this.numPoints);
        return this;
    }

    protected buildPixel(xy: IPoint, value: number): [number, number, number, number, number, number] {
        let adjustedValue = (value + this.dataHelper.absoluteCurrentMinValue) / (this.dataHelper.currentMaxValue + this.dataHelper.absoluteCurrentMinValue);
        let color = this.unwrappedGradient[Math.floor(adjustedValue * this.colorFidelity)];
        return [xy.x, xy.y, color[0]/255, color[1]/255, color[2]/255, color[3]];
    }

    protected processData(callback?: () => void): void {
        this.vertexValues = [];
        this.unwrappedGradient = [];
        for(let i = 0; i < this.colorFidelity + 1; i++) {
            this.unwrappedGradient.push(this.customColorMap(i / this.colorFidelity).rgba());
        }
    }


    protected cutPolygon(polygon: IPolygon): [IPolygon, IPolygon] {
        let newNegativePolygon: IPolygon = [];
        let newPositivePolygon: IPolygon = [];
        for(let i = 0; i < polygon.length; i++) {
            if(polygon[i][1] < 0) {
                newNegativePolygon.push(polygon[i]);
                let nextIndex = (i + 1) % polygon.length;
                let nextLongitude = polygon[nextIndex][1];
                if(nextLongitude > 0) {
                    let halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
                    newNegativePolygon.push([halfwayPoint, -180])
                    newPositivePolygon.push([halfwayPoint, 180])
                }
            } else {
                newPositivePolygon.push(polygon[i]);
                let nextIndex = (i + 1) % polygon.length;
                let nextLongitude = polygon[nextIndex][1];
                if(nextLongitude < 0) {
                    let halfwayPoint = (polygon[i][0] + polygon[nextIndex][0]) / 2;
                    newPositivePolygon.push([halfwayPoint, 180])
                    newNegativePolygon.push([halfwayPoint, -180])
                }
            }
        }
        return [newNegativePolygon, newPositivePolygon];
    }

    protected createTrianglesFromPolygons(polygons: IPolygon[]): ITriangle[] {
        let triangles: ITriangle[] = [];
        for(let polygon of polygons) {
            triangles = triangles.concat(BaseRenderer.createTrianglesFromPolygon(polygon));
        }
        return triangles;
    }

    public createTrianglesFromQuad(polygon: IQuad): ITriangle[] {
        let triangle1: ITriangle = [
          [polygon[0][0], polygon[0][1]],
          [polygon[1][0], polygon[1][1]],
          [polygon[2][0], polygon[2][1]]
        ]

        let triangle2: ITriangle = [
          [polygon[0][0], polygon[0][1]],
          [polygon[2][0], polygon[2][1]],
          [polygon[3][0], polygon[3][1]]
        ]

        return [triangle1, triangle2];

    }

    private static createTrianglesFromPolygon(polygon: IPolygon): ITriangle[] {
        let latitudesSummed = polygon.reduce((sum: number, point: [number, number]) => sum + point[0], 0);
        let longitudesSummed = polygon.reduce((sum: number, point: [number, number]) => sum + point[1], 0);
        let centerPoint: [number, number] = [latitudesSummed/polygon.length, longitudesSummed/polygon.length];
        let triangles: ITriangle[] = [];
        for(let i = 0; i < polygon.length; i++) {
            let triangle: ITriangle = [polygon[i], polygon[(i + 1) % polygon.length], centerPoint];
            triangles.push(triangle);
        }
        return triangles;
    }

    protected addTrianglesToVertices(triangles: ITriangle[], value: number): void {
        for(let triangle of triangles) {
            let pixel = this.outputPixelFromlatLon(triangle[0][0], triangle[0][1], value)
            let pixel2 = this.outputPixelFromlatLon(triangle[1][0], triangle[1][1], value)
            let pixel3 = this.outputPixelFromlatLon(triangle[2][0], triangle[2][1], value)
            this.vertices.push(pixel[0], pixel[1], pixel[2], pixel[3], pixel[4], pixel[5])
            this.vertexValues.push(value);
            this.vertices.push(pixel2[0], pixel2[1], pixel2[2], pixel2[3], pixel2[4], pixel2[5])
            this.vertexValues.push(value);
            this.vertices.push(pixel3[0], pixel3[1], pixel3[2], pixel3[3], pixel3[4], pixel3[5])
            this.vertexValues.push(value);
        }
    }

    private outputPixelFromlatLon(latitude: number, longitude: number, value: number): [number, number, number, number, number, number] {
        let xy = this.map.project([latitude, longitude], 0);
        return this.buildPixel(xy, value);
    }
}
