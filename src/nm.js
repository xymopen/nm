// import m from "mathjs";
const m = require( "mathjs" );

/**
 * Nelder Mead method
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number > ):Number} measure
 * 	a function to evluate the error of a vertex from target. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @returns {Array< Array< Number > >} new iteration of vertices
 */
function nm( vertices, measure, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// deduplicate and order
	vertices = vertices.slice().sort(( a, b ) => measure( a ) - measure( b ) );

	let best = vertices[ 0 ],
		worser = vertices[ vertices.length - 2 ],
		worst = vertices[ vertices.length - 1 ],
		// centralize
		centroid = m.mean( vertices.slice( 0, -1 ), 0 ),
		// reflection
		mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) ),
		bestWeight = measure( best ),
		worserWeight = measure( worser ),
		worstWeight = measure( worst ),
		mirrorWeight = measure( mirror );

	if ( bestWeight <= mirrorWeight && mirrorWeight <= worserWeight ) {
		vertices.splice( vertices.length - 1, 1, mirror );
	} else if ( mirrorWeight < bestWeight ) {
		// expansion
		let expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) ),
			expansionWeight = measure( expansion );

		if ( expansionWeight < mirrorWeight ) {
			vertices.splice( vertices.length - 1, 1, expansion );
		} else {
			vertices.splice( vertices.length - 1, 1, mirror );
		}
	} else {
		// contraction
		let contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) ),
			contractionWeight = measure( contraction );

		if ( contractionWeight < worstWeight ) {
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
 * @param {function( Array< Number > ):Promise< Number >} measureAsync
 * 	an async function to evluate the error of a vertex from target. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @returns {Promise< Array< Array< Number > > >} new iteration of vertices
 */
async function nmAsync( vertices, measureAsync, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// order
	let weights = new Map();

	await Promise.all( vertices.map( async vertex =>
		weights.set( vertex, await measureAsync( vertex ) )
	) );

	// deduplicate
	vertices = vertices.slice().sort(( a, b ) => weights.get( a ) - weights.get( b ) );

	let best = vertices[ 0 ],
		worser = vertices[ vertices.length - 2 ],
		worst = vertices[ vertices.length - 1 ],
		// centralize
		centroid = m.mean( vertices.slice( 0, -1 ), 0 ),
		// reflection
		mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) ),
		bestWeight = weights.get( best ),
		worserWeight = weights.get( worser ),
		worstWeight = weights.get( worst ),
		mirrorWeight = await measureAsync( mirror );

	if ( bestWeight <= mirrorWeight && mirrorWeight <= worserWeight ) {
		vertices.splice( vertices.length - 1, 1, mirror );
	} else if ( mirrorWeight < bestWeight ) {
		// expansion
		let expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) ),
			expansionWeight = await measureAsync( expansion );

		if ( expansionWeight < mirrorWeight ) {
			vertices.splice( vertices.length - 1, 1, expansion );
		} else {
			vertices.splice( vertices.length - 1, 1, mirror );
		}
	} else {
		// contraction
		let contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) ),
			contractionWeight = await measureAsync( contraction );

		if ( contractionWeight < worstWeight ) {
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
 * @param {function( Array< Number >, function( ?Error, Number ) )} measureCallback
 * 	a node-style async function to evluate the error of a vertex from target. it should cache its results.
 * @param {function( ?Error, Array< Array< Number > > )} callback
 * 	a node-style callback to receive the new iteration of vertices
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 */
function nmCallback( vertices, measureCallback, callback, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// order
	let weights = new Map(), len = vertices.length;

	vertices.forEach( vertex => measureCallback( vertex, ( error, weight ) => {
		if ( error ) {
			callback( error, null );
		} else {
			weights.set( vertex, weight );
			len -= 1;

			if ( 0 === len ) {
				// deduplicate
				vertices = vertices.slice().sort(( a, b ) => weights.get( a ) - weights.get( b ) );

				let best = vertices[ 0 ],
					worser = vertices[ vertices.length - 2 ],
					worst = vertices[ vertices.length - 1 ],
					// centralize
					centroid = m.mean( vertices.slice( 0, -1 ), 0 ),
					// reflection
					mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) ),
					bestWeight = weights.get( best ),
					worserWeight = weights.get( worser ),
					worstWeight = weights.get( worst );

				measureCallback( mirror, ( error, mirrorWeight ) => {
					if ( error ) {
						callback( error, null );
					} else {
						if ( bestWeight <= mirrorWeight && mirrorWeight <= worserWeight ) {
							vertices.splice( vertices.length - 1, 1, mirror );

							callback( null, vertices );
						} else if ( mirrorWeight < bestWeight ) {
							// expansion
							let expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) );

							measureCallback( expansion, ( error, expansionWeight ) => {
								if ( error ) {
									callback( error, null );
								} else {
									if ( expansionWeight < mirrorWeight ) {
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

							measureCallback( contraction, ( error, contractionWeight ) => {
								if ( error ) {
									callback( error, null );
								} else {
									if ( contractionWeight < worstWeight ) {
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
 * @param {function( Array< Number > ):Number} measure
 * 	a function to evluate the error of a vertex from target. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @yields {Array< Array< Number > >} new iteration of vertices
 */
function* nmGen( vertices, measure, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	for ( ; ; ) {
		vertices = nm( vertices, measure, a, g, r, s );
		yield vertices;
	}
};

/**
 * async generator version of Nelder Mead method
 * @param {Array< Array< Number > >} vertices
 * @param {function( Array< Number > ):Promise< Number >} measureAsync
 * 	an async function to evluate the error of a vertex from target. it should cache its results.
 * @param {Number} [a] - alpha, it should gt 0
 * @param {Number} [g] - gamma, it should gt 1
 * @param {Number} [r] - rho, it should gt 0 and lte 0.5
 * @param {Number} [s] - sigma
 * @yields {Array< Array< Number > >} new iteration of vertices
 */
/*
async function* nmAsyncGen( vertices, measureAsync, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	for ( ; ; ) {
		vertices = await nm( vertices, measureAsync, a, g, r, s );
		yield vertices;
	}
};
*/
// for-await-of syntax is currently not supported by node.js
const nmAsyncGen = null;

// export { nm, nmAsync, nmCallback, nmGen, nmAsyncGen };
module.exports = { nm, nmAsync, nmCallback, nmGen, nmAsyncGen };
