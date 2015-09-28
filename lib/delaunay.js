/**
 * Created by lz on 2015/4/15.
 * @Blog http://www.cnblogs.com/zhiyishou/p/4430017.html
 */
(function () {
    "use strict";
     var EPSILON = Number.EPSILON || Math.pow(2,-52);
     function Delaunay(vertices) {
        var n, i, j, indices, buffer, open, closed, current, dx, dy;

        if ((n = vertices.length) < 3) return [];

        vertices = vertices.concat();

        //create a array base vertices's key
        for (i = n, indices = new Array(n); i--;) indices[i] = i;
        //sort the indices base on the x coordinate of vertices
        //from bigger to smaller
        indices.sort(function (a, b) {
            return vertices[b][0] - vertices[a][0];
        });


        //create a supertriangle to buffer and push the vertex to vertices Array
        buffer = supertriangle(vertices);
        vertices.push(buffer[0], buffer[1], buffer[2]);


        //attach supertriangle to open for a start triangle
        open = [circumcircle(vertices, n + 0, n + 1, n + 2)];
        closed = [];
        buffer = [];

        //starting loop from smallest x of vertex
        for (i = indices.length; i--; buffer.length = 0) {
            current = indices[i];

            for (j = open.length; j--;) {

                dx = vertices[current][0] - open[j].x;
                if (dx > 0 && dx * dx > open[j].r) {
                    closed.push(open[j]);
                    open.splice(j, 1);
                    continue;
                }

                //skip this point if it is outside this circumcircle
                dy = vertices[current][1] - open[j].y;
                if (dx * dx + dy * dy - open[j].r > EPSILON) continue;


                //add edges of this triangle to buffer
                buffer.push(open[j].i, open[j].j, open[j].j, open[j].k, open[j].k, open[j].i);
                open.splice(j, 1);
            }

            dedup(buffer);

            for (j = buffer.length; j;)
                open.push(circumcircle(vertices, buffer[--j], buffer[--j], current));
        }

        for (i = open.length; i--;)
            closed.push(open[i]);

        for (open.length = 0, i = closed.length; i--;)
            if (closed[i].i < n && closed[i].j < n && closed[i].k < n)//deleting triangles that are relative to supertriangle
                open.push(closed[i].i, closed[i].j, closed[i].k);
        return open;
    }

    function supertriangle(v) {
        var xmin = Number.POSITIVE_INFINITY, ymin = xmin, ymax = 0, xmax = 0, i, xl, yl, xlh;
        for (i = v.length; i--;) v[i][0] < xmin && (xmin = v[i][0]), v[i][0] > xmax && (xmax = v[i][0]), v[i][1] < ymin && (ymin = v[i][1]), v[i][1] > ymax && (ymax = v[i][1]);
        xl = xmax - xmin;
        yl = ymax - ymin;
        xlh = xl / 2;

        return [
            [xmin - xlh - 2, ymax + 1],     //the left vertex's coordinate
            [xmin + xlh, ymin - yl],        //the top vertex's coordinate
            [xmax + xlh + 2, ymax + 1]      //teh right vertex's coordinate
        ];
    }

    //multiplex the circumcircle algorithm
    function circumcircle(v, i, j, k) {
        var x1 = v[i][0],
            y1 = v[i][1],
            x2 = v[j][0],
            y2 = v[j][1],
            x3 = v[k][0],
            y3 = v[k][1],
            fabsy1y2 = Math.abs(y1 - y2),
            fabsy2y3 = Math.abs(y2 - y3),
            xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

        if (fabsy1y2 < EPSILON) {
            m2 = -((x3 - x2) / (y3 - y2));
            mx2 = (x2 + x3) / 2.0;
            my2 = (y2 + y3) / 2.0;
            xc = (x2 + x1) / 2.0;
            yc = m2 * (xc - mx2) + my2;
        }

        else if (fabsy2y3 < EPSILON) {
            m1 = -((x2 - x1) / (y2 - y1));
            mx1 = (x1 + x2) / 2.0;
            my1 = (y1 + y2) / 2.0;
            xc = (x3 + x2) / 2.0;
            yc = m1 * (xc - mx1) + my1;
        }

        else {
            m1 = -((x2 - x1) / (y2 - y1));
            m2 = -((x3 - x2) / (y3 - y2));
            mx1 = (x1 + x2) / 2.0;
            mx2 = (x2 + x3) / 2.0;
            my1 = (y1 + y2) / 2.0;
            my2 = (y2 + y3) / 2.0;
            xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
            yc = (fabsy1y2 > fabsy2y3) ?
            m1 * (xc - mx1) + my1 :
            m2 * (xc - mx2) + my2;
        }

        dx = x2 - xc;
        dy = y2 - yc;
        return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
    }

    function dedup(edges) {
        var i, j, a, b, m, n;

        for (j = edges.length; j;) {
            b = edges[--j];
            a = edges[--j];

            for (i = j; i;) {
                n = edges[--i];
                m = edges[--i];

                if ((a === m && b === n) || (a === n && b === m)) {
                    edges.splice(j, 2);
                    edges.splice(i, 2);
                    break;
                }
            }
        }
    }

    (window.Polyer || (window.Polyer = {})).Delaunay = Delaunay;
})();