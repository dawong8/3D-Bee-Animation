
function Shape_From_File( filename, points_transform )
	{
		Shape.call(this);

		this.draw = function( graphicsState, model_transform, material ) 	{
		 	if( this.ready ) Shape.prototype.draw.call(this, graphicsState, model_transform, material );		}

		this.filename = filename;     this.points_transform = points_transform;

		this.webGLStart = function(meshes)
			{
				for( var j = 0; j < meshes.mesh.vertices.length/3; j++ )
				{
					this.positions.push( vec3( meshes.mesh.vertices[ 3*j ], meshes.mesh.vertices[ 3*j + 1 ], meshes.mesh.vertices[ 3*j + 2 ] ) );

					this.normals.push( vec3( meshes.mesh.vertexNormals[ 3*j ], meshes.mesh.vertexNormals[ 3*j + 1 ], meshes.mesh.vertexNormals[ 3*j + 2 ] ) );
					this.texture_coords.push( vec2( meshes.mesh.textures[ 2*j ],meshes.mesh.textures[ 2*j + 1 ]  ));
				}
				this.indices  = meshes.mesh.indices;

        for( var i = 0; i < this.positions.length; i++ )                         // Apply points_transform to all points added during this call
        { this.positions[i] = vec3( mult_vec( this.points_transform, vec4( this.positions[ i ], 1 ) ) );
          this.normals[i]  = vec3( mult_vec( transpose( inverse( this.points_transform ) ), vec4( this.normals[ i ], 1 ) ) );     }

				this.init_buffers();
				this.ready = true;
			}                                                 // Begin downloading the mesh, and once it completes return control to our webGLStart function
		OBJ.downloadMeshes( { 'mesh' : filename }, (function(self) { return self.webGLStart.bind(self) }(this) ) );
	}
inherit( Shape_From_File, Shape );
