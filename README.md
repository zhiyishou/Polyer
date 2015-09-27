#Polyer
Process a picture to low poly format, base on WebGL

Live on http://zhiyishou.github.io/Polyer

*This app could run anywhere on PC/Mac/Mobile except using IE10 or older*

!["comparison"](http://zhiyishou.github.io/Polyer/img/mao.jpg)

##Usage
Drag or upload a picture to Polyer and edit with control panel  
you can save the low poly picture after process

##Tips
* hold space to move
* scroll mousewheel to zoom
* the panel could be dragged


##Control Panel
###Mode

**Edit**  
show edit window only
  
**Sync**  
show edit window and view window both
  
**View**  
show view window

###Process
---

**Blur Size**  
The size of kernel when doing convolution for blur process

Optimum:1  
You could adjusting with Edit Bg is blured visual for finding a best value
when the picture is smooth enough

**Edge Size**  
The size of kernel when detecting edge for edge process

Optimum : 1  
You could adjusting with Edit Bg is edged visual for finding a best value
when the edge is exactly we want

**Apply Button**  
Click for apply the current blur size and edge size

**edge Bg**  
The background image of edit window

* Original: show original image you uploaded as background
* Blur: show blured image as background, could be refered when adjusting blur size
* Edge: show edged image as background, could be refered when adjusting edge size

###Edit
---

**Vertex**

* Add: add a vertex
* Remove: remove vertices with a triangle

**View**

* Move: move the view
* ZoomL: Zoom the view to larger
* ZoomS: Zoom the view to smaller

**Vs Num**  
Num of all vertices

This value colud limit the num of vertices, the vertices be more, the processed picture will look like original picture more.

###Colors
---

**Mesh Color**  
The color of triangle mesh in edit window

**Edit Bg**  
the clear color in edit window

**View Bg**  
the clear color in view window

**Fill Color**  
The way of fill a triangle

* Average: Fill with the average of colors at three vertices in a triangle 
* Center: Fill with the color at the center of a triangle
