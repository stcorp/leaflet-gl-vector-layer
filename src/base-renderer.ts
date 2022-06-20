import {MapMatrix} from "./map-matrix";
import {Map} from "leaflet";
import {LeafletGlVectorLayerOptions} from "./types/leaflet-gl-vector-layer-options";
import {ICanvasOverlayDrawEvent} from "./types/canvas-overlay-draw-event";
import chroma from "chroma-js";
import {IPoint} from "./types/point";
import {DataHelper} from "./helpers/data-helper";
import {IPolygon, IQuad, ITriangle} from "./types/polygon";

export interface GlCollectionWrapper {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    canvas: HTMLCanvasElement;
    matrix: WebGLUniformLocation;
    pointSizeLoc: WebGLUniformLocation;
    vertBuffer: WebGLBuffer;
    offsetMultiplier: number;
}

export abstract class BaseRenderer {

    public vertices: number[] = [];
    public numPoints: number = 0;
    public canvas: any;
    public glContextWrappers: GlCollectionWrapper[] = [];
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

    constructor(leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, canvases: HTMLCanvasElement[], map: Map, private dataHelper: DataHelper) {
        this.unwrappedGradient = [];
        this.mapMatrix = new MapMatrix();
        for(let [index, canvas] of canvases.entries()) {
            let offset;
            if(index === 0) {
                offset = -2;
            } else if (index === 1) {
                offset = -1;
            } else if (index === 2){
                offset = 0;
            } else if (index === 3) {
                offset = 1;
            } else {
                offset = 2;
            }
            this.createGlContext(canvas, leafletGlVectorLayerOptions, offset);
        }
    }

    private createGlContext(canvas: HTMLCanvasElement, leafletGlVectorLayerOptions: LeafletGlVectorLayerOptions, offsetMultiplier: number) {

        let gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
        if(!gl) {
            return;
        }
        this.createShaders(gl);
        let program = gl.createProgram();
        let vertBuffer = gl.createBuffer();

        if(!program || !vertBuffer) {
            return;
        }
        gl.attachShader(program, this.vertexShader);
        gl.attachShader(program, this.fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        let matrix = gl.getUniformLocation(program, "u_matrix");
        if(!matrix) {
            return;
        }
        let pointSizeLoc = gl.getUniformLocation(program, "u_pointSize");
        if(!pointSizeLoc) {
            return;
        }
        this.mapMatrix.setSize(canvas.width, canvas.height);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniformMatrix4fv(matrix, false, this.mapMatrix.array);
        gl.uniform1f(pointSizeLoc, leafletGlVectorLayerOptions.pointsize ?? 4.0);
        this.glContextWrappers.push({
            gl,
            program,
            canvas,
            matrix,
            pointSizeLoc,
            vertBuffer,
            offsetMultiplier
        })
    }

    private createShaders(gl: WebGLRenderingContext) {
        this.vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
        gl.shaderSource(this.vertexShader, this.defaultVertexShader as string);
        gl.compileShader(this.vertexShader);

        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
        gl.shaderSource(this.fragmentShader, this.defaultFragmentShader as string);
        gl.compileShader(this.fragmentShader);

        if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
            throw('Fragment shader is broken');
        }
        if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
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
    }

    public bindBuffers() {
        for(let glContextWrapper of this.glContextWrappers) {
            let colorLoc = glContextWrapper.gl.getAttribLocation(glContextWrapper.program, "a_color");
            var vertArray = new Float32Array(this.vertices);
            var fsize = vertArray.BYTES_PER_ELEMENT;

            glContextWrapper.gl.bindBuffer(glContextWrapper.gl.ARRAY_BUFFER, glContextWrapper.vertBuffer);
            glContextWrapper.gl.bufferData(glContextWrapper.gl.ARRAY_BUFFER, vertArray, glContextWrapper.gl.STATIC_DRAW);
            let vertLoc = glContextWrapper.gl.getAttribLocation(glContextWrapper.program, "a_vertex");
            glContextWrapper.gl.vertexAttribPointer(vertLoc, 2, glContextWrapper.gl.FLOAT, false,4*6,0);
            glContextWrapper.gl.enableVertexAttribArray(vertLoc);
            glContextWrapper.gl.vertexAttribPointer(colorLoc, 4, glContextWrapper.gl.FLOAT, false, fsize*6, fsize*2);
            glContextWrapper.gl.enableVertexAttribArray(colorLoc);
        }
    }

    public setCustomColorMap(colorMap: chroma.Scale) {
        this.customColorMap = colorMap;
    }
    public updateBuffers() {
        var vertArray = new Float32Array(this.vertices);
        for(let glContextWrapper of this.glContextWrappers) {
            glContextWrapper.gl.bindBuffer(glContextWrapper.gl.ARRAY_BUFFER, glContextWrapper.vertBuffer);
            glContextWrapper.gl.bufferData(glContextWrapper.gl.ARRAY_BUFFER, vertArray, glContextWrapper.gl.STATIC_DRAW);
        }

    }

    public render(event: ICanvasOverlayDrawEvent) {
        for(let glContextWrapper of this.glContextWrappers) {

        }
        if (!event.glContextWrapper.gl) return this;

        if(event) {
            const scale = Math.pow(2, event.zoom);
            // set base matrix to translate canvas pixel coordinates -> webgl coordinates
            this.mapMatrix
              .setSize(event.glContextWrapper.canvas.width, event.glContextWrapper.canvas.height)
              .scaleTo(scale)
              .translateTo(-event.offset.x, -event.offset.y);
        }

        event.glContextWrapper.gl.clear(event.glContextWrapper.gl.COLOR_BUFFER_BIT);
        event.glContextWrapper.gl.viewport(0, 0, event.glContextWrapper.canvas.width, event.glContextWrapper.canvas.height);
        event.glContextWrapper.gl.uniformMatrix4fv(event.glContextWrapper.matrix, false, this.mapMatrix.array);
        event.glContextWrapper.gl.drawArrays(this.drawType, 0, this.numPoints);
        return this;
    }
    //
    // public renderDuplicateCanvas(event: ICanvasOverlayDrawEvent) {
    //     if (!this.gl || !event.canvas) {
    //         return this;
    //     }
    //     event.canvas.getContext('2d')!.clearRect(0, 0, event.canvas.width, event.canvas.height);
    //
    //
    //     let duplicateUntil = 900;
    //     let duplicatedUntil = 180;
    //     while(duplicatedUntil <= duplicateUntil) {
    //         let projectedXy = this.map.project([90, duplicatedUntil], this.map.getZoom());
    //         event.canvas.getContext('2d')!.drawImage(this.canvas, projectedXy.x, 0);
    //         duplicatedUntil += 360;
    //     }
    //
    //     duplicateUntil = -900;
    //     duplicatedUntil = -180;
    //     while(duplicatedUntil >= duplicateUntil) {
    //         let projectedXy = this.map.project([90, duplicatedUntil], this.map.getZoom());
    //         console.log(projectedXy);
    //         event.canvas.getContext('2d')!.drawImage(this.canvas, projectedXy.x, 0);
    //         duplicatedUntil -= 360;
    //     }
    //     return this;
    // }

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
