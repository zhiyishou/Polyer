/**
 * Created by lz on 2015/5/24.
 */
(function (window) {
    "use strict";

    /*
     * @for init webgl and throw the error if the browser do not support webgl
     * @parameters
     *   canvas      //[Object]  dom element of canvas
     * @return
     *   content     //[Object]  context of webgl canvas
     * */
    function initWebGL(canvas, options) {
        try {
            return canvas.getContext("experimental-webgl", options);
        } catch (e) {
            console.error("Error creating WebGL" + e.toString());
        }
    }

    /*
     * @for init viewport to full width and height
     * @parameters
     *   _this       //[Object]  this object
     * */
    function initViewport(_this) {
        _this.gl.viewport(0, 0, _this.canvas.width, _this.canvas.height);
    }

    /*
     * @for create and compile a vertex or fragment shader
     * @parameters
     *   _this       //[Object]  this object
     *   str         //[String]  content of shader
     *   type        //[String]  type of shader
     * @return
     *   shader      //[Object]  OpenGL ES shader
     * */
    function produceShader(_this, str, type) {
        var gl = _this.gl,
            shader;

        if (type == "fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (type == "vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return console.error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    /*
     * @for link vertex shader and fragment shader to produce a shader program
     * @parameters
     *   _this          //[Object]  this object
     *   args           //[Object]  arguments for creating a shader ,
     *                  //          vertex and fragment necessary to be contained
     * @return
     *   shaderProgram  //[Object]  shader program
     * */
    function linkShader(_this, args) {
        var gl = _this.gl,
            vertexShader = produceShader(_this, args.vertex, "vertex"),
            fragmentShader = produceShader(_this, args.fragment, "fragment"),
            shaderProgram = args.program = gl.createProgram();

        args.attributes || (args.attributes = {});
        args.uniforms || (args.uniforms = {});

        gl.attachShader(shaderProgram, fragmentShader);
        gl.attachShader(shaderProgram, vertexShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error("Could not initialise shaders");
        }
        _this.setCurrentProgram(shaderProgram);
        return shaderProgram;
    }

    /*
     * @for update position array with current width and height of image
     * so the image would show normally without stretching
     * @parameters
     *   _this       //[Object]      this object
     *   posArray    //[Array]       a position array in attribute buffer
     *   width       //[Number]      width of image
     *   height      //[Number]      height of image
     * */
    function updateSquareSize(_this, posArray, width, height) {
        var canvas = _this.canvas,
            scale = width / height;

        if (canvas.width / canvas.height > scale) {
            //process height equals to canvas's height and compress it's width
            posArray[0] = posArray[6] = -width / height * canvas.height / canvas.width;
            posArray[3] = posArray[9] = width / height * canvas.height / canvas.width;
            posArray[1] = posArray[4] = 1;
            posArray[7] = posArray[10] = -1;
        } else {
            //process width equals to canvas's width and compress it's height
            posArray[0] = posArray[6] = -1;
            posArray[3] = posArray[9] = 1;
            posArray[1] = posArray[4] = height / width * canvas.width / canvas.height;
            posArray[7] = posArray[10] = -height / width * canvas.width / canvas.height;
        }

        _this.setTextureSize(false, posArray[3], posArray[1]);
    }

    /*
     * @for store shaderProgram handlers to attributes or uniforms
     * and update date through handler to shader from the buffer of arguments attributes or uniforms
     * @parameters
     *   _this       //[Object]  this object
     *   attributes  //[Object]  attributes we wanna link and update
     *   uniforms    //[Object]  uniforms we wanna link and update
     *   onlyUpdate  //[Boolean] only update date through handlers base on we have stored handlers
     * */
    function linkAndUpdateShaderHandler(_this, attributes, uniforms, onlyUpdate) {
        var gl = _this.gl,
            shaderProgram = _this.getCurrentProgram(),
            i;

        for (i in attributes) {
            onlyUpdate || (attributes[i].handler = gl.getAttribLocation(shaderProgram, i));
            updateAttribute(_this, attributes[i]);
        }

        for (i in uniforms) {
            onlyUpdate || (uniforms[i].handler = gl.getUniformLocation(shaderProgram, i));
            updateUniform(_this, uniforms[i]);
        }
    }

    /*
     * @for update single attribute with its buffer into current shader by STATIC_DRAW way
     * @parameters
     *   _this       //[Object]      this object
     *   attribute   //[Object]      single attribute contains handler,buffer array,size,type
     * */
    function updateAttribute(_this, attribute) {
        var gl = _this.gl,
            buffer = attribute.buffer;

        switch (attribute.type) {
            case "float":
                gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer[0]), attribute.bufferUsage || gl.STATIC_DRAW);
                gl.enableVertexAttribArray(attribute.handler);

                gl.vertexAttribPointer(attribute.handler, attribute.size, gl.FLOAT, false, 0, 0);
                break;
        }
    }

    /*
     * @for update single uniform handler with its buffer into current shader
     * @parameters
     *   _this       //[Object]  this object
     *   uniform     //[Object]  single uniform contains handler,buffer array,type
     * */
    function updateUniform(_this, uniform) {
        var gl = _this.gl,
            buffer = uniform.buffer;

        switch (uniform.type) {
            case "bool":
            case "float":
                gl.uniform1f(uniform.handler, buffer[0]);
                break;
            case "vec2":
                gl.uniform2f(uniform.handler, buffer[0], buffer[1]);
                break;
            case "vec3":
                gl.uniform3f(uniform.handler, buffer[0], buffer[1], buffer[2]);
                break;
            case "vec4":
                gl.uniform4f(uniform.handler, buffer[0], buffer[1], buffer[2], buffer[3]);
                break;
            case "mat4":
                gl.uniformMatrix4fv(uniform.handler, false, buffer[0]);
                break;
            case "sampler2D":
                gl.uniform1i(uniform.handler, buffer[0]);
                break;
        }
    }

    /*
     * @for debug the points that webgl created
     * @parameters
     *   width       //[Number]  canvas's width
     *   height      //[Number]  canvas's height
     *   points      //[Array]   points array
     *   triangles   //[Array]   array of triangles vertex
     * */
    function debugPoints(width, height, points, triangles) {
        var canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d"),
            i,
            j;

        canvas.width = width;
        canvas.height = height;
        ctx.strokeStyle = "red";
        for (i = triangles.length, j = 0; i;) {
            ctx.beginPath();
            --i;
            ctx.moveTo(points[triangles[i]][0], points[triangles[i]][1]);
            --i;
            ctx.lineTo(points[triangles[i]][0], points[triangles[i]][1]);
            --i;
            ctx.lineTo(points[triangles[i]][0], points[triangles[i]][1]);
            ctx.closePath();
            ctx.stroke();
        }

        document.body.appendChild(canvas);
    }

    /*
     * @for create a array contains all the triangles vertex and another array contains the color corresponding to the vertex
     * @parameters
     *   _this          //[Object]      this obj
     *   points         //[Array]       points created by getEdgeFromColor or called edge points
     *   colors         //[Uint8Array]  the original color of the picture
     *   triangles      //[Array]       triangles after delaunay
     *   width          //[Number]      width of the texture
     *   height         //[Number]      height of the texture
     *   useAverageColor//[Boolean]     if set the color to the average of three vertex on a triangle
     * @return
     *   {
     *       triangles       //[Array]   dispersed vertex within a triangles and contact all vertex into this array
     *       colors          //[Array]   color corresponding to the vertex
     *   }
     * */
    function createTrianglesWithColor(_this, points, colors, triangles, width, height, useAverageColor) {
        var canvas = _this.canvas,
            colorsArray = [],
            pointsArray = [],
            scale = canvas.width / canvas.height > width / height,
            temp,
            i,
            j,
            x,
            y,
            r,
            g,
            b;

        for (x = 0, y = 0, r = 0, g = 0, b = 0, i = 0; i < triangles.length; i++) {
            //turn index to openGL coordinate
            //the converting principle is same to updateSquareSize method
            if (scale) {
                //make the picture's height equals to canvas's height
                //
                //similar process to below "else" calculation
                pointsArray.push((points[triangles[i]][0] * 2 - width) / height * canvas.height / canvas.width, 1 - points[triangles[i]][1] / height * 2, 0);
            } else {
                //make the picture's width equals to canvas's width
                //
                //h/2 - y = the distance between this point with the center of picture's height
                //(h/2 - y) / ( width / 2 ) = the scale of this point comparing to picture's half width
                //Or (h - 2 * y ) / width = just like above scale , the value of (h - 2 * y ) just like the height of this symmetrical picture
                //(h - 2 * y ) / width * canvas.width / canvas.height = the coordinate range in [-1,1]
                //value of ((h - 2 * y ) / width * canvas.width) means the compressed height without stretching
                pointsArray.push(points[triangles[i]][0] / width * 2 - 1, (height - points[triangles[i]][1] * 2) / width * canvas.width / canvas.height, 0);
            }


            if (!useAverageColor) {//set the color in the point where is located at center of a triangle to the triangle's base color
                x += points[triangles[i]][0];
                y += points[triangles[i]][1];


                if ((i + 1) % 3 === 0) {
                    temp = (height - y / 3 | 0) * width * 4 + (x / 3 | 0) * 4;
                    for (j = 0; j < 3; j++) {
                        colorsArray.push(colors[temp] / 255, colors[temp + 1] / 255, colors[temp + 2] / 255);
                    }
                    x = 0;
                    y = 0;
                }
            } else {//set the color to the average of three vertex colors
                temp = (height - points[triangles[i]][1]) * width * 4 + points[triangles[i]][0] * 4;
                r += colors[temp] / 255;
                g += colors[temp + 1] / 255;
                b += colors[temp + 2] / 255;

                if ((i + 1) % 3 === 0) {
                    for (j = 0; j < 3; j++) {
                        colorsArray.push(r / 3, g / 3, b / 3);
                    }
                    r = 0;
                    g = 0;
                    b = 0;
                }
            }
        }

        return {
            triangles: pointsArray,
            colors: colorsArray
        };
    }


    /*
     * @for create triangles with color base on points and colors
     * ......just like the name says ._.
     * @parameters
     *   useAverageColor    //[Boolean]     whether use color average of three
     *                                   points of a triangle to fill its color
     * @return
     *  {
     *      triangles   //[Array]   points of triangles
     *      colors      //[Array]   colors of triangles
     *  }
     * */
    function createTrianglesWithColorBasePointsAndColors(_this, useAverageColor) {
        //produce delaunay trinagles with poly points
        _this.setDelaunayTriangles(Polyer.Delaunay(_this.getPolyPoints()));

        return createTrianglesWithColorBaseDelaunay(_this, useAverageColor);
    }

    /*
     * @for create triangles with color base on delaunay triangles
     * @parameters
     * @parameters
     *   useAverageColor    //[Boolean]     whether use color average of three
     *                                   points of a triangle to fill its color
     * @return
     *  {
     *      triangles   //[Array]   points of triangles
     *      colors      //[Array]   colors of triangles
     *  }
     * */
    function createTrianglesWithColorBaseDelaunay(_this, useAverageColor) {
        var points = _this.getPolyPoints(),
            triangles = _this.getDelaunayTriangles(),
            textureSize = _this.getTextureSize(),
            originalColors = _this.getOriginalColors();

        return createTrianglesWithColor(_this, points, originalColors, triangles, textureSize.width, textureSize.height, useAverageColor);
    }

    /*
     * @for convert all points in points array to float type in plane of z = 0,
     * add z coor to points and all be 0,also make the picture full of one orientation
     * @parameters
     *   _this           //[Object]  this object
     *   points          //[Array]   points array
     *   width           //[Number]  width of picture
     *   height          //[Number]  height of picture
     * @return
     *   pointsArray     //[Array]   array contains float points in plane of z = 0
     * */
    function convertPointsToOpenGL(_this, points, width, height) {
        var canvas = _this.canvas,
            pointsArray = [],
            canvasScale = canvas.width / canvas.height,
            scale = canvasScale > width / height,
            i;

        for (i = points.length; i--;) {
            //the method is copied from createTrianglesWithColor method
            if (scale) {
                //make the picture's height equals to canvas's height
                pointsArray.push((points[i][0] * 2 - width) / height / canvasScale, 1 - points[i][1] / height * 2, 0);
            } else {
                //make the picture's width equals to canvas's width
                pointsArray.push(points[i][0] / width * 2 - 1, (height - points[i][1] * 2) / width * canvasScale, 0);
            }
        }

        return pointsArray;
    }

    /*
     * @for create triangles mesh , we need to draw three lines if we wanna draw mesh of a triangle
     * so produce a array contains each line , we need two points when we are drawing a line
     * @parameters
     *   _this       //[Object]  this object
     *   points      //[Array]   points array
     *   triangles   //[Array]   triangles array contain three points of a triangle partly
     *   width       //[Number]  width of picture
     *   height      //[Number]  height of picture
     * @return
     *   pointsArray //[Array]   there will be six points when drawing a triangle partly
     * */
    function createTrianglesMesh(_this, points, triangles, width, height) {
        var canvas = _this.canvas,
            pointsArray = [],
            canvasScale = canvas.width / canvas.height,
            scale = canvasScale > width / height,
            indices = [0, 1, 1, 2, 2, 0],
            i,
            j,
            temp;

        try {
            for (i = 0; i < triangles.length; i += 3) {
                for (j = 0; j < 6; j++) {
                    //process the points array to
                    //0 --> 0
                    //1 --> 1  _____
                    //2 --> 1
                    //3 --> 2  _____
                    //4 --> 2
                    //5 --> 0  _____
                    //Using equation: temp = (j == 5 ? 0 : (j - j / 2 | 0)) + triangles[i]; Or
                    temp = triangles[i + indices[j]];
                    //the method is copied from createTrianglesWithColor method
                    if (scale) {
                        //make the picture's height equals to canvas's height
                        pointsArray.push((points[temp][0] * 2 - width) / height / canvasScale, 1 - points[temp][1] / height * 2, 0);
                    } else {
                        //make the picture's width equals to canvas's width
                        pointsArray.push(points[temp][0] / width * 2 - 1, (height - points[temp][1] * 2) / width * canvasScale, 0);
                    }
                }
            }
        } catch (e) {
            //when we start draw points,the first and the second point or some situation will not appear
            //because there is no triangles could be produced,so set the triangles to indices of these
            //points without security , the error will occur when triangles.length < 6 , so jump out the
            //error and return the pointsArray directly.
            return pointsArray;
        }

        return pointsArray;
    }


    //coor operation start

    /*
     * @for convert dom coordinate to float coordinate and these are ranged in [-1,1]
     * @parameters
     *   x       //[Number]  the x in dom coordinate
     *   y       //[Number]  the y in dom coordinate
     * @return
     *   {x,y}   //[Object]  float coordinate base on the size of canvas
     * */
    function convertToFloatCoor(_this, x, y) {
        var canvas = _this.canvas;

        return {
            x: -(canvas.width - x * 2) / canvas.width,
            y: (canvas.height - y * 2) / canvas.height
        };
    }

    /*
     * @for convert dom float coordinate with current cameraMatrix to current show coordinate
     * @parameters
     *   x       //[Number]  the x dom float coordinate
     *   y       //[Number]  the y dom float coordinate
     * @return
     *   {x,y}   //[Object]  current display coordinate
     * */
    function convertFloatCoorInverseCamera(_this, x, y) {
        var cameraMatrix = _this.getCameraMatrix();

        return {
            x: (x - cameraMatrix[12]) / cameraMatrix[0],
            y: (y - cameraMatrix[13]) / cameraMatrix[5]
        };
    }

    /*
     * @for convert dom coordinate with current cameraMatrix to current show coordinate
     * @parameters
     *   x       //[Number]  the x dom coordinate
     *   y       //[Number]  the y dom coordinate
     * @return
     *   coor    //[Object]  the current display coordinate
     * */
    function convertCoorInverseCamera(_this, x, y) {
        var coor = convertToFloatCoor(_this, x, y);

        return convertFloatCoorInverseCamera(_this, coor.x, coor.y);
    }

    /*
     * @for convert inverse coor into texture plane (z=0) and finally produce dom coor
     * @parameters
     *   x           //[Number]      x after inverse with cameraMatrix
     *   y           //[Number]      y after inverse with cameraMatrix
     *   noBounday   //[Boolean]     whether limit point in the boundary of texture
     *               //              default: false
     * @return
     *   {x,y}       //[Object]      contains x and y in dom coordinate
     * */
    function convertInversedCoorIntoTexture(_this, x, y, noBoundary) {
        var textureSize = _this.getTextureSize();

        if (!noBoundary && (Math.abs(x) > textureSize.xmax || Math.abs(y) > textureSize.ymax)) {
            return false;
        }

        //transfer coordinate to normal dom coordinate
        return {
            x: (x / textureSize.xmax + 1) * textureSize.width / 2 | 0,
            y: (-y / textureSize.ymax + 1) * textureSize.height / 2 | 0
        };
    }

    //coor operation end

    /*
     * @for create a new webgl texture object
     * @parameter
     *   _this       //[Object]  this object
     * @return
     *   texture     //[Object]  created texture
     * */
    function createTexture(_this) {
        var gl = _this.gl,
            texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return texture;
    }

    /*
     * @for get colors from current framebuffer
     * @parameters
     *   _this           //[Object]  this object
     *   width           //[Number]  the current framebuffer width
     *   height          //[Number]  the current framebuffer height
     * @return
     *   pixelsColor     //[Object]  the color array we got
     * */
    function getColorsFromFramebuffer(_this, width, height) {
        var gl = _this.gl,
            pixelsColor = new Uint8Array(width * height * 4);

        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelsColor);

        return pixelsColor;
    }

    /*
     * @for get edge base color form current framebuffer
     * @parameters
     *   _this       //[Object]  this obj
     *   width       //[Number]  width of texture or framebuffer
     *   height      //[Number]  height of texture or framebuffer
     *   [limit]     //[number]  if limit the number of return points
     * @return
     *   points or limitedPoints      //[array]
     * */
    function getEdgeFromColor(_this, width, height, limit) {
        var pixelsColor = getColorsFromFramebuffer(_this, width, height),
            points = [],
            i,
            j,
            temp;

        for (i = width; --i;) {
            for (j = height; --j;) {
                temp = (j * width + i) * 4;
                pixelsColor[temp] < 122 && pixelsColor[temp + 1] < 122 && pixelsColor[temp + 2] < 122 && points.push([i, j]);
            }
        }

        if (limit && typeof limit == "number") {
            return limitNumberOfPoints(points, limit);
        }

        return points;
    }

    /*
     * @for process line arr base on img
     * @parameters
     *   _this       //[Object]      this object
     *   img         //[Object]      Image object
     *   arr         //[Array]       processing line
     *   callback    //[Function]    callback function
     * */
    function processLine(_this, img, arr, limitNumber, callback) {
        var gl = _this.gl,
            originalObject = _this.getOriginalObject(),
            originalTexture,
            bluredTexture,
            edgedTexture,
            kernelSize,
            temphandlers,
            tempuniforms,
            i,
            framebuffers = [],
            textures = [],
            baseShader = _this.getBaseShader(),
            shaderArgs = {
                vertex: WebGL.Shaders.common.vsWithoutCamera,
                fragment: null,
                attributes: {},
                uniforms: {}
            },
            argsHandlers = {
                attributes: {
                    position: "vec4",
                    uv: "vec2"
                },
                uniforms: {
                    textureSize: "vec2"
                }
            };
        //link kernelShader handlers
        linkShaderHandlersModel(_this, shaderArgs, argsHandlers);

        _this.setTextureSize(true, img.width, img.height);

        //add textureSize into baseShader handlers and the next kernelShader handlers
        //handle img size to textureSize

        shaderArgs.uniforms.textureSize = Polyer.Utils.addToObject(Polyer.Utils.cloneObject(WebGL.Shaders.baseArgs.uniforms.textureSize), {buffer: [img.width, img.height]});

        //baseShader.gray.handlers.uniforms.textureSize = Polyer.Utils.addToObject(Polyer.Utils.cloneObject(WebGL.Shaders.baseArgs.uniforms.textureSize), {buffer: [img.width, img.height]});
        //baseShader.show.handlers.uniforms.textureSize = Polyer.Utils.addToObject(Polyer.Utils.cloneObject(WebGL.Shaders.baseArgs.uniforms.textureSize), {buffer: [img.width, img.height]});

        //ensure the last shader is "show"
        arr.push({type: "show"});
        originalTexture = createTexture(_this);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        bluredTexture = createTexture(_this);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        edgedTexture = createTexture(_this);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        _this.getTextures().original = originalTexture;
        //create tow framebuffer to draw each effect in turns
        for (i = 0; i < 2; i++) {
            var texture = createTexture(_this);
            textures.push(texture);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            var fb = gl.createFramebuffer();
            framebuffers.push(fb);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        }

        //bind start image
        gl.bindTexture(gl.TEXTURE_2D, originalTexture);
        gl.viewport(0, 0, img.width, img.height);

        //bind show first for originalColors collecting
        arr.unshift({type: "show"});

        //process the processing array
        //the texture is retroflexion while index is even
        //arr[0]:retroflexion arr[1]:normal arr[2]:retroflexion .....
        //so if we wanna show the process , we have to overturn it back
        //{type:show} will do nothing but could overturn it , so fill it in arr for overturn
        //process the array to make sure index of the texture we want to show is odd
        //blur,edge,and last texture for edge detection must be normal
        //
        //the reason is coordinates in framebuffer is different
        for (i = 0; i < arr.length; i++) {
            if (arr[i].type == "blur" || arr[i].type == "edge" || i + 1 == arr.length && i % 2 === 0) {
                arr.splice(i, 0, {type: "show"});
                i++;
            }
        }

        //put into effect by order
        for (i = 0; i < arr.length; i++) {
            kernelSize = arr[i].kernelSize ? arr[i].kernelSize : 5;
            switch (arr[i].type) {
                case "show":
                case "gray":
                    _this.setCurrentProgram(baseShader[arr[i].type].program);
                    //processing cycle do not need real-time cameraMatrix , so set the cameraMatrix to default
                    //real-time cameraMatrix will influence drawing to wrong vertex position
                    tempuniforms = baseShader[arr[i].type].handlers.uniforms;
                    tempuniforms.cameraMatrix && (tempuniforms.cameraMatrix.buffer[0] = WebGL.Shaders.baseArgs.uniforms.cameraMatrix.buffer[0].slice(0));
                    linkAndUpdateShaderHandler(_this, baseShader[arr[i].type].handlers.attributes, tempuniforms);
                    break;
                case "blur":
                case "edge":
                    Polyer.Utils.addToObject(shaderArgs, {fragment: WebGL.Shaders.produceKernelFs(arr[i].type, kernelSize)});
                    linkShader(_this, shaderArgs);
                    linkAndUpdateShaderHandler(_this, shaderArgs.attributes, shaderArgs.uniforms);
                    break;
            }

            //set the current framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[i % 2]);
            gl.viewport(0, 0, img.width, img.height);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            if (i === 0) {
                _this.setOriginalColors(getColorsFromFramebuffer(_this, img.width, img.height));
            }

            //store blured texture and edged texture
            if (arr[i].type == "edge") {
                gl.bindTexture(gl.TEXTURE_2D, edgedTexture);
                gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, img.width, img.height);
                gl.bindTexture(gl.TEXTURE_2D, textures[i % 2]);
                _this.getTextures().edged = edgedTexture;
            } else if (arr[i].type == "blur") {
                gl.bindTexture(gl.TEXTURE_2D, bluredTexture);
                gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, img.width, img.height);
                gl.bindTexture(gl.TEXTURE_2D, textures[i % 2]);
                _this.getTextures().blured = bluredTexture;
            }

            gl.bindTexture(gl.TEXTURE_2D, textures[i % 2]);
        }

        _this.setEdgePoints(getEdgeFromColor(_this, img.width, img.height));

        //set background of polyed picture to the original texture
        gl.bindTexture(gl.TEXTURE_2D, _this.getTextures().original);

        if (originalObject) {
            updateSquareSize(_this, originalObject.shader.handlers.attributes.position.buffer[0], img.width, img.height);
        } else {
            temphandlers = Polyer.Utils.cloneObject(baseShader.show.handlers);

            updateSquareSize(_this, temphandlers.attributes.position.buffer[0], img.width, img.height);
            _this.setCurrentProgram(baseShader.show.program);
            linkAndUpdateShaderHandler(_this, temphandlers.attributes, temphandlers.uniforms);

            _this.addToScene(originalObject = {
                type: gl.TRIANGLE_STRIP,
                number: 4,
                shader: {
                    program: baseShader.show.program,
                    handlers: temphandlers
                }
            });
            _this.setOriginalObject(originalObject);
        }

        //turn the framebuffer to default which is bound to context
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //set the viewport back to show model
        initViewport(_this);

        _this.setPolyPointsFromEdge(typeof limitNumber === "undefined" ? 4000 : limitNumber);

        callback();
    }

    /*
     *@for create original picture showing
     *@parameters
     *   _this       //[Object]      this object
     *   img         //[Object]      image object
     *   callback    //[Function]    callback function
     * */
    function createOriginal(_this, img, callback) {
        var gl = _this.gl,
            showShader = _this.getBaseShader().show,
            originalObject = _this.getOriginalObject(),
            temphandlers = Polyer.Utils.cloneObject(showShader.handlers),
            texture,
            originalTexture,
            frambuffer;

        originalTexture = createTexture(_this);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        //store the img data
        _this.getTextures().original = originalTexture;
        _this.setTextureSize(true, img.width, img.height);

        //set show shader program and link handlers
        _this.setCurrentProgram(showShader.program);
        //make the camera to default , same principle in processLine
        temphandlers.uniforms.cameraMatrix.buffer[0] = WebGL.Shaders.baseArgs.uniforms.cameraMatrix.buffer[0].slice(0);
        linkAndUpdateShaderHandler(_this, temphandlers.attributes, temphandlers.uniforms);

        //get original color base on current show shader
        texture = createTexture(_this);//texture will be bound to framebuffer
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        frambuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frambuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        gl.bindTexture(gl.TEXTURE_2D, originalTexture);

        gl.viewport(0, 0, img.width, img.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        _this.setOriginalColors(getColorsFromFramebuffer(_this, img.width, img.height));
        //turn the framebuffer to default which is bound to context
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //set the viewport back to show model
        initViewport(_this);
        //end collect color

        if (originalObject) {
            updateSquareSize(_this, originalObject.shader.handlers.attributes.position.buffer[0], img.width, img.height);
        } else {
            updateSquareSize(_this, temphandlers.attributes.position.buffer[0], img.width, img.height);
            _this.addToScene(originalObject = {
                type: gl.TRIANGLE_STRIP,
                number: 4,
                shader: {
                    program: showShader.program,
                    handlers: temphandlers
                }
            });

            _this.setOriginalObject(originalObject);
        }

        callback();
    }

    /*
     * @for decrease the number of points array randomly
     * @parameters
     *   points         //[Array]   the edge points
     *   limit          //[Number]  the number of decreased array
     * @return
     *   limitedPoints  //[Array]   finally array picked from points
     * */
    function limitNumberOfPoints(points, limit) {
        var limitedPoints = [],
            i,
            j,
            len;
        limit < 0 && (limit = 0);
        limit > points.length && (limit = points.length);
        points = points.slice(0);
        len = points.length;
        for (i = limit; i--;) {
            j = len * Math.random() | 0;
            limitedPoints.push(points[j]);
            points.splice(j, 1);
            len--;
        }

        return limitedPoints;
    }

    /*
     * @for load Image and execute the callback function
     * @parameters
     *   src         //[String]      img's path
     *   callback    //[Function]    callback after img loaded
     * */
    function loadImage(src, callback) {
        var img = new Image();
        img.onload = function () {
            callback.apply(this, arguments);
        };
        img.src = src;
        return img;
    }

    /*
     * @for load texture when creating shader and after linkShader
     * using when create Custom shader
     * @parameters
     *  _this   //[Object]  this object
     *  texture //[Object]  texture we formated
     *                      using texture.src and texture.callback primarily
     * */
    function loadTexture(_this, texture) {
        var gl = _this.gl,
            img;

        img = loadImage(texture.src, function () {

            var tex = createTexture(_this);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

            _this.setTextureSize(true, img.width, img.height);

            texture.callback();
        });
    }

    /*
     * @for init camera matrix
     * */
    function getDefaultCamera() {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    /*
     * @for link attributes and uniforms to shader from WebGL.Shaders.baseArgs which contains base
     * format that would be used
     * @parameters
     *   _this       //[Object]  this object
     *   shaderArgs  //[Object]  all shader arguments contains contents of two shader and attributes
     *                           and uniforms
     *   handlers    //[Object]  contains all handlers the shader need
     * */
    function linkShaderHandlersModel(_this, shaderArgs, handlers) {
        var j;
        for (j in handlers.attributes) {
            shaderArgs.attributes[j] = Polyer.Utils.cloneObject(WebGL.Shaders.baseArgs.attributes[j]);
        }
        for (j in handlers.uniforms) {
            shaderArgs.uniforms[j] = Polyer.Utils.cloneObject(WebGL.Shaders.baseArgs.uniforms[j]);

            //attach all cameraMatrix buffer to main cameraMatrix
            //so the object extend from base shader will also get cameraMatrix at real time when create
            if (j == "cameraMatrix") {
                shaderArgs.uniforms.cameraMatrix.buffer[0] = _this.getCameraMatrix();
            }
        }
    }

    /*
     * @for reformat base shader to original
     * @parameters
     *   _this   //[Object]  this object
     *   type    //[String]  if type is limited , just reformat the type of shader ,
     *                       or else reformat all base shader
     * @notice
     *   the function shouldn't be used , be careful when using base shader,
     * clone attributes and uniforms in base shader before using it , so we will not
     * pollute the base Shader , this function will be useless
     * */
    function formatBaseShaderHandlers(_this, type) {
        var baseShader = _this.getBaseShader(),
            lines = type ? [type] : ["show", "gray", "final"],
            i,
            j,
            handlers;

        for (i = lines.length; i--;) {
            handlers = WebGL.Shaders[lines[i]].handlers;

            for (j in baseShader[lines[i]].handlers.attributes)
                if (typeof WebGL.Shaders.baseArgs.attributes[j] == "undefined") delete baseShader[lines[i]].handlers.attributes[j];
            for (j in baseShader[lines[i]].handlers.uniforms)
                if (typeof WebGL.Shaders.baseArgs.uniforms[j] == "undefined") delete  baseShader[lines[i]].handlers.uniforms[j];
        }
    }

    /*
     * @for init base shader and link it's corresponding handlers model
     * @parameters
     *   _this       //[Object]  this object
     * @notice
     *   the handlers must be cloned before using these!
     *   only the program could be used immediately
     * */
    function initBaseShader(_this) {
        var baseShader = _this.getBaseShader(),
            shaderArgs,
            handlers,
            i;

        for (i in baseShader) {
            shaderArgs = {
                vertex: WebGL.Shaders[i].vs,
                fragment: WebGL.Shaders[i].fs,
                attributes: {},
                uniforms: {}
            };
            handlers = WebGL.Shaders[i].handlers;
            linkShaderHandlersModel(_this, shaderArgs, handlers);
            baseShader[i].program = linkShader(_this, shaderArgs);
            baseShader[i].handlers = {
                attributes: shaderArgs.attributes,
                uniforms: shaderArgs.uniforms
            };
        }
    }

    /*
     * @for bind mousewheel event
     * @parameters
     *   _this   //[Object]  this object
     * */
    function bindMouseWheel(_this) {
        var zoomEvent = Polyer.Utils.debounce(function (e) {
            if (e.detail ? e.detail < 0 : e.wheelDelta > 0) {
                _this.zoom(-0.22, -0.22);
            } else {
                _this.zoom(0.22, 0.22);
            }
        }, 20)
        Polyer.Utils.bind(_this.canvas, "mousewheel", zoomEvent);
        Polyer.Utils.bind(_this.canvas, "DOMMouseScroll", zoomEvent);
    }

    /*
     * @for bind drag event
     * @parameters
     *   _this   //[Object]  this object
     * */
    function bindDrag(_this) {
        var canvas = _this.canvas,
            mouseDown = {
                isLock: true,
                x: 0,
                y: 0
            };

        Polyer.Utils.bind(canvas, "mousedown", function (e) {
            mouseDown.isLock = false;
            mouseDown.x = e.pageX || e.clientX;
            mouseDown.y = e.pageY || e.clientY;
        });
        Polyer.Utils.bind(canvas, "mousemove", Polyer.Utils.debounce(function (e) {
            if (!mouseDown.isLock) {
                canvas.style.cursor = "move";
                _this.drag(((e.pageX || e.clientX) - mouseDown.x) / canvas.width * 2, ((e.pageY || e.clientY) - mouseDown.y) / canvas.height * 2);

                mouseDown.x = e.pageX || e.clientX;
                mouseDown.y = e.pageY || e.clientY;
            }
        }, 20));
        Polyer.Utils.bind(canvas, "mouseout", function () {
            canvas.style.cursor = "default";
            mouseDown.isLock = true;
        });
        Polyer.Utils.bind(canvas, "mouseup", function () {
            canvas.style.cursor = "default";
            mouseDown.isLock = true;
        });
    }

    /*
     * @for bind click event to add point
     * @parameters
     *   _this   //[Object]  this object
     * */
    function bindClick(_this) {
        var canvas = _this.canvas;

        Polyer.Utils.bind(canvas, "click", function (e) {
            var p = _this.getPolyPoints(),
                coor;
            if (coor = _this.convertCoorIntoTexture(e.offsetX, e.offsetY)) {
                p.push([coor.x, coor.y]);
                _this.updatePolyMeshBasePoints();
                _this.draw();
            }
        });
    }

    /*
     * @for bind resize event
     * @parameters
     *   _this   //[Object] this object
     * */
    function bindResize(_this) {
        Polyer.Utils.bind(window, "resize", function () {
            _this.resize(document.body.clientWidth, document.body.clientHeight);
            _this.draw();
        });
    }

    /*
     * @ WebGL constructor
     * */
    function WebGL(canvas, options) {
        this.canvas = canvas;
        this.clearColor = [1.0, 0.0, 0.0, 1.0];
        this.gl = initWebGL(this.canvas, options);

        var scenes = [],
            originalImage,
            originalColors,
            cameraMatrix,
            currentProgram,
            textures = {
                original: null,
                blured: null,
                edged: null
            },
            baseShader = {
                show: {},
                gray: {},
                final: {},
                mesh: {},
                select: {}
            },
            edgePoints = [],
            textureSize = {width: 0, height: 0, xmax: 0, ymax: 0},
        //process material
            polyPoints = [],
            delaunayTriangles = [],
        //Objects
            originalObject,
            polyTriangleObject,
            polyMeshObject,
            polyPointObject,
            selectObject;

        initViewport(this);

        cameraMatrix = getDefaultCamera();

        this.getScenes = function () {
            return scenes;
        };
        this.getOriginalImage = function () {
            return originalImage;
        };
        this.setOriginalImage = function (i) {
            originalImage = i;
        };
        this.getTextures = function () {
            return textures;
        };
        this.getOriginalColors = function () {
            return originalColors;
        };
        this.setOriginalColors = function (c) {
            originalColors = c;
        };
        this.getCameraMatrix = function () {
            return cameraMatrix;
        };
        this.getCurrentProgram = function () {
            return currentProgram;
        };
        this.setCurrentProgram = function (c) {
            this.gl.useProgram(c);
            currentProgram = c;
        };
        this.getBaseShader = function () {
            return baseShader;
        };
        this.setEdgePoints = function (e) {
            edgePoints = e;
        };
        this.getEdgePoints = function () {
            return edgePoints;
        };
        this.getTextureSize = function () {
            return textureSize;
        };
        this.setTextureSize = function (original, w, h) {
            if (original) {
                textureSize.width = w;
                textureSize.height = h;
            } else {
                //float coor in plane z = 0
                textureSize.xmax = w;
                textureSize.ymax = h;
            }
        };
        this.getPolyPoints = function () {
            return polyPoints;
        };
        this.setPolyPoints = function (p) {
            polyPoints = p;
        };
        this.getDelaunayTriangles = function () {
            return delaunayTriangles;
        };
        this.setDelaunayTriangles = function (t) {
            delaunayTriangles = t;
        };
        this.getOriginalObject = function () {
            return originalObject;
        };
        this.setOriginalObject = function (o) {
            originalObject = o;
        };
        this.getPolyTriangleObject = function () {
            return polyTriangleObject;
        };
        this.setPolyTriangleObject = function (p) {
            polyTriangleObject = p;
        };
        this.getPolyMeshObject = function () {
            return polyMeshObject;
        };
        this.setPolyMeshObject = function (p) {
            polyMeshObject = p;
        };
        this.getPolyPointObject = function () {
            return polyPointObject;
        };
        this.setPolyPointObject = function (p) {
            polyPointObject = p;
        };
        this.getSelectObject = function () {
            return selectObject;
        };
        this.setSelectObject = function (s) {
            selectObject = s;
        };


        initBaseShader(this);
    }

    /*
     * @for set clear color to webgl context
     * @parameters
     *   c   //[Array]   color array ex:[1.0,1.0,1.0,1.0]
     * */
    WebGL.prototype.setClearColor = function (c) {
        this.clearColor = c;
        this.gl.clearColor.apply(this.gl, this.clearColor);
    };

    /*
     * @for add the obj which already sent vertex position to shader
     * @parameters
     *   obj     //after send to shader
     * */
    WebGL.prototype.addToScene = function (obj) {
        this.getScenes().push(obj);
    };

    /*
     * @for pop from the scene array
     * */
    WebGL.prototype.popFromScene = function () {
        this.getScenes().pop();
    };

    /*
     * @for create processing line and show the result finally
     * @parameters
     * {
     *   src            //[String]or[Object]  the picture's loading path or Image Object
     *   arr            //[Array]           lined shader's name and config
     *       [
     *          {
     *               type,          //[String]  type of process choices: "show","gray","blur","edge"
     *               [kernelSize]   //[Number]  size of kernel matrix if used
     *          }
     *       ]
     *   limitNumber    //[Number]      limit number of vertex points
     *   callback       //[Function]    callback function
     * }
     * */
    WebGL.prototype.createProcessingLine = function (src, arr, limitNumber, callback) {
        var img,
            _this = this;

        if (src.constructor === Image || src.constructor === HTMLImageElement) {
            img = src;
            processLine(_this, img, arr, limitNumber, callback);
        } else {
            img = loadImage(src, function () {
                processLine(_this, img, arr, limitNumber, callback);
            });
        }

        this.setOriginalImage(img);
    };
    /*
     * @for reprocess the originalImage with new processLine
     * @parameters
     *   arr         //[Array]       new processing line
     *   callback    //[Function]    callback function
     *   limitNumber    //[Number]      limit number of vertex points
     * */
    WebGL.prototype.reProcessLine = function (arr, limitNumber, callback) {
        var originalImage = this.getOriginalImage();

        processLine(this, originalImage, arr, limitNumber, callback);
    };

    /*
     * @for set background
     * @parameters
     *   choice     //[String]   bg choice , value in "original","blured","edged"
     * */
    WebGL.prototype.setBackground = function (choice) {
        var gl = this.gl,
            textures = this.getTextures();

        textures[choice] && gl.bindTexture(gl.TEXTURE_2D, textures[choice]);
    };

    /*
     * @for create original picture show object and get its original color
     * @parameters
     *   src         //[String]OR[Object]      img path or Image Object
     *   callback    //[Function]    callback after object has added to scene
     * */
    WebGL.prototype.createOriginal = function (src, callback) {
        var _this = this,
            img;

        if (src.constructor === Image || src.constructor === HTMLImageElement) {
            img = src;
            createOriginal(_this, img, callback);
        } else {
            img = loadImage(src, function () {
                createOriginal(_this, img, callback);
            });
        }

        this.setOriginalImage(img);
    };

    /*
     * @for basing on full edgePoints produced to creating triangles and collect triangles color
     *   adding it into scene finally
     * @parameters
     *   limitNumber    //[Number]     the number of points going to be limited
     *   addCorner      //[Boolean]    whether add four points at each corner for fill all the picture
     *   useAverageColor   //[Boolean]    use the average of colors at three vertex on a triangles
     * */
    WebGL.prototype.poly = function (limitNumber, addCorner, useAverageColor) {
        this.setPolyPointsFromEdge(limitNumber, addCorner);
        this.setDelaunayTriangles(Polyer.Delaunay(this.getPolyPoints()));
        this.createPolyTriangle(useAverageColor);
    };

    /*
     * @for limit number of points and whether add corner to points array , then store it
     * @parameters
     *   limitNumber     //[Number]      number of limitation
     *   addCorner       //[Boolean]     whether add corner to points array
     * */
    WebGL.prototype.setPolyPointsFromEdge = function (limitNumber, addCorner) {
        var points = typeof limitNumber == "number" ? limitNumberOfPoints(this.getEdgePoints(), limitNumber) : this.getEdgePoints(),
            textureSize = this.getTextureSize();

        if (addCorner) {
            points.push([0, 0], [textureSize.width, 0], [0, textureSize.height], [textureSize.width, textureSize.height]);
        }

        return this.setPolyPoints(points);
    };

    /*
     * @for create git poly triangles object with color and triangles,
     * then add it to scene
     * @parameters
     *   useAverageColor    //[Boolean]     whether use color average of three
     *                                   points of a triangle to fill its color
     * @return
     *   polyTriangleObject  //[Object]  poly triangles object for next updating
     * */
    WebGL.prototype.createPolyTriangle = function (useAverageColor) {
        var gl = this.gl,
            finalShader = this.getBaseShader().final,
            trianglesWithColor = createTrianglesWithColorBaseDelaunay(this, useAverageColor),
            polyTriangleObject,
            temphandlers;

        temphandlers = Polyer.Utils.cloneObject(finalShader.handlers);
        temphandlers.attributes.position.buffer[0] = trianglesWithColor.triangles;
        temphandlers.attributes.color.buffer[0] = trianglesWithColor.colors;

        this.setCurrentProgram(finalShader.program);
        linkAndUpdateShaderHandler(this, temphandlers.attributes, temphandlers.uniforms);

        this.setPolyTriangleObject(polyTriangleObject = {
            type: gl.TRIANGLES,
            number: trianglesWithColor.triangles.length / 3,
            shader: {
                program: finalShader.program,
                handlers: temphandlers
            }
        });

        this.addToScene(polyTriangleObject);

        return polyTriangleObject;
    };

    /*
     * @for update poly triangles and its color base on delaunay triangles
     * using it when delaunay triangles set from outer primarily.
     * this will reproduce triangles and its colors by new delaunay triangles
     * @parameters
     *   useAverageColor    //[Boolean]     whether use color average of three
     *                                   points of a triangle to fill its color
     * */
    WebGL.prototype.updatePolyTriangle = function (useAverageColor) {
        var polyTriangles = this.getPolyTriangleObject() || this.createPolyTriangle(),
            trianglesWithColor = createTrianglesWithColorBaseDelaunay(this, useAverageColor);

        polyTriangles.shader.handlers.attributes.position.buffer[0] = trianglesWithColor.triangles;
        polyTriangles.shader.handlers.attributes.color.buffer[0] = trianglesWithColor.colors;

        polyTriangles.number = trianglesWithColor.triangles.length / 3;
    };

    /*
     * @for create poly mesh Object and points object then store them and add them into scene
     * @parameters
     *   meshColor       //[Array]   rgb color of mesh and points
     * @return
     *   polyMeshObject  //[Object]  poly mesh object for next updating
     * */
    WebGL.prototype.createPolyMesh = function (meshColor) {
        var gl = this.gl,
            polyMeshObject,
            polyPointsObject,
            polyPoints = this.getPolyPoints(),
            textureSize = this.getTextureSize(),
            triangles = Polyer.Delaunay(polyPoints),
            meshPoints = createTrianglesMesh(this, polyPoints, triangles, textureSize.width, textureSize.height),
            OpenGlPoints = convertPointsToOpenGL(this, polyPoints, textureSize.width, textureSize.height),
            meshShader = this.getBaseShader().mesh,
            temphandlersForMesh = Polyer.Utils.cloneObject(meshShader.handlers),
            temphandlersForPoints = Polyer.Utils.cloneObject(meshShader.handlers);


        //store delaunay triangles
        this.setDelaunayTriangles(triangles);

        //create mesh Object
        temphandlersForMesh.attributes.position.buffer = [meshPoints];
        //set to dynamic draw or not , it's not necessary
        temphandlersForMesh.attributes.position.bufferUsage = gl.DYNAMIC_DRAW;
        temphandlersForMesh.uniforms.meshColor.buffer = meshColor || [0.0, 0.0, 0.0];
        temphandlersForMesh.uniforms.isPoint.buffer[0] = false;
        this.setCurrentProgram(meshShader.program);
        linkAndUpdateShaderHandler(this, temphandlersForMesh.attributes, temphandlersForMesh.uniforms);

        this.setPolyMeshObject(polyMeshObject = {
            type: gl.LINES,
            number: triangles.length * 2,
            shader: {
                program: meshShader.program,
                handlers: temphandlersForMesh
            }
        });

        //create points Object
        temphandlersForPoints.attributes.position.buffer = [OpenGlPoints];
        temphandlersForPoints.attributes.position.bufferUsage = gl.DYNAMIC_DRAW;
        temphandlersForPoints.uniforms.meshColor.buffer = meshColor || [0.0, 0.0, 0.0];
        temphandlersForPoints.uniforms.isPoint.buffer[0] = true;
        this.setCurrentProgram(meshShader.program);
        linkAndUpdateShaderHandler(this, temphandlersForPoints.attributes, temphandlersForPoints.uniforms);


        this.setPolyPointObject(polyPointsObject = {
            type: gl.POINTS,
            number: polyPoints.length,
            shader: {
                program: meshShader.program,
                handlers: temphandlersForPoints
            }
        });

        this.addToScene(polyMeshObject);
        this.addToScene(polyPointsObject);

        return polyMeshObject;
    };

    /*
     * @for update poly mesh base on points array
     **/
    WebGL.prototype.updatePolyMeshBasePoints = function () {
        //if polyMeshObject is undefined , clear the polyPoints and add latest point into it , then create polyMesh
        var polyMeshObject = this.getPolyMeshObject() || (this.setPolyPoints(this.getPolyPoints().splice(-1)) , this.createPolyMesh()),
            polyPoints = this.getPolyPoints(),
            polyPointsObject = this.getPolyPointObject(),
            textureSize = this.getTextureSize(),
            triangles = Polyer.Delaunay(polyPoints),
            meshPoints,
            OpenGlPoints;

        this.setDelaunayTriangles(triangles);

        meshPoints = createTrianglesMesh(this, polyPoints, triangles, textureSize.width, textureSize.height);
        polyMeshObject.number = meshPoints.length / 3;
        polyMeshObject.shader.handlers.attributes.position.buffer[0] = meshPoints;

        OpenGlPoints = convertPointsToOpenGL(this, polyPoints, textureSize.width, textureSize.height);
        polyPointsObject.number = polyPoints.length;
        polyPointsObject.shader.handlers.attributes.position.buffer[0] = OpenGlPoints;
    };

    /*
     * @for update poly mesh and points color
     * @parameters
     *   color   //[Array]   rgb array format likes [1.0,1.0,1.0]
     * */
    WebGL.prototype.updatePolyMeshColor = function (color) {
        var polyMeshObject = this.getPolyMeshObject(),
            polyPointsObject = this.getPolyPointObject();

        polyMeshObject.shader.handlers.uniforms.meshColor.buffer = polyPointsObject.shader.handlers.uniforms.meshColor.buffer = color;
    };

    /* @for create custom shader without any process base on args
     * @parameter
     *  args    //[Object]      necessary arguments for producing a shader program
     *            formation:
     *            {
     *                vertex,
     *                fragment,
     *                uniforms,
     *                attributes,
     *                [texture]
     *                   {
     *                      src,
     *                      callback
     *                   }
     *            }
     * */
    WebGL.prototype.createCustomShader = function (args) {
        var shader = {};

        shader.program = linkShader(this, args);
        shader.handlers = {
            attributes: args.attributes,
            uniforms: args.uniforms
        };
        shader.texture = args.texture;

        //load texture and add textureCooridnate to attribute
        if (args.texture) {
            loadTexture(this, args.texture);
        }

        return shader;
    };

    /*
     * @for update the handlers in shader, so we can draw after
     *      In another word, add the obj's vertex array to shader's attribute,and store
     *      attributes reference and uniforms reference into object for future drawing
     * @parameters
     * {
     *   obj    //[Object]  the created Object
     *   shader //[Object]  the created Shader
     * }
     * @return
     *   obj    //[Object]  added attributes , uniforms and shaderprogram
     * */
    //TODO API document for position,cameraMatrix,textureSize
    WebGL.prototype.linkObjectAndShader = function (obj, shader) {
        var _this = this;

        //create default position variable
        shader.handlers.attributes.position = shader.handlers.attributes.position || {
            type: "float",
            size: obj.size,
            buffer: [obj.array]
        };
        //create default uniform camera variable
        shader.handlers.uniforms.cameraMatrix = shader.handlers.uniforms.cameraMatrix || {
            type: "mat4",
            buffer: [_this.getCameraMatrix()]
        };


        //link handler and update shader handler
        if (shader.texture) {
            var temp_call = shader.texture.callback,
                textureSize = _this.getTextureSize();
            //create texture uniform texture
            //shader.uniforms.texture = {type: "sampler2D", value: null, buffer: [null]};
            shader.handlers.uniforms.textureSize = shader.handlers.uniforms.textureSize || {
                type: "vec2",
                buffer: [null]
            };

            //update squaresize,revolution base on the img size
            //update shaderhandler afther loading finished
            shader.texture.callback = function () {
                updateSquareSize(_this, obj.array, textureSize.width, textureSize.height);
                shader.handlers.uniforms.textureSize.buffer && (shader.handlers.uniforms.textureSize.buffer[0] = [textureSize.width, textureSize.height]);
                linkAndUpdateShaderHandler(_this, shader.handlers.attributes, shader.handlers.uniforms);
                temp_call && temp_call();
            };
        } else {
            linkAndUpdateShaderHandler(_this, shader.handlers.attributes, shader.handlers.uniforms);
        }

        return {
            type: obj.type,
            number: obj.number,
            shader: {
                program: shader.program,
                handlers: shader.handlers
            }
        };
    };

    /*
     * @for do linkObjectAndShader method and push the obj to scene array
     * @parameters
     *   obj     //[Object]     obj we created
     *   shader  //[Object]     shader we created
     * */
    WebGL.prototype.createAndAddToScene = function (obj, shader) {
        this.addToScene(this.linkObjectAndShader(obj, shader));
    };

    /*
     * @for create a square vertex position for Shader
     * @return
     *    {
     *       number    //[Number]   vertex number,will be used in drawArrays funciton
     *       type      //[String]   fragment type,will be used in drawArrays funciton
     *       array     //[Array]    vertex position array,for bind attribute in vertex shader
     *       size //[Number]   vertex array size,for split the array to vector
     *    }
     * */
    WebGL.prototype.createSquare = function () {
        var gl = this.gl,
            scale = this.canvas.height / this.canvas.width,
            array = [
                scale, 1, 0.0,
                -scale, 1, 0.0,
                scale, -1, 0.0,
                -scale, -1, 0.0
            ];

        return {
            number: 4, type: gl.TRIANGLE_STRIP, array: array, size: 3
        };
    };

    /*
     * @for get the point in a texture (z = 0) with dom coordinate in WebGL from normal x,y
     * @parameters
     *   x              //[Number]  the x coordinate
     *   y              //[Number]  the y coordinate
     *   noBoundary     //[Boolean] whether limit point in the boundary of texture
     * @return
     *   coor           //[Object]  a object contains where the coordinate in a texture
     * */
    WebGL.prototype.convertCoorIntoTexture = function (x, y, noBoundary) {
        var coor = convertCoorInverseCamera(this, x, y);

        return convertInversedCoorIntoTexture(this, coor.x, coor.y, noBoundary);
    };

    /*
     * @for call drawArrays base on its shader
     * @parameter
     *      obj     //[Object]  scene need to be draw
     *                          containing draw type,draw number and shader within program and handlers
     * */
    WebGL.prototype.drawObject = function (obj) {
        var gl = this.gl;

        this.setCurrentProgram(obj.shader.program);
        //set fourth parameter to true means only update without linking
        linkAndUpdateShaderHandler(this, obj.shader.handlers.attributes, obj.shader.handlers.uniforms, true);

        //if the obj.type is Array , means two ways of drawing is using same data
        //ex:polyed Points and Lines using same data
        if (obj.type.constructor === Array) {
            for (var i = obj.type.length; i--;) {
                gl.drawArrays(obj.type[i], 0, obj.number);
            }
        } else {
            gl.drawArrays(obj.type, 0, obj.number);
        }
    };

    /*
     * @for save display in current webgl
     * @return
     *   imgString       //[String]
     * */
    WebGL.prototype.saveImage = function () {
        var textureSize = this.getTextureSize(),
            width = this.canvas.width,
            height = this.canvas.height,
            imgString;

        this.resize(textureSize.width, textureSize.height);
        this.updateCamera(getDefaultCamera());

        imgString = this.canvas.toDataURL();

        this.resize(width, height);
        this.updateCamera();

        return imgString;
    };

    /*
     * @for draw the current object with its shader in scenes array
     * */
    WebGL.prototype.draw = function () {
        var gl = this.gl,
            scenes = this.getScenes(),
            i;

        gl.clear(gl.COLOR_BUFFER_BIT);

        for (i = 0; i < scenes.length; i++) {
            this.drawObject(scenes[i]);
        }
    };

    /*
     *
     * */

    /*
     * @for create selectObject to and store it
     * @return
     *   selectObject   //[Object] the selectObject we created
     * */
    WebGL.prototype.createSelect = function () {
        var gl = this.gl,
            selectShader = this.getBaseShader().select,
            temphandlers = Polyer.Utils.cloneObject(selectShader.handlers),
            selectObject;

        //temphandlers.attributes.position.buffer[0] = WebGL.Shaders.baseArgs.attributes.position.buffer[0].slice(0);
        this.setCurrentProgram(selectShader.program);
        linkAndUpdateShaderHandler(this, temphandlers.attributes, temphandlers.uniforms);

        //enable blend for transport when square be drawing
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.setSelectObject(selectObject = {
            type: gl.TRIANGLE_STRIP,
            number: 4,
            shader: {
                program: selectShader.program,
                handlers: temphandlers
            }
        });

        return selectObject;
    };

    /*
     * @for add selectObject to scene array to show it
     * @parameters
     *   x   //[Number]  the x dom coor of LT and LB
     *   y   //[Number]  the y dom coor of LT and RT
     * */
    WebGL.prototype.addSelect = function (x, y) {
        var selectObject = this.getSelectObject() || this.createSelect(),
            coor = convertCoorInverseCamera(this, x, y),
            buffer = selectObject.shader.handlers.attributes.position.buffer[0];

        buffer[0] = buffer[6] = coor.x; //set x of LT and LB
        buffer[1] = buffer[4] = coor.y;  //set y of LT and RT

        //update the camera matrix in selectObject , because this object is add to the scene dynamically
        //updateCamera couldn't update the camera in dynamically object only update objects in scene
        //call updateSingleCamera to update inner selectObject
        this.updateSingleCamera(selectObject);
        this.addToScene(selectObject);
    };

    /*
     * @for update coordinate of reset points through handlers in selectObject
     * @parameters
     *   x   //[Number]  the x dom coor of RT and RB
     *   y   //[Number]  the y dom coor of LB and RB
     * */
    WebGL.prototype.updateSelect = function (x, y) {
        var selectObject = this.getSelectObject(),
            polyPointsObject = this.getPolyPointObject(),
            selectBuffer = selectObject.shader.handlers.attributes.position.buffer[0],
            selectUniform = polyPointsObject && polyPointsObject.shader.handlers.uniforms.selectSquare,
            startCoor,
            coor,
            xmax,
            xmin,
            ymax,
            ymin;

        //set the showing select box base on float coor
        coor = convertCoorInverseCamera(this, x, y);
        startCoor = {x: selectBuffer[0], y: selectBuffer[1]};

        selectBuffer[3] = selectBuffer[9] = coor.x; //set x of RT and RB
        selectBuffer[7] = selectBuffer[10] = coor.y; //set y of LB and RB

        if (startCoor.x > coor.x) {
            xmax = startCoor.x;
            xmin = coor.x;
        } else {
            xmax = coor.x;
            xmin = startCoor.x;
        }

        if (startCoor.y > coor.y) {
            ymax = startCoor.y;
            ymin = coor.y;
        } else {
            ymax = coor.y;
            ymin = startCoor.y;
        }

        selectUniform.buffer = [xmin, xmax, ymin, ymax];

        this.draw();
    };

    /*
     * @for delete selected points by boundary
     * @parameters
     *   xmin    //[Number]  min x of select square
     *   xmax    //[Number]  max x of select square
     *   ymin    //[Number]  min y of select square
     *   ymax    //[Number]  max y of select square
     * */
    WebGL.prototype.deleteSelectedPoints = function (xmin, xmax, ymin, ymax) {
        var polyPoints = this.getPolyPoints(),
            i;

        for (i = polyPoints.length; i--;) {
            if (polyPoints[i][0] > xmin && polyPoints[i][0] < xmax && polyPoints[i][1] > ymin && polyPoints[i][1] < ymax) {
                polyPoints.splice(i, 1);
            }
        }

        this.updatePolyMeshBasePoints();
    };

    /*
     * @for remove select object from scene array to do not drawing it
     * */
    WebGL.prototype.removeSelect = function () {
        var scene = this.getScenes(),
            selectObject = this.getSelectObject(),
            polyPointsObject = this.getPolyPointObject(),
            selectUniform = polyPointsObject.shader.handlers.uniforms.selectSquare,
            buffer = selectUniform.buffer,
            i;

        //although buffer[2] is ymin , but it's in the float coordinate,ymin is lower than ymax
        //but in dom coordinate , ymin is heighter than ymax , so exchange the value
        var minBoundary = convertInversedCoorIntoTexture(this, buffer[0], buffer[3], true);
        var maxBoundary = convertInversedCoorIntoTexture(this, buffer[1], buffer[2], true);

        this.deleteSelectedPoints(minBoundary.x, maxBoundary.x, minBoundary.y, maxBoundary.y);

        //set the buffer to original buffer for remaining selected points after deleteSelectedPoints method
        selectUniform.buffer = WebGL.Shaders.baseArgs.uniforms.selectSquare.buffer.slice(0);

        for (i = scene.length; i--;) {
            scene[i] == selectObject && scene.splice(i, 1);
        }

        this.draw();
    };
    /*
     * @for update viewport after canvas width or height changed
     * */
    WebGL.prototype.updateViewport = function () {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    };
    /*
     * @for resize to new width and height
     * update all position buffer in scene base on old width and old height
     * and update float textureSize
     * @parameters
     *   width    //[Number]      new width
     *   height   //[Number]      new height
     * */
    WebGL.prototype.resize = function (width, height) {
        var canvas = this.canvas,
            scene = this.getScenes(),
            textureSize = this.getTextureSize(),
            oldWidth = canvas.width,
            oldHeight = canvas.height,
            i = scene.length,
            j,
            l,
            xScale,
            yScale,
            scale,
            oldScale,
            tempposition;

        canvas.width = width;
        canvas.height = height;
        this.updateViewport();

        xScale = oldWidth / width;
        yScale = oldHeight / height;

        //calculate old scale
        if (oldWidth / oldHeight > textureSize.width / textureSize.height) {
            oldScale = oldHeight / textureSize.height;
        } else {
            oldScale = oldWidth / textureSize.width;
        }

        //update float texturesize for coor converting while point be add
        if (width / height > textureSize.width / textureSize.height) {
            //calculate ratio after resize
            scale = oldScale / (height / textureSize.height);
            //process height equals to canvas's height and compress it's width
            this.setTextureSize(false, textureSize.width / textureSize.height * height / width, 1);
        } else {
            scale = oldScale / (width / textureSize.width);
            //process width equals to canvas's width and compress it's height
            this.setTextureSize(false, 1, textureSize.height / textureSize.width * width / height);
        }

        //combine the scale
        xScale /= scale;
        yScale /= scale;


        //change position buffer of all objects in scene
        while (i--) {
            tempposition = scene[i].shader.handlers.attributes.position.buffer[0];
            for (j = 0, l = tempposition.length; j < l; j += 3) {
                tempposition[j] *= xScale;
                tempposition[j + 1] *= yScale;
            }
        }
    };
    /*
     * @for zoom event
     * @parameters
     *   x       //[Number]     x increment of camera
     *   y       //[Number]     y increment of camera
     * */
    WebGL.prototype.zoom = function (x, y) {
        var cameraMatrix = this.getCameraMatrix();

        if (cameraMatrix[0] - x > 0.2) {
            cameraMatrix[0] -= x;
            cameraMatrix[5] -= y;
        }

        this.updateCamera();
    };

    /*
     * @for update camera matrix in a single Object or Scene
     * @parameters
     *    obj       //[Object]  object in scene
     *    [matrix]  //[Array]   if matrix is not set , using global matrix
     * */
    WebGL.prototype.updateSingleCamera = function (obj, matrix) {
        obj.shader.handlers.uniforms.cameraMatrix.buffer[0] = matrix || this.getCameraMatrix();
    };

    /*
     * @for update camera matrix to change visitor's view
     * @parameters
     *      [matrix]      //[Array]   manual matrix set
     * */
    WebGL.prototype.updateCamera = function (matrix) {
        var scenes = this.getScenes(),
            i;

        for (i = scenes.length; i--;) {
            this.updateSingleCamera(scenes[i], matrix);
        }

        this.draw();
    };

    /*
     * @for drag event
     * @parameter
     *   x       //[Number]     the change of x offset
     *   y       //[Number]     the change of y offset
     * */
    WebGL.prototype.drag = function (x, y) {
        var cameraMatrix = this.getCameraMatrix();

        cameraMatrix[12] += x;
        cameraMatrix[13] -= y;

        this.updateCamera();
    };

    /*
     * @for bind single event
     * @parameter
     *   type     //[String]     name of event
     * */
    WebGL.prototype.bind = function (type) {
        switch (type) {
            case "mousewheel" :
                bindMouseWheel(this);
                break;
            case "drag" :
                bindDrag(this);
                break;
            case "resize":
                bindResize(this);
                break;
            case "click":
                bindClick(this);
                break;
            default :
                console.error("no this event");
        }
    };

    /*
     * @for bind events once time
     * @parameter
     *   arr     //[Array]      events array
     * */
    WebGL.prototype.bindEvents = function (arr) {
        for (var i = arr.length; i--;) {
            this.bind(arr[i]);
        }
    };


    /*
     * @for OpenGl ES vertex shader and fragment shader
     * */
    WebGL.Shaders = {
        baseArgs: {//const , shouldn't be edited, use it before clone
            attributes: {
                position: {
                    type: "float", size: 3, buffer: [[
                        -1, 1, 0.0,   //top left
                        1, 1, 0.0,    //top right
                        -1, -1, 0.0,  //bottom left
                        1, -1, 0.0,   //bottom right
                    ]]
                },
                uv: {
                    type: "float", size: 2, buffer: [[
                        0, 0.0,     //bottom left
                        1, 0.0,     //bottom right
                        0, 1.0,     //top left
                        1, 1.0,     //top right
                    ]]
                },
                color: {
                    type: "float", size: 3, buffer: [null]
                }
            },
            uniforms: {
                isPoint: {type: "float", buffer: [null]},
                meshColor: {type: "vec3", buffer: [null]},
                cameraMatrix: {
                    type: "mat4", buffer: [getDefaultCamera()]
                },
                textureSize: {type: "vec2", buffer: [null]},
                selectSquare: {type: "vec4", buffer: [-2, 2, 2, 2]}
            }
        },
        show: {
            vs: "attribute vec3 position;" +
            "attribute vec2 uv;" +
            "uniform mat4 cameraMatrix;" +
            "varying vec2 t_uv;" +
            "void main(){" +
            "gl_Position = cameraMatrix * vec4(position, 1.0);" +
            "t_uv = uv;" +
            "}",
            fs: "precision mediump float;" +
            "varying vec2 t_uv;" +
            "uniform sampler2D texture;" +
            "void main(){" +
            "gl_FragColor = texture2D(texture, t_uv);" +
            "}",
            handlers: {
                attributes: {
                    position: "vec3",
                    uv: "vec2"
                },
                uniforms: {
                    cameraMatrix: "mat4"
                }
            }
        },
        select: {
            vs: "attribute vec3 position;" +
            "uniform mat4 cameraMatrix;" +
            "void main(){" +
            "gl_Position = cameraMatrix * vec4(position, 1.0);" +
            "}",
            fs: "precision mediump float;" +
            "void main(){" +
            "gl_FragColor = vec4(0.5294117647058824,0.807843137254902,0.9803921568627451,0.5);" +
            "}",
            handlers: {
                attributes: {
                    position: "vec3"
                },
                uniforms: {
                    cameraMatrix: "mat4"
                }
            }
        },
        mesh: {
            vs: "attribute vec3 position;" +
            "uniform mat4 cameraMatrix;" +
            "varying vec3 vPosition;" +
            "void main(){" +
            "gl_Position = cameraMatrix * vec4(position, 1.0);" +
            "vPosition = position;" +
            "gl_PointSize = 4.0;" +
            "}",
            fs: "precision mediump float;" +
            "varying vec3 vPosition;" +
            "uniform bool isPoint;" +
            "uniform vec3 meshColor;" +
            "uniform vec4 selectSquare;" +
            "void main(){" +
            "gl_FragColor = vec4(meshColor,1.0);" +
            "if(isPoint && vPosition.x > selectSquare[0] && vPosition.x < selectSquare[1] && vPosition.y > selectSquare[2] && vPosition.y < selectSquare[3]){" +
            "gl_FragColor = vec4(0.6294117647058824,0.907843137254902,0.9803921568627451,1.0);" +
            "}" +
            "}",
            handlers: {
                attributes: {
                    position: "vec3"
                },
                uniforms: {
                    isPoint: "bool",
                    cameraMatrix: "mat4",
                    meshColor: "vec3",
                    selectSquare: "vec4"
                }
            }
        },
        final: {
            vs: "attribute vec3 position;" +
            "uniform mat4 cameraMatrix;" +
            "attribute vec3 color;" +
            "varying vec3 vColor;" +
            "void main(){" +
            "vColor = color;" +
            "gl_Position = cameraMatrix * vec4(position, 1.0);" +
            "}",
            fs: "precision mediump float;" +
            "varying vec3 vColor;" +
            "void main(){" +
            "gl_FragColor = vec4(vColor,1.0);" +
            "}",
            handlers: {
                attributes: {
                    position: "vec3",
                    color: "vec3"
                },
                uniforms: {
                    cameraMatrix: "mat4"
                }
            }
        },
        gray: {
            vs: "attribute vec3 position;" +
            "attribute vec2 uv;" +
            "varying vec2 t_uv;" +
            "void main(){" +
            "gl_Position = vec4(position, 1.0);" +
            "t_uv = uv;" +
            "}",
            fs: "precision mediump float;" +
            "varying vec2 t_uv;" +
            "uniform sampler2D texture;" +
            "void main(){" +
            "vec4 temp = texture2D(texture,t_uv);" +
            "float c = (max(temp.r,max(temp.g,temp.b)) + min(temp.r,min(temp.g,temp.b)))/4.0;" +
            "gl_FragColor = vec4(c,c,c,1.0);" +
            "}",
            handlers: {
                attributes: {
                    position: "vec3",
                    uv: "vec2"
                },
                uniforms: null
            }
        },
        common: {
            vsWithCamera: "attribute vec3 position;" +
            "attribute vec2 uv;" +
            "uniform mat4 cameraMatrix;" +
            "varying vec2 t_uv;" +
            "void main(){" +
            "gl_Position = cameraMatrix * vec4(position, 1.0);" +
            "t_uv = uv;" +
            "}",
            vsWithoutCamera: "attribute vec3 position;" +
            "attribute vec2 uv;" +
            "varying vec2 t_uv;" +
            "void main(){" +
            "gl_Position = vec4(position, 1.0);" +
            "t_uv = uv;" +
            "}"
        },
        produceKernelFs: function (type, size) {//opengl shader can't create dynamic Array ,so set it in js string
            if (size % 2 === 0 || size > 13 || size < 5) {
                return console.error("The base size must be odd and ranged in [3,13]");
            }
            if (type != "edge" && type != "blur") {
                return console.error("type must be edge or blur!");
            }

            var harf = size / 2 | 0;

            return "precision mediump float;" +
                "varying vec2 t_uv;" +
                "uniform sampler2D texture;" +
                "uniform vec2 textureSize;" +
                "vec4 process(sampler2D t,vec2 v, vec2 o){" +
                "vec4 temp = texture2D(t, v.xy + o.xy/textureSize);" +
                "return temp;" +
                "}" +
                "void main() {" +
                "const int len = " + size + ";" +
                "const int harf = " + harf + ";" +
                "vec2 offset[len*len];" + //filter offset
                "for(int i = 0; i < len; i++){" +
                "for(int j = 0; j < len; j++){" +
                "offset[i*len+j] = vec2(float(j-harf),float(i-harf));" +
                "}" +
                "}" +
                "float kernel[len*len];" + //filter Kernel
                "for(int i = 0; i < len;i++){" +
                "for(int j = 0; j < len;j++){" +
                    //kernel center is 1-size*size
                "kernel[i*len + j] = " + (type == "edge" ? "i == harf && j == harf ? -float(len * len - 1) : 1.0;" : "1.0;") +
                "}" +
                "}" +
                "vec4 sum = process(texture,t_uv,offset[0]) * kernel[0];" +
                "for(int i = 1; i < len * len;i++){" +
                "sum += process(texture,t_uv,offset[i]) * kernel[i];" +
                "}" +
                "" + (type == "edge" ?
                    //set fragment which has big difference to black , others to white
                "if(sum.r > 0.1){" +
                " gl_FragColor = vec4(0.0,0.0,0.0,1.0);" +
                "}else{" +
                " gl_FragColor = vec4(1.0,1.0,1.0,1.0);" +
                "}"
                    : "gl_FragColor = sum / float(len * len);") +
                "}";
        }
    };

    (window.Polyer || (window.Polyer = {})).WebGL = WebGL;
})(window);