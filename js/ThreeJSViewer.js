/**
 * Copyright 2014
 *
 * Author: Nikolaus Mayer <mayern@cs.uni-freiburg.de>
 *
 * 
 * ThreeJS application for displaying 3D geometry.
 *
 * =============================== USAGE ===============================
 * 1. Create a target element within your HTML page, with a specific <ID>.
 * 2. Setup an LMBViewer instance within that element,
 *      var lmbv = new LMBViewer( $('#<ID>') );
 *    and start it:
 *      lmbv.run();
 * 3. Optionally, add GUI elements to the viewer's window:
 *      LMBViewerGUI(lmbv);
 * For further steps, see the provided example HTML page.
 */

/**
 * Helper for default function arguments
 */
var Default = function( paramsDict, key, defaultValue ) {
  if ( !(key in paramsDict) || typeof(paramsDict[key]) === 'undefined' )
    paramsDict[key] = defaultValue;
};

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

  /// Flag used to prevent rerendering when nothing has changed
  var ONLY_RENDER_WHEN_NECESSARY = true;
  /// Flag for rendering request due to animations or interaction
  var RENDER_FLAG = true;
  /**
   * Request a render pass.
   */
  var RequestRerender = function() {
    RENDER_FLAG = true;
  };
  /**
   * Force an immediate rendering. Use sparingly, it's not good style.
   */
  var ForceRerender = function() {
    renderer.render(scene, camera); 
  };

  /// Mouse cursor position
  /// Used to check if rerendering is necessary
  var mouse = { x: 0, y: 0 };
  var mousePositionChanged = true;
  function onDocumentMouseMove( e ) 
  {
    // Update the mouse position
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mousePositionChanged = true;
  }
  document.addEventListener( 'mousemove', onDocumentMouseMove, false );

  /// GUI interaction variables
  this.GUI;
  /**
   * GUI method: Manually update all controllers. This is necessary because
   * some properties can be changed within the LMBViewer, but using the .listen()
   * method on the dat.GUI controllers is inefficient (loops constantly).
   *
   * Instead, we manually update all the GUI's folders' controllers' displays...
   */
  var ManuallyUpdateGUI = function() {
    if( typeof scope.GUI != 'undefined' ) {
      /// For all GUI 'folders'...
      for( var f in scope.GUI.__folders ) {
        /// ..., for all controllers in this folder...
        for( var i in scope.GUI.__folders[f].__controllers ) {
          /// ..., update this controller.
          scope.GUI.__folders[f].__controllers[i].updateDisplay();
        }
      }
    }
  };
  this.GUI__arrows_visible = true;
  this.GUI__floor_grid_visible = true;
  this.GUI__camera_fov_angle = 45.0;
  this.GUI__camera_control_scheme = 'Orbit';
  this.GUI__reset_camera = function() {
    scope.GUI__camera_fov_angle = 45.0;
    ManuallyUpdateGUI();
    scope.resetCamera();
    scope.switchCameraControlScheme(scope.GUI__camera_control_scheme);
    RequestRerender();
  };
  this.GUI__gl_clear_color = '#ffffff';
  this.GUI__screenshot = function() {
    ForceRerender();
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
    renderer.setClearColor( new THREE.Color(scope.GUI__gl_clear_color), 1.0 );
    RequestRerender();
  }

  /// Window resize event handling
  window.addEventListener('resize', function() {
    WIDTH  = targetHTMLElement.innerWidth()-10;
    HEIGHT = targetHTMLElement.innerHeight()-10;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH/HEIGHT;
    camera.updateProjectionMatrix();
    RequestRerender();
  });

  /// Scene and Camera setup
  var scene = new THREE.Scene();
  var camera;
  this.resetCamera = function() {
    camera = new THREE.PerspectiveCamera( 45, WIDTH / HEIGHT, 
                                          10, 3000 ); 
    camera.position = new THREE.Vector3( 250, 250, 250 );
    camera.lookAt(scene.position);
  };
  scene.add(camera);
  scope.resetCamera();
  /**
   * GUI method: Update camera parameters
   */
  this.UpdateCamera = function() {
    camera.fov = scope.GUI__camera_fov_angle;
    camera.updateProjectionMatrix();
    RequestRerender();
  }
  /// Flag indicating whether the camera has changed (this needing rerendering)
  var cameraChanged = true;

  /// Intrinsic camera parameters
  this.camera_intrinsics = { fx:     525.,     // Focal length x
                             fy:     525.,     // Focal length y
                             fx_inv: 1./525.,  // Inverse focal length x
                             fy_inv: 1./525.,  // Inverse focal length y 
                             cx:     319.5,    // Center point x
                             cy:     239.5,    // Center point y
                             width:  640.,     // Image width
                             height: 480.,     // Image height
                           };
  /**
   * Set intrinsic camera parameters
   *
   * @param params Dictionary with values for fx, fy, cx, cy, width, height
   */
  this.SetCameraIntrinsics = function( params ) {
    Default(params, 'fx', 525.);
    Default(params, 'fy', 525.);
    Default(params, 'cx', 319.5);
    Default(params, 'cy', 239.5);
    Default(params, 'width', 640.);
    Default(params, 'height', 480.);
    scope.camera_intrinsics.fx     = params.fx;
    scope.camera_intrinsics.fy     = params.fy;
    scope.camera_intrinsics.fx_inv = 1./params.fx;
    scope.camera_intrinsics.fy_inv = 1./params.fy;
    scope.camera_intrinsics.cx     = params.cx;
    scope.camera_intrinsics.cy     = params.cy;
    scope.camera_intrinsics.width  = params.width;
    scope.camera_intrinsics.height = params.height;
  };
  


  /**
   * Create a 3D point from pixel coordinates + depth
   */
  this.DepthPointToVector3 = function(x, y, depth) {
    var r = new THREE.Vector3();
    r.x = (x-scope.camera_intrinsics.cx) * 
          (scope.camera_intrinsics.fx_inv) * 
          depth;
    r.y = -(y-scope.camera_intrinsics.cy) * 
           (scope.camera_intrinsics.fy_inv) * 
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


  /**
   * Load two image files (depth map + RGB image) and display the
   * resulting point cloud.
   *
   * @param params Dictionary of parameters; possible keys are:
   *    depthImage: Path of the depth map image to load
   *    colorImage: Path of the color image to load
   *    objectName: Name given to the created point cloud object
   *    sampling_spacing: Every i-th pixel in x/y-direction will be used
   *    depthDataFormat: TODO 
   *    pointSize: Size of generated particle points (TODO: constant pixel size)
   *    callback: Function to call with the object once it is created
   */
  this.DisplayPointCloud = function( params ) 
  {
    /// Check for unset parameters
    if ( typeof(params) === 'undefined' ) params = {};
    Default(params, 'depthImage', './examples/depth_0000_converted.png');
    Default(params, 'colorImage', './examples/color_0000.png');
    Default(params, 'objectName', 'DEFAULT_POINT_CLOUD_NAME');
    Default(params, 'sampling_spacing', 5);
    Default(params, 'depthDataFormat', 'UInt16');
    Default(params, 'pointSize', 2);
    Default(params, 'callback', function(){});
    var depthFilename    = params.depthImage;
    var imageFilename    = params.colorImage;
    var name             = params.objectName;
    var sampling_spacing = params.sampling_spacing;
    var depthDataFormat  = params.depthDataFormat;
    var pointSize        = params.pointSize;
    var callback         = params.callback;

    var dimage = new Image();
    var rgbimage = new Image();
    var imageData, depthData;
    var geometry = new THREE.Geometry();
    var pointcloud_object;
    var width;
    var height;

    /// Load depth map image
    dimage.src = depthFilename;
    $(dimage).load(function(){
      width = dimage.width;
      height = dimage.height;
      /// Once the image is loaded, it has to be drawn within an OpenGL 
      /// context so we can read out the pixel data. This does not mean
      /// that the image is *displayed*: The canvas object belonging to
      /// this context is not a member of the HTML page.
      textureContext.drawImage(dimage,0,0);
      depthData = textureContext.getImageData(0,0,width,height).data;
      var centerOfMass = new THREE.Vector3(0,0,0);
      var vertexCount = 0;
      /// Load depths
      for ( var y=0; y<height; y+=sampling_spacing ) {
        for ( var x=0; x<width; x+=sampling_spacing ) {

          /// Get depth value
          var depth;
          if ( depthDataFormat == 'UInt16' ) {
            depth = depthData[((y*width)+x)*4+1]*256 + 
                    depthData[((y*width)+x)*4];
            depth = depth/10.;
          } else {
            depth = depthData[((y*width)+x)*4];
          }
          /// Depth 0 is 'invalid'
          if ( depth == 0. ) continue;

          var vertex = scope.DepthPointToVector3(x, y, depth);
          geometry.vertices.push( vertex );

          centerOfMass.add( vertex );
          vertexCount += 1;
        }
      }
      /// Center point cloud at the origin
      centerOfMass.divideScalar(vertexCount);
      for ( var i=0; i < geometry.vertices.length; i++ ) {
        geometry.vertices[i].sub( centerOfMass );
      }
      /// Start loading color image
      rgbimage.src = imageFilename;
    });
    /// Load color image
    $(rgbimage).load(function(){
      width = rgbimage.width;
      height = rgbimage.height;
      textureContext.drawImage(rgbimage,0,0);
      imageData = textureContext.getImageData(0,0,width,height).data;
      /// Load colors
      for ( var y=0; y<height; y+=sampling_spacing ) {
        for ( var x=0; x<width; x+=sampling_spacing ) {

          var depth;
          if ( depthDataFormat == 'UInt16' ) {
            depth = depthData[((y*width)+x)*4+1]*256 + 
                    depthData[((y*width)+x)*4];
            depth = depth/10.;
          } else {
            depth = depthData[((y*width)+x)*4];
          }
          /// Skip pixels for which there was no valid depth (see above)
          if ( depth == 0. ) continue;

          /// Pixel layout: RGBARGBARGBA... (A(lpha) is unused)
          var r = imageData[((y*width)+x)*4];
          var g = imageData[((y*width)+x)*4+1];
          var b = imageData[((y*width)+x)*4+2];
          var color = new THREE.Color( r/255., g/255., b/255. );
          geometry.colors.push( color );
        }
      }
      var material_params = { vertexColors: THREE.VertexColors,
                              size: pointSize };
      var material = new THREE.ParticleSystemMaterial(material_params);
      pointcloud_object = new THREE.ParticleSystem(geometry, material);
      /// Name the object so it can be identified and retrieved later
      pointcloud_object.name = name;
      scene.add( pointcloud_object );
      /// Execute the callback (if specified)
      callback( pointcloud_object );
      /// Make sure the newly added object is displayed immediately
      RequestRerender();
    });
  };



  /**
   * Load an image file and display it on a planar object. The object can
   * be treated like any other and rotated, translated etc.
   *
   * @param params Dictionary of parameters; possible keys are:
   *    imageFile: Path of the image to load
   *    objectName: Name given to the created point cloud object
   *    callback: Function to call with the object once it is created
   */
  this.DisplayImage = function( params ) 
  {
    /// Check for unset parameters
    if ( typeof(params) === 'undefined' ) params = {};
    Default(params, 'imageFile', './examples/color_0000.png');
    Default(params, 'objectName', 'DEFAULT_IMAGE_NAME');
    Default(params, 'callback', function(){});
    var imageFilename = params.imageFile;
    var name          = params.objectName;
    var callback      = params.callback;

    /// Load image 
    var texture = THREE.ImageUtils.loadTexture(imageFilename);

    /// Infer target size from the object if it was not specified
    Default(params, 'width',  texture.image.width);
    Default(params, 'height', texture.image.height);

    var geometry = new THREE.PlaneGeometry( params.width, params.height );
    var material = new THREE.MeshBasicMaterial( { map: texture } );
    material.map.needsUpdate = true;
    material.overdraw = true;

    imageObject = new THREE.Mesh( geometry, material );
    imageObject.material.side = THREE.DoubleSide;
    imageObject.name = name;
    scene.add( imageObject );

    /// Execute the callback (if specified)
    callback( imageObject );
    /// Make sure the newly added object is displayed immediately
    RequestRerender();
  };


  /**
   * Generate and display a colored test mesh triangle
   */
  this.DisplayTestTriangle = function() {
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
  };

  /// Camera pose object
  var camera_pose_prototype;
  {
    /**
     * Camera:
     *
     *        pt1
     *       /   \
     *  p3--pt2--pt0--p2  __ Viewing direction
     *   | \        / |    /|
     *   |  \     /   |   /
     *   |   \  /     |  /
     *   |  _.p5.___  |
     *  p4=---------==p1
     */
    var fx = scope.camera_intrinsics.fx;
    var fy = scope.camera_intrinsics.fy;
    var cx = scope.camera_intrinsics.cx;
    var cy = scope.camera_intrinsics.cy;
    var w = 2*scope.camera_intrinsics.cx;
    var h = 2*scope.camera_intrinsics.cy;
    var scaling = 20;
    var p1  = new THREE.Vector3(-cx/fx,      -cy/fy, 1);
    var p2  = new THREE.Vector3(-cx/fx, (h-1-cy)/fy, 1);
    var p3  = new THREE.Vector3((w-1-cx)/fx, (h-1-cy)/fy, 1);
    var p4  = new THREE.Vector3((w-1-cx)/fx,      -cy/fy, 1);
    var p5  = new THREE.Vector3(0,0,0);
    var pt0 = new THREE.Vector3(-cx/fx*0.3,(h-1-cy)/fy,1);
    var pt1 = new THREE.Vector3(0,(h-1-cy)/fy*1.2,1);
    var pt2 = new THREE.Vector3((w-1-cx)/fx*0.3,(h-1-cy)/fy,1);
    p1.multiplyScalar(scaling);
    p2.multiplyScalar(scaling);
    p3.multiplyScalar(scaling);
    p4.multiplyScalar(scaling);
    pt0.multiplyScalar(scaling);
    pt1.multiplyScalar(scaling);
    pt2.multiplyScalar(scaling);
    var camera_geometry = new THREE.Geometry();
    camera_geometry.vertices.push(p1);  // \
    camera_geometry.vertices.push(p2);  //  |
    camera_geometry.vertices.push(p3);  //  | rectangular frame
    camera_geometry.vertices.push(p4);  //  |
    camera_geometry.vertices.push(p1);  // /
    camera_geometry.vertices.push(p5);  // \
    camera_geometry.vertices.push(p3);  //  |
    camera_geometry.vertices.push(p4);  //  | pyramid to optical center
    camera_geometry.vertices.push(p5);  //  |
    camera_geometry.vertices.push(p2);  // /
    camera_geometry.vertices.push(pt0); // \
    camera_geometry.vertices.push(pt1); //  | 'top' indicator triangle
    camera_geometry.vertices.push(pt2); // /
    var line_material_parameters = { color: 0x000000,
                                     linewidth: 2,
                                   };
    var line_material = new THREE.LineBasicMaterial( line_material_parameters );
    camera_pose_prototype = { geometry: camera_geometry,
                              material: line_material };
    //camera_pose = new THREE.Line( camera_geometry, line_material );
    //scene.add( camera_pose );

    /// bogus test transform (distorts object)
    /*var m = new THREE.Matrix4( 1, -1, -.5, 10, 
                               1, 1, -.25, 20,
                               .5, .25, 1, 30,
                               0, 0, 0, 1
                             );
    camera_pose.applyMatrix(m);*/
  }
  ///
  
  /**
   * Visualize a camera pose
   *
   * @param params Dictionary of transformation parameters:
   *    rotation: Matrix4; only the rotational part is used
   *    translation: Vector3; the absolute camera position in world space
   *    name: Name identifier given to the camera pose object
   */
  this.DisplayCameraPose = function( params ) {
    Default(params, 'rotation',    new THREE.Matrix4());
    Default(params, 'translation', new THREE.Vector3());
    Default(params, 'name', 'DEFAULT_CAMERA_NAME');
    var R = params.rotation;
    var t = params.translation;
    var transform = R.clone();
    transform.setPosition(t);
    var cam = new THREE.Line( camera_pose_prototype.geometry,
                              camera_pose_prototype.material );
    cam.applyMatrix(transform);
    cam.name = params.name;
    scene.add(cam);
  };

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
    RequestRerender();
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
    RequestRerender();
  }

  var UpdateRenderFlag = function() {
    //RENDER_FLAG = RENDER_FLAG || mousePositionChanged;
    RENDER_FLAG = RENDER_FLAG || cameraChanged;
  };
  var ResetMouse = function() {
    mousePositionChanged = false;
    cameraChanged = false;
  }

  /**
   * Main render loop
   */
  this.run = function render() { 
    cameraChanged = controls.update();
    requestAnimationFrame(render); 
    UpdateRenderFlag();
    if ( RENDER_FLAG || !ONLY_RENDER_WHEN_NECESSARY ) {
      renderer.render(scene, camera); 
      RENDER_FLAG = false;
      ResetMouse();
    }
  };

  /**
   * Get a named scene object by its .name attribute. This method
   * only retrieves and forwards the getObjectByName method of the
   * scene object itself.
   *
   * @param name Name of the object to retrieve
   */
  this.getObjectByName = function( name ) {
    return scene.getObjectByName( name );
  };

};
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

  ///
  /// Color controls
  ///
  var folder_colors = gui.addFolder('Colors');
  /// Background color
  var GUI__gl_clear_color__controller =
      folder_colors.addColor(lmbv, 'GUI__gl_clear_color').name('Background color');
  GUI__gl_clear_color__controller.onChange(function(){
    lmbv.setGlClearColor();
  });
  folder_colors.open();
  
  ///
  /// Camera controls
  ///
  var folder_camera = gui.addFolder('Camera');
  /// Viewing angle
  var GUI__camera_fov_angle__controller =
      folder_camera.add(lmbv, 'GUI__camera_fov_angle', 1., 180.
                       ).name('Viewing angle');
  GUI__camera_fov_angle__controller.onChange(function() {
    lmbv.UpdateCamera();
  });
  /// Control scheme
  var GUI__camera_control_scheme__controller =
      folder_camera.add(lmbv, 'GUI__camera_control_scheme',
                              ['Orbit', 'Trackball']
                       ).name('Camera controls');
  GUI__camera_control_scheme__controller.onFinishChange(function(value) {
    lmbv.switchCameraControlScheme(value);
  });
  /// 'Reset' button
  var GUI__reset_camera__controller =
      folder_camera.add(lmbv, 'GUI__reset_camera').name('Reset camera');
  folder_camera.open();

  /// Make and save a screenshot of the current scene view
  gui.add(lmbv, 'GUI__screenshot').name('Save screenshot');

  /// Add ourselves to the LMBViewer
  lmbv.GUI = gui;
};
/// <-- LMBViewerGUI






/**
 * Helper function for displaying text sprites that always face the camera
 *
 * Original from: https://stemkoski.github.io/Three.js
 *
 * TODO Option for sprites that do not change their pixel size with distance
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

