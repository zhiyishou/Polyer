/**
 * Created by lz on 2015/5/20.
 */

/*
 * @for high frequency utils
 * */
(window.Polyer || (window.Polyer = {})).Utils = {
    bind: function (node, event, callback, useCpature) {
        if (node.addEventListener) {
            node.addEventListener(event, callback, !!useCpature);
        } else {
            node.attachEvent("on" + event, callback, !!useCpature);
        }
    },
    unbind: function (node, event, callback) {
        if (node.removeEventListener) {
            node.removeEventListener(event, callback);
        } else {
            node.detachEvent("on" + event, callback);
        }
    },
    addToObject: function (obj, add) {
        for (var i in add)
            obj[i] = add[i];

        return obj;
    },
    cloneObject: function (obj) {//do not take above browser into account because of webgl
        return JSON.parse(JSON.stringify(obj));
    },
    isPowerOf2: function (value) {
        return (value & value - 1) === 0;
    },
    debounce: function (func, wait) {
        var lasttime = new Date(),
            now;

        return function () {
            now = new Date();

            if (now - lasttime > wait) {
                lasttime = now;
                func.apply(this, arguments);
            }
        };
    },
    latestEvent: function (func, delay) {
        var timeout;

        return function () {
            var _this = this,
                args = arguments;

            clearTimeout(timeout);

            timeout = setTimeout(function () {
                func.apply(_this, args);
            }, delay);
        };
    },
    createEvent: function (name, data) {
        var event;

        if (Event) {
            event = new Event(name);
        } else if (CustomEvent) {
            event = new CustomEvent(name);
        } else if (document.createEvent) {
            event = document.createEvent("HTMLEvents");
            event.initEvent(name, true, true);
        } else {
            event = document.createEventObject();
            event.type = name;
        }

        this.addToObject(event, data);

        return event;
    },
    triggerEvent: function (node, event) {
        if (node.dispatchEvent) {
            node.dispatchEvent(event);
        } else {
            node.fireEvent("on" + event.type, event);
        }
    },
    trigger: function (node, name, data) {
        this.triggerEvent(node, this.createEvent(name, data));
    },
    Observer: (function () {
        /*
         * Observer for async function
         *
         * var o = new Observer("a","b",function(){....});
         * Or
         * var o = new Observer();
         * o.on("a","b",function(){....});
         *
         * o.emit("a");
         * o.emit("b");
         * */
        function Observer() {
            this.targets = {};
            this.callback = null;

            arguments.length > 1 && this.on.apply(this, arguments);
        }

        Observer.prototype.on = function () {
            var args = Array.prototype.slice.call(arguments, 0),
                callback = args.splice(-1, 1)[0],
                i;

            this.targets = {};
            for (i = args.length; i--;) {
                this.targets[args[i]] = false;
            }

            this.callback = callback;
        };

        Observer.prototype.emit = function (target) {
            var i;
            this.targets[target] = true;

            for (i in this.targets) {
                if (!this.targets[i]) {
                    return;
                }
            }

            //set true for future
            for (i in this.targets) {
                this.targets[i] === true;
            }
            this.callback();
        };

        return Observer;
    })()
};
/*
 * @for UI tools
 * */
(window.Polyer || (window.Polyer = {})).UITools = {
    Mask: (function () {
        var masklayer;

        return {
            show: function () {
                if (!masklayer) {
                    masklayer = document.createElement("div");
                    masklayer.id = "masklayer";
                    document.body.appendChild(masklayer);
                }else{
                    document.body.appendChild(masklayer);
                }
            },
            hide: function () {
                masklayer && (document.body.removeChild(masklayer));
            }
        };
    })(),
    Alert: (function () {
        var alertBox,
            isMaskShow,
            clickAble = true,
            p;

        function initAlertBox() {
            var box = document.createElement("div");
            alertBox = document.createElement("div");

            p = document.createElement("p");
            box.appendChild(document.createElement("div"));
            box.appendChild(p);

            box.className = "box";
            alertBox.id = "alert-box";
            alertBox.appendChild(box);

            alertBox.addEventListener("click", function(){
                clickAble && hide();
            });

            return alertBox;
        }

        function hide(){
            alertBox && (document.body.removeChild(alertBox));
            isMaskShow && Polyer.UITools.Mask.hide();
        }

        return {
            show: function (text, mask, preventClick) {
                document.body.appendChild(alertBox || initAlertBox());
                mask && (Polyer.UITools.Mask.show(), isMaskShow = true);

                clickAble = !preventClick;
                p.innerHTML = text;
            },
            hide: hide
        };
    })()
};