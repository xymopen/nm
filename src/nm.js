// import m from "mathjs";
const m = require( "mathjs" );

/**
 * Nelder Mead method
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number > ):Number} lose
 * 	a function to evluate the fitness of a vertex. smaller number means better fitness. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @returns {Array< Array< Number > >} new iteration of vertices
 */
function nm( vertices, lose, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// deduplicate and order
	vertices = vertices.slice().sort(( a, b ) => lose( a ) - lose( b ) );

	let best = vertices[ 0 ],
		worser = vertices[ vertices.length - 2 ],
		worst = vertices[ vertices.length - 1 ],
		// centralize
		centroid = m.mean( vertices.slice( 0, -1 ), 0 ),
		// reflection
		mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) ),
		bestLoss = lose( best ),
		worserLoss = lose( worser ),
		worstLoss = lose( worst ),
		mirrorLoss = lose( mirror );

	if ( bestLoss <= mirrorLoss && mirrorLoss <= worserLoss ) {
		vertices.splice( vertices.length - 1, 1, mirror );
	} else if ( mirrorLoss < bestLoss ) {
		// expansion
		let expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) ),
			expansionLoss = lose( expansion );

		if ( expansionLoss < mirrorLoss ) {
			vertices.splice( vertices.length - 1, 1, expansion );
		} else {
			vertices.splice( vertices.length - 1, 1, mirror );
		}
	} else {
		// contraction
		let contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) ),
			contractionLoss = lose( contraction );

		if ( contractionLoss < worstLoss ) {
			vertices.splice( vertices.length - 1, 1, contraction );
		} else {
			// shrink
			vertices = vertices.slice( 1 ).map( vertex =>
				m.add( best, m.multiply( s, m.subtract( vertex, best ) ) ) );

			vertices.unshift( best );
		}
	}

	return vertices;
};

/**
 * async version of Nelder Mead method
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number > ):Promise< Number >} loseAsync
 * 	an async function to evluate the fitness of a vertex. smaller number means better fitness. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @returns {Promise< Array< Array< Number > > >} new iteration of vertices
 */
async function nmAsync( vertices, loseAsync, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// order
	let losses = new Map();

	await Promise.all( vertices.map( async vertex =>
		losses.set( vertex, await loseAsync( vertex ) )
	) );

	// deduplicate
	vertices = vertices.slice().sort(( a, b ) => losses.get( a ) - losses.get( b ) );

	let best = vertices[ 0 ],
		worser = vertices[ vertices.length - 2 ],
		worst = vertices[ vertices.length - 1 ],
		// centralize
		centroid = m.mean( vertices.slice( 0, -1 ), 0 ),
		// reflection
		mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) ),
		bestLoss = losses.get( best ),
		worserLoss = losses.get( worser ),
		worstLoss = losses.get( worst ),
		mirrorLoss = await loseAsync( mirror );

	if ( bestLoss <= mirrorLoss && mirrorLoss <= worserLoss ) {
		vertices.splice( vertices.length - 1, 1, mirror );
	} else if ( mirrorLoss < bestLoss ) {
		// expansion
		let expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) ),
			expansionLoss = await loseAsync( expansion );

		if ( expansionLoss < mirrorLoss ) {
			vertices.splice( vertices.length - 1, 1, expansion );
		} else {
			vertices.splice( vertices.length - 1, 1, mirror );
		}
	} else {
		// contraction
		let contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) ),
			contractionLoss = await loseAsync( contraction );

		if ( contractionLoss < worstLoss ) {
			vertices.splice( vertices.length - 1, 1, contraction );
		} else {
			// shrink
			vertices = vertices.slice( 1 ).map( vertex =>
				m.add( best, m.multiply( s, m.subtract( vertex, best ) ) ) );

			vertices.unshift( best );
		}
	}

	return vertices;
};

/**
 * callback version of Nelder Mead method
 * 
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number >, function( ?Error, Number ) )} loseCallback
 * 	a function with a node-style callback to evluate the fitness of a vertex. smaller number means better fitness. it should cache its results.
 * @param {function( ?Error, Array< Array< Number > > )} callback
 * 	a node-style callback to receive the new iteration of vertices
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 */
function nmCallback( vertices, loseCallback, callback, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// order
	let losses = new Map(), len = vertices.length;

	vertices.forEach( vertex => loseCallback( vertex, ( error, loss ) => {
		if ( error ) {
			callback( error, null );
		} else {
			losses.set( vertex, loss );
			len -= 1;

			if ( 0 === len ) {
				// deduplicate
				vertices = vertices.slice().sort(( a, b ) => losses.get( a ) - losses.get( b ) );

				let best = vertices[ 0 ],
					worser = vertices[ vertices.length - 2 ],
					worst = vertices[ vertices.length - 1 ],
					// centralize
					centroid = m.mean( vertices.slice( 0, -1 ), 0 ),
					// reflection
					mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) ),
					bestLoss = losses.get( best ),
					worserLoss = losses.get( worser ),
					worstLoss = losses.get( worst );

				loseCallback( mirror, ( error, mirrorLoss ) => {
					if ( error ) {
						callback( error, null );
					} else {
						if ( bestLoss <= mirrorLoss && mirrorLoss <= worserLoss ) {
							vertices.splice( vertices.length - 1, 1, mirror );

							callback( null, vertices );
						} else if ( mirrorLoss < bestLoss ) {
							// expansion
							let expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) );

							loseCallback( expansion, ( error, expansionLoss ) => {
								if ( error ) {
									callback( error, null );
								} else {
									if ( expansionLoss < mirrorLoss ) {
										vertices.splice( vertices.length - 1, 1, expansion );
									} else {
										vertices.splice( vertices.length - 1, 1, mirror );
									}

									callback( null, vertices );
								}
							} );
						} else {
							// contraction
							let contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) );

							loseCallback( contraction, ( error, contractionLoss ) => {
								if ( error ) {
									callback( error, null );
								} else {
									if ( contractionLoss < worstLoss ) {
										vertices.splice( vertices.length - 1, 1, contraction );
									} else {
										// shrink
										vertices = vertices.slice( 1 ).map( vertex =>
											m.add( best, m.multiply( s, m.subtract( vertex, best ) ) ) );

										vertices.unshift( best );
									}

									callback( null, vertices );
								}
							} );
						}
					}
				} )
			}
		}
	} ) );
};

/**
 * generator version of Nelder Mead method
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number > ):Number} lose
 * 	a function to evluate the fitness of a vertex. smaller number means better fitness. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @yields {Array< Array< Number > >} new iteration of vertices
 */
function* nmGen( vertices, lose, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	for ( ; ; ) {
		vertices = nm( vertices, lose, a, g, r, s );
		yield vertices;
	}
};

/**
 * async generator version of Nelder Mead method
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number > ):Promise< Number >} loseAsync
 * 	an async function to evluate the fitness of a vertex. smaller number means better fitness. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @yields {Array< Array< Number > >} new iteration of vertices
 */
/*
async function* nmAsyncGen( vertices, loseAsync, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	for ( ; ; ) {
		vertices = await nm( vertices, loseAsync, a, g, r, s );
		yield vertices;
	}
};
*/

const nmAsyncGen = null;

// export { nm, nmAsync, nmCallback, nmGen, nmAsyncGen };
module.exports = { nm, nmAsync, nmCallback, nmGen, nmAsyncGen };