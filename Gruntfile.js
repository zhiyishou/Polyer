module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            options: {
                expr: true
            },
            all: {
                src: ["./lib/utils.js", "./lib/panel.js", "./lib/delaunay.js", "./lib/webgl.js"]
            },
            panel: {
                src: ["./lib/panel.js"]
            },
            delaunay: {
                src: ["./lib/delaunay.js"]
            },
            webgl: {
                src: ["./lib/webgl.js"]
            },
            utils: {
                src: ["./lib/utils.js"]
            }
        },
        uglify: {
            options:{
                report: "min"
            },
            minall: {
                files: {
                    "./lib/Polyer.min.js": ["./lib/utils.js", "./lib/panel.js", "./lib/delaunay.js", "./lib/webgl.js"]
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("default", ["uglify:minall"]);
}
