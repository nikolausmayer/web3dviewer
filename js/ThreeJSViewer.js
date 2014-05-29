/**
 * Copyright 2014
 *
 * Author: Nikolaus Mayer <mayern@cs.uni-freiburg.de>
 *
 * 
 * ThreeJS application for displaying 3D geometry.
 *
 * ===================== USAGE =====================
 * 1. Create <canvas> element within your HTML page. The size has to be at
 */

/**
 * The LMBViewer application
 *
 * @param canvasElement The HTML <canvas> element in which the instance runs.
 */
var LMBViewer = function( _targetHTMLElement ) {

  var targetHTMLElement = _targetHTMLElement;
  var WIDTH  = targetHTMLElement.innerWidth()-10;
  var HEIGHT = targetHTMLElement.innerHeight()-10;
  var textureCanvas;
  var textureContext;

  /// GUI interaction variables
  this.GUI__arrows_visible = true;
  this.GUI__floor_grid_visible = true;
  this.GUI__camera_control_scheme = 'Orbit';
  this.GUI__reset_camera = function() {
    scope.resetCamera();
    scope.switchCameraControlScheme(scope.GUI__camera_control_scheme);
  };
  this.GUI__gl_clear_color = '#ffffff';
  this.GUI__screenshot = function() {
    Canvas2Image.saveAsPNG( $('#LMBViewer__rendererCanvas')[0] );
  };
  ///


  var scope = this;


  /// Undisplayed canvas element for loading textures/images
  {
    var textureLoaderCanvas    = document.createElement('canvas');
    //textureLoaderCanvas.id     = "LMBViewer__textureLoaderCanvas";
    textureLoaderCanvas.height = 2000;
    textureLoaderCanvas.width  = 2000;
    //textureLoaderCanvas.style.display = 'none';
    //targetHTMLElement.append(textureLoaderCanvas);
    textureCanvas = textureLoaderCanvas;
    textureContext = textureCanvas.getContext('2d');
  }
  ///

  /// Renderer
  var renderer;
  {
    var renderer_parameters = { antialias: true,
                                precision: 'lowp' };
    renderer = new THREE.WebGLRenderer( renderer_parameters ); 
    renderer.domElement.id = 'LMBViewer__rendererCanvas';
    renderer.setSize( WIDTH, HEIGHT ); 
    renderer.setClearColor( new THREE.Color('rgb(255,255,255)'), 1.0 );
    targetHTMLElement.append( renderer.domElement );
  }
  /**
   * GUI method: Change background color
   */
  this.setGlClearColor = function() {
    renderer.setClearColor( new THREE.Color(scope.GUI__gl_clear_color ), 1.0 );
  }

  /// Window resize event handling
  window.addEventListener('resize', function() {
    WIDTH  = targetHTMLElement.innerWidth()-10;
    HEIGHT = targetHTMLElement.innerHeight()-10;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH/HEIGHT;
    camera.updateProjectionMatrix();
  });

  /// Scene and Camera setup
  var scene;
  var camera;
  this.resetCamera = function() {
    camera = new THREE.PerspectiveCamera( 45, WIDTH / HEIGHT, 
                                          0.1, 20000 ); 
    camera.position = new THREE.Vector3( 250, 250, 250 );
    camera.lookAt(scene.position);
  };
  scene = new THREE.Scene(); 
  scope.resetCamera();
  scene.add(camera);
  //camera.lookAt(scene.position);

  /// Intrinsic camera parameters
  this.camera_intrinsics = { fx: 800.,  // Focal length x
                             fy: 800.,  // Focal length y
                             fx_inv: 1./800.,  // Inverse focal length x
                             fy_inv: 1./800.,  // Inverse focal length y 
                             cx: 634.,  // Center point x
                             cy: 427.,  // Center point y
                           };

  /**
   * Create a 3D point from pixel coordinates + depth
   */
  this.DepthPointToVector3 = function(x, y, depth) {
    var r = new THREE.Vector3();
    r.x = (x-scope.camera_intrinsics['cx']) * 
          (scope.camera_intrinsics['fx_inv']) * 
          depth;
    r.y = -(y-scope.camera_intrinsics['cy']) * 
           (scope.camera_intrinsics['fy_inv']) * 
           depth;
    r.z = -depth;
    return r;
  };

  /// Camera mouse controls
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  /**
   * GUI method: Switch between camera control schemes
   */
  this.switchCameraControlScheme = function(value) {
    if( value == 'Orbit' ) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
    } else if ( value == 'Trackball') {
      controls = new THREE.TrackballControls(camera, renderer.domElement);
    } else {
      alert("LMBViewer: Unknown camera control scheme '" + value + "'!");
    }
  }

  /// Point cloud from depth map and color image
  /*{
    var width;
    var height;
    var sampling_spacing=10;
    var dimage = new Image();
    var rgbimage = new Image();

    /// Load depth map image
    dimage.src = "img/couch_depthmap.png";
    var geometry = new THREE.Geometry();
    $(dimage).load(function(){
      width = dimage.width;
      height = dimage.height;
      textureContext.drawImage(dimage,0,0);
      var imageData = textureContext.getImageData(0,0,width,height).data;
      //var centerOfMass = new THREE.Vector3(0,0,0);
      //var vertexCount = 0;
      /// Load depths
      for ( y=0; y<height; y+=sampling_spacing ) {
        for ( x=0; x<width; x+=sampling_spacing ) {
          var depth = imageData[((y*width)+x)*4]/100.;
          /// TODO Invalid depths are 0 => there are particles at the origin
          var vertex = scope.DepthPointToVector3(x, y, depth);
          geometry.vertices.push( vertex );
          //centerOfMass.add(vertex);
          //vertexCount += 1;
        }
      }
      //centerOfMass.divideScalar(vertexCount);
    });
    /// Load color image
    rgbimage.src = "img/couch.jpg";
    $(rgbimage).load(function(){
      width = rgbimage.width;
      height = rgbimage.height;
      textureContext.drawImage(rgbimage,0,0);
      var imageData = textureContext.getImageData(0,0,width,height).data;
      /// Load colors
      for ( y=0; y<height; y+=sampling_spacing ) {
        for ( x=0; x<width; x+=sampling_spacing ) {
          var r = imageData[((y*width)+x)*4];
          var g = imageData[((y*width)+x)*4+1];
          var b = imageData[((y*width)+x)*4+2];
          var color = new THREE.Color( r/255., g/255., b/255. );
          geometry.colors.push( color );
        }
      }
      var material_params = {vertexColors: THREE.VertexColors,
        size: 0.1};
      var material = new THREE.ParticleSystemMaterial(material_params);
      var particles = new THREE.ParticleSystem(geometry, material);
      scene.add(particles);
    });
  }*/

  /// TESTING Mesh
  {
    var test_mesh_geometry = new THREE.Geometry();
    /// Vertices of the triangle
    var v1 = new THREE.Vector3(0,0,0);
    var v2 = new THREE.Vector3(0,100,0);
    var v3 = new THREE.Vector3(0,100,100);
    test_mesh_geometry.vertices.push(v1);
    test_mesh_geometry.vertices.push(v2);
    test_mesh_geometry.vertices.push(v3);
    /// Material
    var test_mesh_material_p = { vertexColors: THREE.VertexColors,
                                 wireframeLinewidth: 2,
                                 wireframe: false,
                               };
    test_mesh_material = new THREE.MeshBasicMaterial(test_mesh_material_p);
    /// Triangle
    test_mesh_geometry.faces.push( new THREE.Face3(0,1,2) );
    /// Vertex colors
    test_mesh_geometry.faces[0].vertexColors[0] = new THREE.Color(1,0,0);
    test_mesh_geometry.faces[0].vertexColors[1] = new THREE.Color(0,1,0);
    test_mesh_geometry.faces[0].vertexColors[2] = new THREE.Color(0,0,1);
    /// Setup object using geometry and material
    var object = new THREE.Mesh( test_mesh_geometry, test_mesh_material );
    scene.add( object );
  }
  ///

  /// TESTING Visualize camera pose
  var camera_pose;
  {
    /**
     * Camera:
     *
     *  p3------------p2  __ Viewing direction
     *   | \        / |    /|
     *   |  \     /   |   /
     *   |   \  /     |  /
     *   |  _.p5.___  |
     *  p4=---------==p1
     */
    var fx = scope.camera_intrinsics['fx'];
    var fy = scope.camera_intrinsics['fy'];
    var cx = scope.camera_intrinsics['cx'];
    var cy = scope.camera_intrinsics['cy'];
    var w = 1268;
    var h = 845;
    var scaling = 20;
    var p1 = new THREE.Vector3(-cx/fx,      -cy/fy, 1);
    var p2 = new THREE.Vector3(-cx/fx, (h-1-cy)/fy, 1);
    var p3 = new THREE.Vector3((w-1-cx)/fx, (h-1-cy)/fy, 1);
    var p4 = new THREE.Vector3((w-1-cx)/fx,      -cy/fy, 1);
    var p5 = new THREE.Vector3(0,0,0);
    p1.multiplyScalar(scaling);
    p2.multiplyScalar(scaling);
    p3.multiplyScalar(scaling);
    p4.multiplyScalar(scaling);
    var camera_geometry = new THREE.Geometry();
    camera_geometry.vertices.push(p1); 
    camera_geometry.vertices.push(p2);
    camera_geometry.vertices.push(p3);
    camera_geometry.vertices.push(p4);
    camera_geometry.vertices.push(p1);
    camera_geometry.vertices.push(p5);
    camera_geometry.vertices.push(p3);
    camera_geometry.vertices.push(p4);
    camera_geometry.vertices.push(p5);
    camera_geometry.vertices.push(p2);
    var line_material_parameters = { color: 0x000000,
                                     linewidth: 2,
                                   };
    var line_material = new THREE.LineBasicMaterial( line_material_parameters );
    camera_pose = new THREE.Line( camera_geometry, line_material );
    scene.add( camera_pose );
  }
  ///

  /// Unit direction arrows and dimension labels
  var arrowHelpers = [];
  {
    /// X direction
    var dir    = new THREE.Vector3( 1, 0, 0 ); 
    var origin = new THREE.Vector3( 0, 0, 0 ); 
    var length = 50; 
    var color  = 0xff0000; 
    var arrowHelperX = new THREE.ArrowHelper(dir,origin,length,color,15,7); 
    arrowHelperX.line.material.linewidth = 3;
    scene.add( arrowHelperX );
    arrowHelpers.push( arrowHelperX );
    /// Y direction
    dir = new THREE.Vector3( 0, 1, 0 ); 
    color = 0x00ff00; 
    var arrowHelperY = new THREE.ArrowHelper(dir,origin,length,color,15,7); 
    arrowHelperY.line.material.linewidth = 3;
    scene.add( arrowHelperY );
    arrowHelpers.push( arrowHelperY );
    /// Z direction
    dir = new THREE.Vector3( 0, 0, 1 ); 
    color = 0x0000ff; 
    var arrowHelperZ = new THREE.ArrowHelper(dir,origin,length,color,15,7); 
    arrowHelperZ.line.material.linewidth = 3;
    scene.add( arrowHelperZ );
    arrowHelpers.push( arrowHelperZ );

    /// Arrow labels
    {
      var sprite_parameters = { fontsize: 24,
                                fontcolor: {r:255, g:0, b:0, a:1.0} };
      var spriteyX = makeTextSprite( 'X', sprite_parameters );
      spriteyX.position.set(55,5,3);
      scene.add( spriteyX );
      arrowHelpers.push( spriteyX );
      sprite_parameters['fontcolor'] = {r:0, g:255, b:0, a:1.0};
      var spriteyY = makeTextSprite( 'Y', sprite_parameters );
      spriteyY.position.set(0,60,0);
      scene.add( spriteyY );
      arrowHelpers.push( spriteyY );
      sprite_parameters['fontcolor'] = {r:0, g:0, b:255, a:1.0};
      var spriteyZ = makeTextSprite( 'Z', sprite_parameters );
      spriteyZ.position.set(-3,5,55);
      scene.add( spriteyZ );
      arrowHelpers.push( spriteyZ );
    }
  }
  /**
   * GUI method: Toggle visibility of unit direction arrows and their labels
   *
   * TODO Should work with simply setting 'visible' attribute of objects,
   *      but for some reason ThreeJS does not update correctly.
   */
  this.toggleHelperArrows = function( visible ) {
    for( var i = 0; i < arrowHelpers.length; i+=1 ) {
      //arrowHelpers[i].visible = visible;
      if( visible ) {
        scene.add(arrowHelpers[i]);
      } else {
        scene.remove(arrowHelpers[i]);
      }
    }
  }

  /// Floor grid
  var gridhelper;
  {
    var grid_max_extent = 500;
    var grid_stepsize = 50;
    gridhelper = new THREE.GridHelper( grid_max_extent, grid_stepsize );
    gridhelper.setColors( 0x555555, 0xcccccc );
    scene.add( gridhelper );
  }
  /**
   * GUI method: Toggle visibility of floor grid lines
   */
  this.toggleFloorGrid = function( visible ) {
    if ( visible ) {
      scene.add(gridhelper);
    } else {
      scene.remove(gridhelper);
    }
  }


  /**
   * Main render loop
   */
  this.run = function render() { 
    controls.update();
    requestAnimationFrame(render); 
    renderer.render(scene, camera); 
  };

}
/// <-- LMBViewer application



/**
 * A GUI for the LMBViewer using dat.GUI
 *
 * @param lmbv The LMBViewerGUI instance
 * @param targetHTMLElement The HTML element into which the GUI will be inserted
 */
var LMBViewerGUI = function( lmbv, targetHTMLElement ) {
  /// Create GUI instance
  var gui   = new dat.GUI();
  gui.width = 350;

  /// Add controllers for public members of the LMBViewer instance

  /// Visibility of unit direction arrows
  var GUI__arrows_visible__controller = 
      gui.add(lmbv, 'GUI__arrows_visible').name('Unit arrows');
  GUI__arrows_visible__controller.onChange(function(value) {
    lmbv.toggleHelperArrows(value);
  });
  /// Visibility of floor grid lines
  var GUI__floor_grid_visible__controller =
      gui.add(lmbv, 'GUI__floor_grid_visible').name('Floor grid');
  GUI__floor_grid_visible__controller.onChange(function(value) {
    lmbv.toggleFloorGrid(value);
  });

  /// Color controls
  var folder_colors = gui.addFolder('Colors');
  var GUI__gl_clear_color__controller =
      folder_colors.addColor(lmbv, 'GUI__gl_clear_color').name('Background color');
  GUI__gl_clear_color__controller.onChange(function(){
    lmbv.setGlClearColor();
  });
  folder_colors.open();
  
  /// Camera controls
  var folder_camera = gui.addFolder('Camera');
  var GUI__camera_control_scheme__controller =
      folder_camera.add(lmbv, 'GUI__camera_control_scheme',
                              ['Orbit', 'Trackball']
                       ).name('Camera controls');
  GUI__camera_control_scheme__controller.onFinishChange(function(value) {
    lmbv.switchCameraControlScheme(value);
  });
  var GUI__reset_camera__controller =
      folder_camera.add(lmbv, 'GUI__reset_camera').name('Reset camera');
  folder_camera.open();

  /// Make and save a screenshot of the current scene view
  gui.add(lmbv, 'GUI__screenshot').name('Save screenshot');
}
/// <-- LMBViewerGUI



/**
 * Helper function for displaying text sprites that always face the camera
 *
 * Original from: https://stemkoski.github.io/Three.js
 *
 * @param message Text for the sprite
 * @param parameters Sprite parameters
 *
 * @return A text sprite that can be added to a THREE.Scene
 */
function makeTextSprite( message, parameters )
{
  if ( parameters === undefined ) parameters = {};
  
  var fontface = parameters.hasOwnProperty('fontface') ? 
    parameters['fontface'] : "Arial";
  
  var fontsize = parameters.hasOwnProperty('fontsize') ? 
    parameters['fontsize'] : 24;


  var fontcolor = parameters.hasOwnProperty('fontcolor') ?
    parameters['fontcolor'] : { r:0, g:0, b:0, a:1.0 };
  
  /*var borderThickness = parameters.hasOwnProperty('borderThickness') ? 
    parameters['borderThickness'] : 4;
  
  var borderColor = parameters.hasOwnProperty('borderColor') ?
    parameters['borderColor'] : { r:0, g:0, b:0, a:1.0 };
  
  var backgroundColor = parameters.hasOwnProperty('backgroundColor') ?
    parameters['backgroundColor'] : { r:255, g:255, b:255, a:1.0 };*/

  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  context.font = 'Bold ' + fontsize + 'px ' + fontface;
    
  // get size data (height depends only on font size)
  //var metrics = context.measureText( message );
  
  // background color
  context.fillStyle   = 'rgba(' + fontcolor.r + ',' 
                                + fontcolor.g + ','
                                + fontcolor.b + ',' 
                                + fontcolor.a + ')';
  
  context.strokeStyle = 'rgba(' + fontcolor.r + ',' 
                                + fontcolor.g + ','
                                + fontcolor.b + ',' 
                                + fontcolor.a + ')';

  // text color
  // TODO Ugly hack, this. Works with the minified r67 ThreeJS,
  //      but not the unminified r60.
  context.fillText( message, 
                    canvas.width/2, 
                    canvas.height/2 + fontsize
                  );
  
  // canvas contents will be used for a texture
  var texture = new THREE.Texture(canvas) 
  texture.needsUpdate = true;

  /// TODO "alignment" is still ignored in r67
  var spriteMaterial_parameters = { map: texture,
                                    useScreenCoordinates: false,
                                    alignment: new THREE.Vector2(1,-1),
                                  }; 
  var spriteMaterial = new THREE.SpriteMaterial(spriteMaterial_parameters);
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.set(100,50,1.0);
  return sprite;  
}

