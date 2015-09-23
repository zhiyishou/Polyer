/**
 * Created by lz on 2015/5/23.
 */
var panel = new Polyer.Panel(false);

var canvas_box = document.getElementById("canvas-box"),
    firstCanvas = document.createElement("canvas"),
    secondCanvas = document.createElement("canvas"),
    srcs = ["./img/dog.jpg", "./img/tiger.jpg", "./img/cat.jpg"],
    WebGLs,
    points,
    poly;

//init
points = new Polyer.WebGL(firstCanvas);
poly = new Polyer.WebGL(secondCanvas);
WebGLs = [points, poly];

canvas_box.appendChild(firstCanvas);
canvas_box.appendChild(secondCanvas);

//set canvas size
changeMode(panel.mode);
//set bg color
points.setClearColor(convertHexToRGB(panel.editBgColor, true));
poly.setClearColor(convertHexToRGB(panel.viewBgColor, true));

//call when async points and poly both are finished
var o = new Polyer.Utils.Observer("points", "poly", function () {
    points.setBackground(panel.bg)

    poly.setPolyPoints(points.getPolyPoints());
    poly.setDelaunayTriangles(points.getDelaunayTriangles());
    poly.updatePolyTriangle(panel.fillColor == "average");

    points.draw();
    poly.draw();
});

var img = new Image();
Polyer.UITools.Alert.show("Loading Image", true, true);
img.onload = function () {
    points.createProcessingLine(img, [{type: "gray"}, {type: "blur"}, {type: "edge"}], panel.vertexNum, function () {
        points.createPolyMesh(convertHexToRGB(panel.meshColor));
//        panel.maxVertexNum = points.getEdgePoints().length;
        o.emit("points");
    });
    poly.createOriginal(img, function () {
        o.emit("poly")
    })
    Polyer.UITools.Alert.hide();
}
img.src = srcs[Math.floor(Math.random() * srcs.length)];

/*
 * bind webgls to panel events
 * use panel Interface to control two webgls
 * */
panel.onModeChange = changeMode;
function changeMode(mode) {
    var width = document.body.clientWidth,
        height = document.body.clientHeight;
    switch (mode) {
        case "edit" :
            firstCanvas.style.display = "block";
            secondCanvas.style.display = "none";

            points.resize(width, height);
            poly.resize(width, height);

            points.draw();
            break;
        case "sync" :
            points.resize(width / 2, height);
            poly.resize(width / 2, height);

            //put display backward because two elements show one by one
            // dom element will influence the calculation of document.body.width
            // if put it forward
            firstCanvas.style.display = secondCanvas.style.display = "block";

            points.draw();
            poly.draw();
            break;
        case "view" :
            firstCanvas.style.display = "none";
            secondCanvas.style.display = "block";

            points.resize(width, height);
            poly.resize(width, height);

            poly.draw();
            break;
    }
}
panel.onUseKernel = function (bluerSize, edgeSize) {
    var realKernel = [5, 7, 9, 11, 13],
        line = [{type: "gray"}, {type: "blur", kernelSize: realKernel[bluerSize - 1]}, {
            type: "edge",
            kernelSize: realKernel[edgeSize - 1]
        }];

    points.reProcessLine(line, panel.vertexNum, function () {
        points.setBackground(panel.bg);
        updateMeshAndApplyToPoly();
    })
}
panel.onBgChange = function (bg) {
    points.setBackground(bg);
    points.draw();
}
panel.onEditChange = function (edit) {
    updateCursor(edit);
}
panel.zoomLarger = function () {
    zoomLarger();
}
panel.zoomSmaller = function () {
    zoomSmaller();
}
panel.onVertexNumChange = function (num) {
    //for first panel recovery , onVertexNumChange is called in panel with delay
    //so panel recovery will trigger all functions those are null when recovering
    //after delay end , onVertexNumChange will be trigger , on this time the function
    //is already bind to onVertexNumChange , but the webgls maybe not ready because
    //these are async.
    //so set this judgement to cut this down.
    if (points.getEdgePoints().length == 0) {
        return;
    }
    points.setPolyPointsFromEdge(num);

    updateMeshAndApplyToPoly();
}
panel.onMeshColorChange = function (color) {
    points.updatePolyMeshColor(convertHexToRGB(color));
    points.draw();
}
panel.onEditBgColorChange = function (color) {
    points.setClearColor(convertHexToRGB(color, true))//add fourth argument for gl.clearColor
    points.draw();
}
panel.onViewBgColorChange = function (color) {
    poly.setClearColor(convertHexToRGB(color, true));
    poly.draw();
}
panel.onFillColorChange = function (fillWay) {
    if (fillWay == "average") {
        poly.updatePolyTriangle(true);
    } else {
        poly.updatePolyTriangle(false);
    }
    poly.draw();
}
panel.onImageLoaded = function (img) {
    if (img.width >= points.gl.MAX_TEXTURE_SIZE || img.height >= points.gl.MAX_TEXTURE_SIZE) {
        return Polyer.UITools.Alert.show("Please use picture which size is smaller than " + points.gl.MAX_TEXTURE_SIZE + "piels X" + points.gl.MAX_TEXTURE_SIZE + "piels for better effect !", true);
    }
    points.createProcessingLine(img, [{type: "gray"}, {type: "blur"}, {type: "edge"}], panel.vertexNum, function () {
        points.updatePolyMeshBasePoints();
        o.emit("points");
    });
    poly.createOriginal(img, function () {
        o.emit("poly")
    })
}
panel.onSave = function (img) {
    img.src = poly.saveImage();
}


/*
 * bind to canvas_box for zoom
 * */
var zoomEvent = Polyer.Utils.debounce(function (e) {
    if (e.detail ? e.detail < 0 : e.wheelDelta > 0) {
        zoomLarger();
    } else {
        zoomSmaller();
    }
}, 30);
Polyer.Utils.bind(canvas_box, "mousewheel", zoomEvent);
Polyer.Utils.bind(canvas_box, "DOMMouseScroll", zoomEvent);


var mouseDetial = {
    isDown: false,
    x: 0,
    y: 0
}
/*
 * bind to canvas_box for "move" event
 * */
Polyer.Utils.bind(canvas_box, "mousedown", function (e) {
    if (panel.edit != "move") return;

    mouseDetial.isDown = true;
    mouseDetial.x = e.pageX || e.clientX;
    mouseDetial.y = e.pageY || e.clientY;
});

Polyer.Utils.bind(canvas_box, "mousemove", Polyer.Utils.debounce(function (e) {
    if (panel.edit != "move" || !mouseDetial.isDown) {
        return;
    }

    points.drag(((e.pageX || e.clientX) - mouseDetial.x) / points.canvas.width * 2,
        ((e.pageY || e.clientY) - mouseDetial.y) / points.canvas.height * 2);
    poly.drag(((e.pageX || e.clientX) - mouseDetial.x) / poly.canvas.width * 2,
        ((e.pageY || e.clientY) - mouseDetial.y) / poly.canvas.height * 2);


    mouseDetial.x = e.pageX || e.clientX;
    mouseDetial.y = e.pageY || e.clientY;

}, 20));

Polyer.Utils.bind(canvas_box, "mouseup", function () {
    if (panel.edit != "move" || !mouseDetial.isDown) {
        return false;
    }

    mouseDetial.isDown = false;
});

//add tabindex to div for binding keydown
//for binding keydown and keyup to document ,hover for changing edit to "move" while "remove" or "add"
canvas_box.setAttribute("tabindex", 1);
Polyer.Utils.bind(document, "keydown", (function () {
    var store = false;

    Polyer.Utils.bind(document, "keyup", function () {
        if (store) {
            panel.edit = store;
            updateCursor(store);
            store = false;
        }
    })

    return function (e) {
        if (panel.edit != "move" && e.keyCode == 32 && !store) {
            store = panel.edit;
            panel.edit = "move";
            updateCursor("move");
        }

    }
})())

/*
 * bind to firstCanvas for "remove" event
 * */
Polyer.Utils.bind(firstCanvas, "mousedown", function (e) {
    //if edit tool is "move" , propagate event up to canvas_box ,
    //return and trigger canvas_box mousedown event
    //if edit tool is "click" , do not trigger mousedown
    //so there is only "remove" left
    if (panel.edit != "remove") {
        return;
    }
    e.stopPropagation();

    mouseDetial.isDown = true;
    points.addSelect(e.x || e.layerX || e.offsetX, e.y || e.layerY || e.offsetY);
})

Polyer.Utils.bind(firstCanvas, "mousemove", Polyer.Utils.debounce(function (e) {
    if (panel.edit != "remove" || !mouseDetial.isDown) {
        return;
    }

    points.updateSelect(e.x || e.layerX || e.offsetX, e.y || e.layerY || e.offsetY);
}, 20));

Polyer.Utils.bind(firstCanvas, "mouseup", function () {
    if (panel.edit != "remove" || !mouseDetial.isDown) {
        return;
    }

    mouseDetial.isDown = false;
    points.removeSelect();
    poly.setPolyPoints(points.getPolyPoints());
    poly.setDelaunayTriangles(points.getDelaunayTriangles());
    poly.updatePolyTriangle();
    poly.draw();
})


/*
 * bind to firstCanvas for "click" event
 * */
Polyer.Utils.bind(firstCanvas, "click", function (e) {
    if (panel.edit != "add") return;

    var p = points.getPolyPoints(),
        coor;
    if (coor = points.convertCoorIntoTexture(e.offsetX || e.layerX, e.offsetY || e.layerY)) {
        p.push([coor.x, coor.y]);
        updateMeshAndApplyToPoly();
    }
});

/*
 * bind resize event
 * */
Polyer.Utils.bind(window, "resize", Polyer.Utils.latestEvent(function () {
    var width = document.documentElement.clientWidth,
        height = document.documentElement.clientHeight;

    switch (panel.mode) {
        case "edit":
        case "view":
            points.resize(width, height);
            poly.resize(width, height);
            break;
        case "sync":
            points.resize(width / 2, height);
            poly.resize(width / 2, height);
    }

    points.draw();
    poly.draw();
}, 100))

function applyToWebGLs(func) {
    for (var i = 0, l = WebGLs.length; i < l; i++) {
        func.apply(WebGLs[i], Array.prototype.slice.call(arguments, 1));
    }
}

function zoomLarger() {
    applyToWebGLs(Polyer.WebGL.prototype.zoom, -0.22, -0.22);
}
function zoomSmaller() {
    applyToWebGLs(Polyer.WebGL.prototype.zoom, 0.22, 0.22);
}

function updateMeshAndApplyToPoly() {
    points.updatePolyMeshBasePoints();
    points.draw();

    //handler points array and delaunay triangles to poly
    poly.setPolyPoints(points.getPolyPoints());
    poly.setDelaunayTriangles(points.getDelaunayTriangles());
    poly.updatePolyTriangle();
    poly.draw();
}

function updateCursor(edit) {
    if (edit == "move") {
        canvas_box.className = "move";
    } else {
        canvas_box.className = "edit";
    }
}

function convertHexToRGB(color, addAlpha) {
    //convert hex to rgb then convert to float format
    var array = color.match(/\w{2}/ig),
        i = array.length;
    while (i--) {
        array[i] = parseInt(array[i], 16) / 255;
    }

    addAlpha && array.push(1);

    return array;
}