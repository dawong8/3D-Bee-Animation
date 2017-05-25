
"use strict"      // Selects strict javascript
var canvas, canvas_size, shaders, gl = null, g_addrs,          // Global variables
	thrust = vec3(), 	origin = vec3( 0, 10, -15 ), looking = false, prev_time = 0, animate = false, animation_time = 0, gouraud = false, color_normals = false;


var shader_variable_names = [ "camera_transform", "camera_model_transform", "projection_camera_model_transform", "camera_model_transform_normal",
                              "shapeColor", "lightColor", "lightPosition", "attenuation_factor", "ambient", "diffusivity", "shininess", "smoothness", 
                              "animation_time", "COLOR_NORMALS", "GOURAUD", "USE_TEXTURE" ];
   
function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     // Colors are just special vec4s expressed as: ( red, green, blue, opacity )
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( Color( .8,.3,.8,1 ), .1, 1, 1, 40, undefined ) ); }

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif" ];

window.onload = function init() {	var anim = new Animation();	}   // Our whole program's entry point

function Animation()    
{
	( function init( self )
	{
		self.context = new GL_Context( "gl-canvas", Color( 1, 1, 1, 1 ) );    // Set your background color here
		self.context.register_display_object( self );
		
    shaders = { "Default":     new Shader( "vertex-shader-id", "fragment-shader-id" ), 
                "Demo_Shader": new Shader( "vertex-shader-id", "demo-shader-id"     )  };
    
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
    self.mouse = { "from_center": vec2() };
		            
    self.m_strip       = new Old_Square();                // At the beginning of our program, instantiate all shapes we plan to use, 
		self.m_tip         = new Tip( 3, 10 );                // each with only one instance in the graphics card's memory.
    self.m_cylinder    = new Cylindrical_Tube( 10, 10 );  // For example we'll only create one "cube" blueprint in the GPU, but we'll re-use 
    self.m_torus       = new Torus( 25, 25 );             // it many times per call to display to get multiple cubes in the scene.
    self.m_sphere      = new Sphere( 10, 10 );
    self.poly          = new N_Polygon( 7 );
    self.m_cone        = new Cone( 10, 10 );
    self.m_capped      = new Capped_Cylinder( 4, 12 );
    self.m_prism       = new Prism( 8, 8 );
    self.m_cube        = new Cube();
    self.m_obj         = new Shape_From_File( "teapot.obj", scale( .1, .1, .1 ) );
    self.m_sub         = new Subdivision_Sphere( 4, true );
    self.m_axis        = new Axis();
		
// 1st parameter is our starting camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-25), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );
		
		self.context.render();	
	} ) ( this );
	
// *** Mouse controls: ***
  var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.     
  canvas.addEventListener("mouseup",   ( function(self) { return function(e)	{ e = e || window.event;		self.mouse.anchor = undefined;              } } ) (this), false );
	canvas.addEventListener("mousedown", ( function(self) { return function(e)	{	e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
  canvas.addEventListener("mousemove", ( function(self) { return function(e)	{ e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );                                         
  canvas.addEventListener("mouseout", ( function(self) { return function(e)	{ self.mouse.from_center = vec2(); }; } ) (this), false );        // Stop steering if the mouse leaves the canvas. 
}
  
// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
	shortcut.add( ".",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
  shortcut.add( "o",   ( function(self) { return function() { origin = vec3( mult_vec( inverse( self.graphicsState.camera_transform ), vec4(0,0,0,1) )                       ); } } ) (this) ) ;
	shortcut.add( "r",   ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud; } );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; }; } ) (this) );	
}

Animation.prototype.update_strings = function( debug_screen_strings )	      // Strings that this displayable object (Animation) contributes to the UI:	
{
	debug_screen_strings.string_map["time"]    = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["basis"]   = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"]  = "Thrust: " + thrust;
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70,  degrees_per_frame = .0004 * animation_delta_time,
                      meters_per_frame  =   .01 * animation_delta_time;
										
    if( self.mouse.anchor ) // Dragging mode: Is a mouse drag occurring?
    {
      var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
      if( length( dragging_vector ) > 0 )
        self.graphicsState.camera_transform = mult( self.graphicsState.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
            mult( translation(origin),                                                      
            mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ), 
            translation(scale_vec( -1,origin ) ) ) ) );
    }    
          // Flyaround mode:  Determine camera rotation movement first
		var movement_plus  = [ self.mouse.from_center[0] + leeway, self.mouse.from_center[1] + leeway ];  // mouse_from_center[] is mouse position relative to canvas center;
		var movement_minus = [ self.mouse.from_center[0] - leeway, self.mouse.from_center[1] - leeway ];  // leeway is a tolerance from the center before it starts moving.
		
		for( var i = 0; looking && i < 2; i++ )			// Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// A short function for testing.  It draws a lot of things at once.  See display() for a more basic look at how to draw one thing at a time.
Animation.prototype.test_lots_of_shapes = function( model_transform )
  {
    var shapes = [ this.m_prism, this.m_capped, this.m_cone, this.m_sub, this.m_sphere, this.m_obj, this.m_torus ];   // Randomly include some shapes in a list
    var tex_names = [ undefined, "stars.png", "earth.gif" ]
    
    for( var i = 3; i < shapes.length + 3; i++ )      // Iterate through that list
    {
      var spiral_transform = model_transform, funny_number = this.graphicsState.animation_time/20 + (i*i)*Math.cos( this.graphicsState.animation_time/2000 );
      spiral_transform = mult( spiral_transform, rotation( funny_number, i%3 == 0, i%3 == 1, i%3 == 2 ) );    
      for( var j = 1; j < 4; j++ )                                                                                  // Draw each shape 4 times, in different places
      {
        var mat = new Material( Color( i % j / 5, j % i / 5, i*j/25, 1 ), .3,  1,  1, 40, tex_names[ (i*j) % tex_names.length ] )       // Use a random material
        // The draw call:
        shapes[i-3].draw( this.graphicsState, spiral_transform, mat );			                        //  Draw the current shape in the list, passing in the current matrices		
        spiral_transform = mult( spiral_transform, rotation( 63, 3, 5, 7 ) );                       //  Move a little bit before drawing the next one
        spiral_transform = mult( spiral_transform, translation( 0, 5, 0) );
      } 
      model_transform = mult( model_transform, translation( 0, -3, 0 ) );
    }
    return model_transform;     
  }
    
// *******************************************************	
// display(): Called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{  
		if(!time) time = 0;                                                               // Animate shapes based upon how much measured real time has transpired
		this.animation_delta_time = time - prev_time;                                     // by using animation_time
		if( animate ) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		var model_transform = mat4();	            // Reset this every frame.
		this.basis_id = 0;	                      // For the "axis" shape.  This variable uniquely marks each axis we draw in display() as it counts them up.
    
    shaders[ "Default" ].activate();                         // Keep the flags seen by the default shader program up-to-date
		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud );		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);    
		
    
		// *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
    // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
    this.graphicsState.lights = [];                    // First clear the light list each frame so we can replace & update lights.
    
    var light_orbit = [ Math.cos(this.graphicsState.animation_time/1000), Math.sin(this.graphicsState.animation_time/1000) ];
    this.graphicsState.lights.push( new Light( vec4(  30 * light_orbit[0],  30*light_orbit[1],  34 * light_orbit[0], 1 ), Color( 0, .4, 0, 1 ), 100000 ) );
    this.graphicsState.lights.push( new Light( vec4( -10 * light_orbit[0], -20*light_orbit[1], -14 * light_orbit[0], 0 ), Color( 1, 1, .3, 1 ), 100 * Math.cos(this.graphicsState.animation_time/10000 ) ) );
    
		// *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material( Color( .9,.5,.9,1 ), .01, .2, .4, 40 ), // Omit the final (string) parameter if you want no texture
          greyPlastic = new Material( Color( .5,.5,.5,1 ), .01, .4, .2, 20 ),
                earth = new Material( Color( .5,.5,.5,1 ), .1,  1, .5, 40, "earth.gif" ),
                white = new Material( Color( .5,.5,.5,1 ), .1,  1,  1, 40, "stars.png" );
			
		/**********************************
		Start coding down here!!!!
		**********************************/                                     // From this point on down it's just some examples for you -- feel free to comment it all out.

    model_transform = mult( model_transform, scale( 2, 2, 2 ) ) // matrix here is [2,2,2] ?
    var temp = model_transform;

    for (var i = 0; i < 8; i++) {
      
     // CURRENT_BASIS_IS_WORTH_SHOWING( this, model_transform);     

      
    if ( i /2 == 0) {
        model_transform = mult( model_transform, rotation( 90, 1, 0, 0 ) )
    }
    this.m_capped.draw( this.graphicsState, model_transform, white );
    model_transform = mult( model_transform, translation( 0, 0, -1 ) )
      model_transform = mult( model_transform, rotation( 3*Math.sin(this.graphicsState.animation_time/500), 0, 1, 0 ) )
    }
    //Flower top, is it ok for it to overlapp with cylinders
    model_transform = mult( model_transform, scale( 2, 2, 2 ) )
    model_transform = mult( model_transform, translation( 0, 0, -.5 ) )

    this.m_sphere.draw( this.graphicsState, model_transform, earth );

    model_transform = temp; 

    //BEE HEAD

     var x = 13.5, y = 3, z = 5; 
      model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) ); 

      model_transform = mult( model_transform, translation( x, y, z ) )
      var pos = model_transform;
      model_transform = mult( model_transform, scale( .5, .5, .5 ) )

      this.m_sphere.draw( this.graphicsState, model_transform, white );

      //BEE Body

      model_transform = temp;
      model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) ); 

      model_transform = mult( model_transform, translation( x, y, z+1.5 ) )//3

      var body = model_transform;
      model_transform = mult( model_transform, scale( 1, 1, 2 ) ) 

      this.m_cube.draw( this.graphicsState, model_transform, white );


      //BEE Butt
      model_transform = temp; 
      model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) ); 

      model_transform = mult( model_transform, translation( x, y, z+4.5 ) )
      model_transform = mult( model_transform, scale( 1, 1, 2 ) )
      this.m_sphere.draw( this.graphicsState, model_transform, white );

      
    //WINGS
    // model_transform = body; 


    //for ( var h = 0; h < 2; h++) {


      //model_transform = mult( model_transform, scale( 3, 1, 1 ) )
      //model_transform = mult( model_transform, translation( .66, .5, 0 ) )//nothing 
      
     

      //var angle = (this.graphicsState.animation_time); //; % 45;
  


     // model_transform = mult( model_transform, rotation( angle, 0, 0, 1 ) ); 
      model_transform = temp;
      //model_transform = mult( model_transform, rotation( 90, 0, 0, 1 ) ); 
      model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) );

      model_transform = mult( model_transform, translation( 13, 3.5, z+1 ) )

      //for (var i = 0; i < 2; i++) {
      // if ( i /2 == 0) {
          model_transform = mult( model_transform, rotation( 90, 0, 0, 1 ) )

      // } else {

       //}
        //model_transform = mult( model_transform, translation( 0, 0, 0) )

        model_transform = mult( model_transform, rotation(45*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) )

        //model_transform = mult( model_transform, translation( 0, 1, 0) )

        model_transform = mult( model_transform, translation( 0, 2, 0) )//separate the panels
        model_transform = mult( model_transform, scale( 1, 4, 1) )


        this.m_strip.draw( this.graphicsState, model_transform, white );

//---------------------------------------------------------------------

        model_transform = temp;
      //model_transform = mult( model_transform, rotation( 90, 0, 0, 1 ) );
      model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) ); 

      model_transform = mult( model_transform, translation( 14, 3.5, z+1 ) )

      //for (var i = 0; i < 2; i++) {
      // if ( i /2 == 0) {
        model_transform = mult( model_transform, rotation( 90, 0, 0, -1 ) )
        model_transform = mult( model_transform, rotation( 180, 0, 1, 0 ) )

      // } else {

       //}
        //model_transform = mult( model_transform, translation( 0, 0, 0) )
       
        model_transform = mult( model_transform, rotation(45*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) )
        model_transform = mult( model_transform, translation( 0, 2, 0) )
        //model_transform = mult( model_transform, translation( 0, 1, 0) )

        //separate the panels
        model_transform = mult( model_transform, scale( 1, 4, 1) )

        this.m_strip.draw( this.graphicsState, model_transform, white );






//-------LEGS--------
//Left
        model_transform = temp; 
        model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) );
        model_transform = mult( model_transform, scale( .2455, 1,  .25) )

        model_transform = mult( model_transform, translation( x+39, y-1, z+15 ) )
       // CURRENT_BASIS_IS_WORTH_SHOWING( this, model_transform);     

        model_transform = mult( model_transform, rotation(Math.abs(25*Math.sin(this.graphicsState.animation_time/750)), 0, 0, 1 ) )
        model_transform = mult( model_transform, translation( Math.abs(25*Math.sin(this.graphicsState.animation_time/750))/100, -Math.abs(25*Math.sin(this.graphicsState.animation_time/750))/100, 0 ) )
        var now; 
        for (var i = 0; i < 3; i++) {

          model_transform = mult( model_transform, translation( 0, 0, 3 ) ) //makes it 3 segments 
          this.m_cube.draw( this.graphicsState, model_transform, white );

          now = model_transform; 

          model_transform = mult( model_transform, translation( 0, -1., 0 ) ) 

        model_transform = mult( model_transform, rotation(Math.abs(25*Math.sin(this.graphicsState.animation_time/750)), 0, 0, 1 ) )
        model_transform = mult( model_transform, translation( Math.abs(17*Math.sin(this.graphicsState.animation_time/750))/100,  -Math.abs(25*Math.sin(this.graphicsState.animation_time/750))/100, 0 ) )
        

          this.m_cube.draw( this.graphicsState, model_transform, white );

          model_transform = now;
        }
        //right
        model_transform = temp; 
        model_transform = mult( model_transform, rotation( this.graphicsState.animation_time/50, 0, 1, 0 ) ); 
      model_transform = mult( model_transform, rotation( 12+13*Math.sin(this.graphicsState.animation_time/500), 0, 0, 1 ) );
        model_transform = mult( model_transform, scale( .2455, 1,  .25) )

        model_transform = mult( model_transform, translation( x+44, y-1, z+15 ) )

        model_transform = mult( model_transform, rotation(-Math.abs(25*Math.sin(this.graphicsState.animation_time/750)), 0, 0, 1 ) )
        model_transform = mult( model_transform, translation( -Math.abs(25*Math.sin(this.graphicsState.animation_time/750))/100, -Math.abs(25*Math.sin(this.graphicsState.animation_time/750))/100, 0 ) )
        var now2; 



        for (var k = 0; k < 3; k++) {

          model_transform = mult( model_transform, translation( 0, 0, 3 ) ) //makes it 3 segments 
          this.m_cube.draw( this.graphicsState, model_transform, white );

          now2 = model_transform; 

          model_transform = mult( model_transform, translation( 0, -1., 0 ) ) 

        model_transform = mult( model_transform, rotation(-Math.abs(25*Math.sin(this.graphicsState.animation_time/750)), 0, 0, 1 ) )
        model_transform = mult( model_transform, translation( -Math.abs(17*Math.sin(this.graphicsState.animation_time/750))/100, - Math.abs(25*Math.sin(this.graphicsState.animation_time/750))/100, 0 ) )
        

          this.m_cube.draw( this.graphicsState, model_transform, white );

          model_transform = now2;
        }
//static plane 

        model_transform = temp; 
        model_transform = mult( model_transform, translation( 0, -.5, 0 ) ) 

        model_transform = mult( model_transform, scale( 1000, 0, 1000 ) )

        this.m_sphere.draw( this.graphicsState, model_transform, white );  // Sphere example.  (Issue a command to draw one.)  Notice that we're still in the rectangle's warped coordinate system.
	}	