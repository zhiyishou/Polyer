/**
 * Created by lz on 2015/5/22.
 */
(function () {
    "use strict";
    /*
     * @for add node operation function
     * */
    Element.prototype.getPrevious = function () {
        var p = this.previousSibling;

        while (p.nodeType != 1) {
            p = p.previousSibling;
        }
        return p;
    };
    Element.prototype.getSiblingsByClassName = function (s) {
        var l;
        
        s = this.parentNode.getChildrenByClassName(s);
        l = s.length;

        while (l--) {
            if (s[l] === this) s.splice(l, 1);
        }

        return s;
    };
    Element.prototype.getChildrenByTagName = function (s) {
        var c = this.childNodes,
            r = [],
            i = 0,
            l = c.length;

        while (i < l) {
            c[i].nodeType == 1 && c[i].tagName == s.toUpperCase() && r.push(c[i]);
            i++;
        }

        return r;
    };
    Element.prototype.getChildrenByClassName = function (s) {
        var c = this.childNodes,
            r = [],
            i = 0,
            l = c.length,
            e = new RegExp(s);

        while (i < l) {
            c[i].nodeType == 1 && c[i].className.search(e) != -1 && r.push(c[i]);
            i++;
        }

        return r;
    };
    Element.prototype.hasClass = function (s) {
        return this.className.search(new RegExp("\\b" + s + "\\b")) != -1;
    };
    Element.prototype.addClass = function (s) {
        !this.hasClass(s) && (this.className += " " + s);
        return this;
    };
    Element.prototype.removeClass = function (s) {
        this.hasClass(s) && (this.className = this.className.replace(new RegExp("(\\s|^)" + s + "(\\s|$)"), " ").replace(/\s+/g, " "));
        return this;
    };
    Element.prototype.toggleClass = function (s) {
        this.hasClass(s) ? this.removeClass(s) : this.addClass(s);
        return this;
    };
    Element.prototype.getDefaultStyle = function (a) {
        return this.currentStyle ? this.currentStyle[a] : document.defaultView.getComputedStyle(this, false)[a];
    };

    var Global = {};

    function Panel(recovery) {
        this.mode = "sync";
        this.blurKernel = 2;
        this.edgeKernel = 2;
        this.bg = "original";
        this.edit = "move";
        this.vertexNum = 4000;
        this.meshColor = "#00FFFF";
        this.editBgColor = "#444444";
        this.viewBgColor = "#cccccc";
        this.fillColor = "center";

        //max vertex num allowed
        this.maxVertexNum = 10000;
        //panel load class and style
        this.panelClass = "";
        this.panelStyle = "";
        //vertex change delay
        this.delay = 30;
        /*
         * @parameters
         *   mode      //[String]  "edit","sync","view"
         * */
        this.onModeChange = null;
        /*
         * @parameters
         *   blurKernel //[Number]  3,5,7,9,11,13
         *   edgeKernel //[Number]  3,5,7,9,11,13
         * */
        this.onUseKernel = null;
        /*
         * @parameters
         *   bg         //[String]  "original","blured","edged"
         * */
        this.onBgChange = null;
        /*
         * @parameters
         *   edit       //[String]  "move","add","remove"
         * */
        this.onEditChange = null;
        /*
         * @parameters
         *   vertexNum  //[Number]  range in [0,10000]
         * */
        this.onVertexNumChange = null;
        /*
         * @parameters
         *   meshColor  //[String]  hex color string
         * */
        this.onMeshColorChange = null;
        /*
         * @parameters
         *   color      //[String]  hex color string
         * */
        this.onEditBgColorChange = null;
        /*
         * @praameters
         *   color      //[String]  hex color string
         * */
        this.onViewBgColorChange = null;
        /*
         * @parameters
         *   fillColor  //[String]  "center","average"
         * */
        this.onFillColorChange = null;
        /*
         * @parameters
         *   //empty
         * */
        this.zoomLarger = null;
        this.zoomSmaller = null;
        /*
        * @parameters
        *   image       //[Object]  Image Object
        * */
        this.onImageLoaded = null;
        /*
         * @parameters
         *  image      //[Dom]  html dom object of img element
         * */
        this.onSave = null;

        initHTML();
        bindEvents(this);

        recovery && this.recovery();
    }

    /*
     * @for stringify the values to String
     * */
    Panel.prototype.toString = function () {
        var o = {};

        for (var i in this) {
            if (this[i] !== null && this[i].constructor != Function) {
                o[i] = this[i];
            }
        }

        return JSON.stringify(o);
    };
    /*
     * @for store values to localStorage or cookie
     * */
    Panel.prototype.store = function () {
        if (window.localStorage) {
            window.localStorage.setItem("PolyerPanel", this.toString());
        }else{
            return;
        }
    };
    /*
     * @for recovery stored values from localStorage or cookie
     * and update UI base on new values
     * */
    Panel.prototype.recovery = function () {
        var stored,
            i;
        if (window.localStorage) {
            stored = window.localStorage.getItem("PolyerPanel");
        } else {
            return;
        }

        stored = JSON.parse(stored);

        for (i in stored) {
            this[i] = stored[i];
        }

        //set edit back to move
        this.edit = "move";
        //set maxVertexNum to default
        this.maxVertexNum = 10000;

        this.updateUIs();
    };
    /*
     * @for recovery single value
     * @parameters
     *   name    //[String]  single value name
     * */
    Panel.prototype.recoverySingle = function (name) {
        var stored;

        if (window.localStorage) {
            stored = window.localStorage.getItem("PolyerPanel");
        } else {
            return;
        }

        stored = JSON.parse(stored);

        if (!this[name])
            return;

        this[name] = stored[name];
        this.updateSingleUI(name);
    };
    /*
     * @for clear stored values from localStorage or cookie
     * */
    Panel.prototype.clear = function () {
        if (window.localStorage) {
            window.localStorage.removeItem("PolyerPanel");
        } else {
            return;
        }
    };
    /*
     * @for update UIs base on new assigned values
     * */
    Panel.prototype.updateUIs = function () {
        for (var i in this) {
            if (this[i] === null || this[i].constructor === Function)
                continue;
            this.updateSingleUI(i);
        }
    };
    /*
     * @for update single ui
     * @parameters
     *   type        //[String]  type of ui which need to be updated
     * */
    Panel.prototype.updateSingleUI = function (type) {
        var _this = this,
            trigger;

        switch (type) {
            case "panelClass":
                Global.panel.className = _this[type];
                Global.panel.removeClass("top").removeClass("bottom");

                if (Global.panel.hasClass("mini")) {
                    Global.panelSizeBtn.removeClass("minimize").addClass("normalize");
                } else {
                    Global.panelSizeBtn.removeClass("normalize").addClass("minimize");
                }
                break;
            case "panelStyle":
                Global.panel.style.cssText = _this[type];
                limitPanelPosition(Global.panel);
                break;
            case "mode":
                triggerWithValueOrType(false,Global.modeInputs,function(node){
                    node.checked = true;
                    Polyer.Utils.trigger(node,"change");
                });
                break;
            /*
             * do not update kernelsize , the default is a better choice
             * */
            //case "blurKernel":
            //    trigger = Global.blurSizeBtn.getSiblingsByClassName("slider-num")[0];
            //    trigger.value = this[type];
            //    Polyer.Utils.trigger(trigger, "keyup", {noUpdate:true});
            //    break;
            //case "edgeKernel":
            //    trigger = Global.edgeSizeBtn.getSiblingsByClassName("slider-num")[0];
            //    trigger.value = this[type];
            //    Polyer.Utils.trigger(trigger, "keyup", {noUpdate:true});
            //    break;
            case "vertexNum":
                trigger = Global.vertexNumBtn.getSiblingsByClassName("slider-num")[0];
                trigger.value = _this[type];
                Polyer.Utils.trigger(trigger, "keyup");
                break;
            case "bg":
                triggerWithValueOrType(false,Global.bgInputs,function(node){
                    node.checked = true;
                    Polyer.Utils.trigger(node, "change");
                });
                break;
            case "meshColor":
                triggerWithValueOrType(true,Global.colorAs,function(node){
                    node.style.background = _this[type];
                    callInterface(_this.onMeshColorChange, _this[type]);
                });
                break;
            case "editBgColor":
                triggerWithValueOrType(true,Global.colorAs,function(node){
                    node.style.background = _this[type];
                    callInterface(_this.onEditBgColorChange, _this[type]);
                });
                break;
            case "viewBgColor":
                triggerWithValueOrType(true, Global.colorAs, function(node){
                    node.style.background = _this[type];
                    callInterface(_this.onViewBgColorChange, _this[type]);
                });
                break;
            case "fillColor":
                triggerWithValueOrType(false, Global.fillColorInputs,function(node){
                    node.checked = true;
                    Polyer.Utils.trigger(node, "change");
                });
                break;
        }

        //for simplify process above
        function triggerWithValueOrType(isType,arr,callback){
            var j;

            if(isType){
                for (j = arr.length; j--;) {
                    if (arr[j].getAttribute("type") == type) {
                        callback(arr[j]);
                        break;
                    }
                }
            }else{
                for (j = arr.length; j--;) {
                    if (arr[j].value == _this[type]) {
                        callback(arr[j]);
                        break;
                    }
                }
            }
        }
    };

    function initHTML() {
        var panelBox = document.createElement("div"),
            panelHTML = '<div id="mode-select" class="clear-fix"><label><div class="panel-bg"></div><p>Edit</p><input type="radio" name="mode" value="edit"></label><label class="checked"><div class="panel-bg"></div><p>Sync</p><input type="radio" name="mode" value="sync" checked></label><label><div class="panel-bg"></div><p>View</p><input type="radio" name="mode" value="view"></label></div><ul><li><p><a>Process</a><span class="circle-icon arrow"></span></p><div id="process"><div><div class="control-box"><p>Blur Size<span class="ques" title="Blur grayed picture , to smooth edge of picture .&#10;&#10;Optimum： 2&#10;&#10;Suggestion:&#10;Adjusting with Edit bg is blured visual for finding a best value&#10;when the picture is smooth enough ."></span></p><div class="slider-box control-content"><div class="slider-bar"></div><div class="slider-points"><div></div><div></div><div></div><div></div><div></div></div><div class="slider-btn" id="blur-size-btn"></div><input class="slider-num" type="text" name="blurKernelSize" value="1" autocomplete="off"></div></div><div class="control-box"><p>Edge Size<span class="ques" title="Detect edge of blured picture .&#10;&#10; Optimum : 1&#10;&#10;Suggestion:&#10;Adjusting with Edit bg is edged visual for finding a best value&#10;when the edge is exactly we want ."></span></p><div class="slider-box control-content"><div class="slider-bar"></div><div class="slider-points"><div></div><div></div><div></div><div></div><div></div></div><div class="slider-btn" id="edge-size-btn"></div><input class="slider-num" type="text" name="edgeKernelSize" value="1" autocomplete="off"></div></div><div class="control-box button-box"><span id="use-kernel-change"><a></a><span>Apply Change</span></span></div><div class="control-box bg-select-box clear-fix"><p>Edit bg</p><div class="bg-options-box" id="bg-select"><label class="checked"><div></div>Original<input type="radio" name="bg-select" value="original" checked></label><label><div></div>Blured<input type="radio" name="bg-select" value="blured"></label><label><div></div>Edged<input type="radio" name="bg-select" value="edged"></label></div></div></div></div></li><li><p><a>Edit</a><span class="circle-icon arrow"></span></p><div id="edit-tools"><div><div class="control-box clear-fix"><p>Vertex</p><div class="control-content"><a class="edit-btn edit-add" value="add"><div class="square-icon add"></div>Add</a><a class="edit-btn edit-rm" value="remove"><div class="square-icon remove"></div>Remove</a><br></div></div><div class="control-box clear-fix"><p>View</p><div class="control-content"><a class="edit-btn edit-move selected" value="move" title="Holding space"><div class="square-icon move"><div></div><div></div></div>Move</a><a class="edit-btn edit-zooml" value="zooml" title="MouseWheel Up"><div class="square-icon zooml"><div></div></div>ZoomL</a><a class="edit-btn edit-zooms" value="zooms" title="MouseWheel Down"><div class="square-icon zooms"><div></div></div>ZoomS</a></div></div><div class="control-box clear-fix"><p>Vs Num<span class="ques" title="The num of vertices producing by edge detection .&#10;All vertices will be reseted after adjustment !"></span></p><div class="slider-box control-content"><div class="slider-bar"></div><div class="slider-btn" id="vertex-num-btn"></div><input class="slider-num" type="text" value="4000" autocomplete="off"></div></div></div></div></li><li><p><a>Colors</a><span class="circle-icon arrow"></span></p><div id="color"><div><div class="control-box"><p>Mesh Color</p><div class="control-content"><a type="meshColor"></a></div></div><div class="control-box"><p>Edit Bg</p><div class="control-content"><a type="editBgColor"></a></div></div><div class="control-box"><p>View Bg</p><div class="control-content"><a type="viewBgColor"></a></div></div><div class="control-box"><p>Fill Color<span class="ques" title="Average:&#10;Fill with the average of colors at three vertices in a Delaunay triangle . &#10;&#10;Center&#10;Fill with the color at the center of a Delaunay triangle ."></span></p><div class="control-content" id="fill-color"><label><input type="radio" name="fillColor"  value="average">Average</label><label><input  type="radio" name="fillColor" value="center" checked>Center</label></div></div></div></div></li></ul><div id="io"><div id="upload" class="button"><input type="file" title="">Upload</div><div id="save" class="button">Save</div></div><div id="mini" class="clear-fix"><a class="edit-btn edit-add" title="Add Vertex" value="add"><span></span></a><a class="edit-btn edit-rm" title="Remove Vertex" value="remove"><span></span></a><a class="edit-btn edit-move selected" title="Move&#10;(Holding Space)" value="move"><span></span></a><a class="edit-btn edit-zooml" title="Zoom Larger&#10;(MouseWheel Up)" value="zooml"><span></span></a><a class="edit-btn edit-zooms" title="Zoom Smaller&#10;(MouseWheel Down)" value="zooms"><span></span></a></div><div id="panel-size" class="circle-icon minimize"></div><div id="panel-move" class="circle-icon move"></div>';

        panelBox.id = "control-panel";
        panelBox.className = "hori top";
        panelBox.innerHTML = panelHTML;

        Global.panel = panelBox;
        document.body.appendChild(panelBox);
    }

    function bindEvents(THIS) {
        bindModeSelect(THIS);
        bindSliders(THIS);
        bindUseKernel(THIS);
        bindBgSelect(THIS);
        bindEditTools(THIS);
        bindColorSelect(THIS);
        bindFillColorChange(THIS);
        bindFolder();
        bindIO(THIS);
        bindPanelMoveAndResize(THIS);
    }

    /*
     * @for bind mode select event
     * */
    function bindModeSelect(THIS) {
        var inputs = Global.modeInputs = document.getElementById("mode-select").getElementsByTagName("input");

        for (var i = inputs.length; i--;) {
            (function (j) {
                var _this = inputs[j];

                Polyer.Utils.bind(_this, "change", function () {
                    for (var i = inputs.length; i--;) {
                        inputs[i] != _this && inputs[i].parentNode.removeClass("checked");
                    }

                    _this.parentNode.addClass("checked");

                    THIS.mode = _this.value;
                    THIS.store();

                    callInterface(THIS.onModeChange, THIS.mode);
                });
            })(i);
        }
    }

    /*
     * @for bind three solider events
     * */
    function bindSliders(THIS) {
        var blur_size_btn = document.getElementById("blur-size-btn"),
            edge_size_btn = document.getElementById("edge-size-btn"),
            vertex_num_btn = document.getElementById("vertex-num-btn");

        Global.blurSizeBtn = blur_size_btn;
        Global.edgeSizeBtn = edge_size_btn;
        Global.vertexNumBtn = vertex_num_btn;

        Polyer.Utils.bind(blur_size_btn, "mousedown", handleBtnDragAndInputChange(blur_size_btn, true));
        Polyer.Utils.bind(edge_size_btn, "mousedown", handleBtnDragAndInputChange(edge_size_btn, true));
        Polyer.Utils.bind(vertex_num_btn, "mousedown", handleBtnDragAndInputChange(vertex_num_btn));

        function handleBtnDragAndInputChange(node, split) {
            var _this = node,
                bar = _this.getSiblingsByClassName("slider-bar")[0],
                points = split && _this.getSiblingsByClassName("slider-points")[0].getElementsByTagName("div"),
                showInput = _this.getSiblingsByClassName("slider-num")[0],
                barLeft,
                balance,
                barW,
                eachBarW,
                x,
                splitNum = 4,
                isDown = false;


            //init size if element is hidden
            var container,
                display;

            if (split) {
                container = document.getElementById("process");
            } else {
                container = document.getElementById("edit-tools");
            }

            display = container.style.display;
            container.style.visibility = "hidden";
            container.style.position = "absolute";
            container.style.display = "block";

            barLeft = parseInt(bar.style.left || bar.getDefaultStyle("left"));
            balance = barLeft - _this.clientWidth / 2;
            barW = bar.clientWidth + parseInt(bar.getDefaultStyle("borderLeftWidth")) * 2;
            eachBarW = barW / splitNum;

            container.style.display = display;
            container.style.position = "";
            container.style.visibility = "";


            if (split) {
                for (var i = points.length; i--;) {
                    (function (i) {
                        Polyer.Utils.bind(points[i], "click", function () {
                            _this.style.left = i * eachBarW + balance + "px";
                            showInput.value = i + 1;
                            updateKernel();
                        })
                    })(i);
                }
            }
            //add input value changing then slide slider
            Polyer.Utils.bind(showInput, "keyup", function (e) {
                var num = parseInt(showInput.value),
                    x;

                if (split) {
                    if (num > splitNum) {
                        Polyer.UITools.Alert.show("Max kernel size is 6");
                        x = barW + balance;
                        showInput.value = splitNum;
                    } else if (num < 0) {
                        Polyer.UITools.Alert.show("Min kernel size is 0");
                        x = balance;
                        showInput.value = 0;
                    } else {
                        x = (num - 1) * eachBarW + balance;
                    }

                    //for recovery when first load
                    !e.noUpdate && updateKernel();

                    _this.style.left = x + "px";
                } else {
                    if (num > THIS.maxVertexNum) {
                        Polyer.UITools.Alert.show("Max number of vertices is" + THIS.maxVertexNum);
                        x = barW + balance;
                        showInput.value = num = THIS.maxVertexNum;
                    } else if (num < 0) {
                        Polyer.UItools.Alert.show("Min number of vertices is 0");
                        x = balance;
                        showInput.value = num = 0;
                    } else {
                        x = num * barW / THIS.maxVertexNum + balance;
                    }

                    vertexNumChange(num);

                    _this.style.left = x + "px";
                }
            });

            //add slider btn is draging
            Polyer.Utils.bind(document, "mousemove", function (e) {
                e.preventDefault();

                if (!isDown) return;
                e.stopPropagation();

                var _x = parseInt(_this.style.left || _this.getDefaultStyle("left")) + e.clientX - x;

                if (_x < balance) {
                    _x = balance;
                } else if (_x > barW + balance) {
                    _x = barW + balance;
                } else {
                    x = e.clientX;
                }

                if (!split) {
                    showInput.value = ((_x - balance) / barW) * THIS.maxVertexNum | 0;
                }

                _this.style.left = _x + "px";
            });

            //add for mouseup and limit btn on points if split is true
            Polyer.Utils.bind(document, "mouseup", function (e) {
                e.preventDefault();

                if (!isDown) return;

                if (split) {
                    var _x = parseInt(_this.style.left || _this.getDefaultStyle("left")),
                        num = Math.round((_x - balance) / eachBarW);

                    _x = num * eachBarW + balance;
                    showInput.value = num + 1;
                    _this.style.left = _x + "px";

                    updateKernel();
                } else {
                    vertexNumChange(parseInt(showInput.value));
                }

                isDown = false;
            });

            return function (e) {
                x = e.clientX;
                isDown = true;
            };
        }

        function updateKernel() {
            THIS.blurKernel = parseInt(blur_size_btn.getSiblingsByClassName("slider-num")[0].value);
            THIS.edgeKernel = parseInt(edge_size_btn.getSiblingsByClassName("slider-num")[0].value);
            THIS.store();
        }

        var vertexNumChange = Polyer.Utils.latestEvent(function (num) {
            THIS.vertexNum = num;
            THIS.store();

            callInterface(THIS.onVertexNumChange, num);
        }, THIS.delay);
    }


    /*
     * @bind use kernel change button
     * */
    function bindUseKernel(THIS) {
        var btn = document.getElementById("use-kernel-change");
        Polyer.Utils.bind(btn, "click", function () {
            callInterface(THIS.onUseKernel, THIS.blurKernel, THIS.edgeKernel);
        });
    }

    /*
     * @bind changing of bg in edit window
     * */
    function bindBgSelect(THIS) {
        var inputs = Global.bgInputs = document.getElementById("bg-select").getElementsByTagName("input");

        for (var i = inputs.length; i--;) {
            (function (j) {
                var _this = inputs[j];

                Polyer.Utils.bind(_this, "change", function () {
                    for (var i = inputs.length; i--;) {
                        inputs[i] != _this && inputs[i].parentNode.removeClass("checked");
                    }

                    _this.parentNode.addClass("checked");

                    THIS.bg = _this.value;
                    THIS.store();

                    callInterface(THIS.onBgChange, THIS.bg);
                });
            })(i);
        }
    }

    /*
     *@for bind edit tools click event
     * */
    function bindEditTools(THIS) {
        var edit_tools = document.getElementById("edit-tools"),
            mini_btns = document.getElementById("mini").getElementsByTagName("a"),
            normal_btns = edit_tools.getElementsByTagName("a");

        for (var i = 3; i--;) {
            (function (i) {
                Polyer.Utils.bind(mini_btns[i], "click", btnClick);
                Polyer.Utils.bind(normal_btns[i], "click", btnClick);

                function btnClick() {
                    var x = 3;

                    while (x--) {
                        mini_btns[x].removeClass("selected");
                        normal_btns[x].removeClass("selected");
                    }

                    mini_btns[i].addClass("selected");
                    normal_btns[i].addClass("selected");

                    THIS.edit = mini_btns[i].getAttribute("value");
                    callInterface(THIS.onEditChange, THIS.edit);
                }
            })(i);
        }

        for (i = 3; i < 5; i++) {
            (function (i) {
                Polyer.Utils.bind(mini_btns[i], "click", zoomClick);
                Polyer.Utils.bind(normal_btns[i], "click", zoomClick);

                function zoomClick() {
                    if (mini_btns[i].getAttribute("value") == "zooml") {
                        callInterface(THIS.zoomLarger);
                    } else {
                        callInterface(THIS.zoomSmaller);
                    }
                }
            })(i);
        }
    }

    /*
     * @for bind color select btn click and show colors plate to pick color
     * */
    function bindColorSelect(THIS) {
        var selectBtns = Global.colorAs = document.getElementById("color").getElementsByTagName("a"),
            color_list = produceColorList(),
            trigger,
            i = selectBtns.length;

        while (i--) {
            (function (selectBtn) {
                Polyer.Utils.bind(selectBtn, "click", function (e) {
                    e.preventDefault();
                    //stop propagation for prevent trigger document.onclick
                    e.stopPropagation();

                    trigger = selectBtn;
                    selectBtn.parentNode.appendChild(color_list);
                    color_list.style.left = selectBtn.clientWidth + selectBtn.offsetLeft + 5 + "px";
                    color_list.style.top = selectBtn.offsetTop + "px";

                    Polyer.Utils.bind(document, "click", removeColorList);
                });
            })(selectBtns[i]);
        }

        /*
         * @for remove color list from dom and remove click listener "click" from document
         * */
        function removeColorList(e) {
            e.preventDefault();
            trigger.parentNode.removeChild(color_list);
            Polyer.Utils.unbind(document, "click", removeColorList);
        }

        /*
         * @for produce color plate
         * */
        function produceColorList() {
            var list_box = document.createElement("div"),
                colors = [
                    ["#000000", "#444444", "#666666", "#999999", "#cccccc", "#eeeeee", "#f3f3f3", "#ffffff"],
                    ["#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#9900ff", "#ff00ff"],
                    ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
                    ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
                    ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
                    ["#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
                    ["#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
                    ["#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
                ],
                size = 15,
                margin = 2,
                brick_size = size + 2 * margin;

            for (var i = 0; i < colors.length; i++) {
                var row = document.createElement("div");
                for (var j = 0; j < colors.length; j++) {
                    var brick = document.createElement("div");
                    brick.style.background = colors[i][j];
                    row.appendChild(brick);
                }
                row.className = "clear-fix";
                list_box.appendChild(row);
            }

            list_box.id = "color-list";
            list_box.style.width = list_box.style.height = brick_size * colors.length + "px";

            Polyer.Utils.bind(list_box, "click", function (e) {
                //stop propagate up to document , so achieve hide list_box by clicking out of it
                e.stopPropagation();
                var x = e.layerX || e.offsetX,
                    y = e.layerY || e.offsetY,
                    xcoor = x / brick_size | 0,
                    ycoor = y / brick_size | 0;

                //limit coor into brick's width
                //In another word , whether the brick is clicked
                if (x > xcoor * brick_size + margin && x < (xcoor + 1) * brick_size - margin && y > ycoor * brick_size + margin && y < (ycoor + 1) * brick_size - margin) {
                    trigger.style.background = colors[ycoor][xcoor];
                    trigger.parentNode.removeChild(list_box);

                    switch (trigger.getAttribute("type")) {
                        case "meshColor":
                            THIS.meshColor = colors[ycoor][xcoor];
                            callInterface(THIS.onMeshColorChange, THIS.meshColor);
                            break;
                        case "editBgColor":
                            THIS.editBgColor = colors[ycoor][xcoor];
                            callInterface(THIS.onEditBgColorChange, THIS.editBgColor);
                            break;
                        case "viewBgColor":
                            THIS.viewBgColor = colors[ycoor][xcoor];
                            callInterface(THIS.onViewBgColorChange, THIS.viewBgColor);
                            break;
                    }

                    THIS.store();
                    Polyer.Utils.unbind(document, "click", removeColorList);
                }
            });

            return list_box;
        }
    }

    /*
     * @for bind way of fill color changing event
     * */
    function bindFillColorChange(THIS) {
        var twoWays = Global.fillColorInputs = document.getElementById("fill-color").getElementsByTagName("input");

        for (var i = twoWays.length; i--;) {
            Polyer.Utils.bind(twoWays[i], "change", Click);
        }

        function Click(e) {
            var _this = e.target || e.srcElement;

            THIS.fillColor = _this.value;
            THIS.store();

            callInterface(THIS.onFillColorChange, THIS.fillColor);
        }
    }


    /*
     * @for bind fold ULs event
     * */
    function bindFolder() {
        var process = document.getElementById("process"),
            edit_tools = document.getElementById("edit-tools"),
            color = document.getElementById("color"),
            folder = [process, edit_tools, color];

        for (var i = 3; i--;) {
            (function (node) {
                Polyer.Utils.bind(node.getPrevious().getElementsByTagName("span")[0], "click", function (e) {
                    var _this = e.target || e.srcElement;
                    if (!_this.hasClass("open")) {
                        _this.addClass("open");
                        node.style.display = "block";
                    } else {
                        _this.removeClass("open");
                        node.style.display = "none";
                    }
                });
            })(folder[i]);
        }
    }

    /*
     * @for bind panel move and minimize or normalize events
     * */
    function bindPanelMoveAndResize(THIS) {
        var panel = document.getElementById("control-panel"),
            panel_size = document.getElementById("panel-size"),
            panel_move = document.getElementById("panel-move");

        Global.panelSizeBtn = panel_size;

        //minimize panel or normalize it
        Polyer.Utils.bind(panel_size, "click", function (e) {
            panel.toggleClass("mini");
            panel_size.toggleClass("minimize");
            panel_size.toggleClass("normalize");
            limitPanelPosition(panel);

            //for store mini or normal
            THIS.panelClass = Global.panel.className;
            THIS.store();
        });

        Polyer.Utils.bind(window, "resize", Polyer.Utils.debounce(function(e){
            e.preventDefault();

            limitPanelPosition(panel);
        },100));

        //panel move event
        Polyer.Utils.bind(panel_move, "mousedown", Polyer.Utils.debounce((function () {
            var isDown = false,
                coor = {
                    x: 0,
                    y: 0
                };

            Polyer.Utils.bind(document, "mousemove", function (e) {
                e.preventDefault();

                if (!isDown) return;
                e.stopPropagation();
                panel.style.left = parseInt(panel.style.left || panel.getDefaultStyle("left")) + e.clientX - coor.x + "px";
                panel.style.top = parseInt(panel.style.top || panel.getDefaultStyle("top")) + e.clientY - coor.y + "px";
                coor.x = e.clientX;
                coor.y = e.clientY;
            });

            Polyer.Utils.bind(document, "mouseup", function (e) {
                e.preventDefault();

                isDown = false;
                limitPanelPosition(panel);

                //for store hori or not and position in style
                THIS.panelClass = panel.className;
                THIS.panelStyle = panel.style.cssText;

                THIS.store();
            });

            return function (e) {
                coor.x = e.clientX;
                coor.y = e.clientY;
                isDown = true;
            };
        })(), 30));
    }

    function bindIO(THIS){
        var upload = document.getElementById("upload"),
            save = document.getElementById("save"),
            input = upload.getChildrenByTagName("input")[0],
            savebox;

        Polyer.Utils.bind(upload,"click",function(){
            input.click();
        });

        Polyer.Utils.bind(input,"change",function(){
            readImageFileData(input.files[0]);
        });

        Polyer.Utils.bind(save,"click",function(){
            if(savebox){
                Polyer.UITools.Mask.show();
            }else{
                savebox = document.createElement("div");
                savebox.id = "save-box";
                savebox.innerHTML = '<div class="box"><img src=""></div><p>Right click on image to save it</p><div class="circle-icon close"></div>';

                Polyer.UITools.Mask.show();
                Polyer.Utils.bind(savebox.getChildrenByClassName("close")[0],"click",function(){
                    document.body.removeChild(savebox);
                    Polyer.UITools.Mask.hide();
                });
            }

            document.body.appendChild(savebox);
            callInterface(THIS.onSave,savebox.getElementsByTagName("img")[0]);
        });

        //default dragover event do not allow drop element or data into element
        Polyer.Utils.bind(document,"dragover",preventDefaule);
        Polyer.Utils.bind(document,"dragleave",preventDefaule);

        Polyer.Utils.bind(document,"drop",function(e){
            e.preventDefault();
            readImageFileData(e.dataTransfer.files[0]);
        });

        function preventDefaule(e){
            e.preventDefault();
        }

        function readImageFileData(file){
            var reader = new FileReader();

            if(file.type.indexOf("image") == -1){
                Polyer.UITools.Alert.show("Upload file is not a Image file !");
            }else{
                Polyer.UITools.Alert.show("Uploading...",true,true);
                reader.onload = function(e){
                    var img = new Image();
                    img.onload = function(){
                        callInterface(THIS.onImageLoaded, img);
                    }
                    img.src = e.target.result;

                    Polyer.UITools.Alert.hide();
                };
                reader.readAsDataURL(file);
            }
        }
    }


    /*
     * @for limit panel div show in the body container
     * */
    function limitPanelPosition(panel) {
        var processed = false,
            x = parseInt(panel.style.left || panel.getDefaultStyle("left")),
            y = parseInt(panel.style.top || panel.getDefaultStyle("top"));

        if (x < 100) {
            panel.removeClass("hori");
            panel.style.left = "0px";
            processed = true;
        } else if (x > document.body.clientWidth - panel.clientWidth - 100) {
            panel.removeClass("hori");
            panel.style.left = document.body.clientWidth - panel.clientWidth + "px";
            processed = true;
        }

        if (y < 100) {
            !processed && panel.addClass("hori");
            panel.removeClass("bottom").addClass("top");
            panel.style.top = "0px";
            if (panel.clientWidth + parseInt(panel.style.left) > document.body.clientWidth) {
                panel.hasClass("mini") || panel_size.click();
            }
        } else if (y > document.body.clientHeight - panel.clientHeight - 100) {
            !processed && panel.addClass("hori");
            panel.removeClass("top").addClass("bottom");
            panel.style.top = document.body.clientHeight - panel.clientHeight + "px";
            //for prevent width
            if (panel.clientWidth + parseInt(panel.style.left) > document.body.clientWidth) {
                panel.hasClass("mini") || panel_size.click();
            }
        } else {
            panel.removeClass("top").removeClass("bottom");
        }
    }

    /*
     * @for call Interface Function and deliver arguments to this
     * */
    function callInterface(f) {
        f && f.constructor === Function && f.apply(null, Array.prototype.slice.call(arguments, 1));
    }

    (window.Polyer || (window.Polyer = {})).Panel = Panel;
})();