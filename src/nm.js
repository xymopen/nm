/// <reference lib="es2018.asynciterable" />

// import m from "mathjs";
const m = require( "mathjs" );

/**
 * Nelder Mead method
 * @param {number[][]} vertices
 * @param {(vertex: number[]) => number} measure
 * 	Evluate the weight of a vertex. Cache its return values for better perf.
 * @param {number} [a] - Alpha, gt 0
 * @param {number} [g] - Gamma, gt 1
 * @param {number} [r] - Rho, gt 0 and lte 0.5
 * @param {number} [s] - Sigma
 * @returns {number[][]} - Next iteration of vertices
 */
function nm( vertices, measure, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// deduplicate and order
	vertices = vertices.slice().sort( ( a, b ) => measure( a ) - measure( b ) );

	const best = vertices[ 0 ],
		worser = vertices[ vertices.length - 2 ],
		worst = vertices[ vertices.length - 1 ];

	// centralize
	/** @type {number[]} */
	const centroid = m.mean( vertices.slice( 0, -1 ), 0 );

	// reflection
	/** @type {number[]} */
	// @ts-ignore
	const mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) );

	const bestWeight = measure( best ),
		worserWeight = measure( worser ),
		worstWeight = measure( worst ),
		mirrorWeight = measure( mirror );

	if ( bestWeight <= mirrorWeight && mirrorWeight <= worserWeight ) {
		vertices.splice( vertices.length - 1, 1, mirror );
	} else if ( mirrorWeight < bestWeight ) {
		// expansion
		/** @type {number[]} */
		// @ts-ignore
		const expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) );
		const expansionWeight = measure( expansion );

		if ( expansionWeight < mirrorWeight ) {
			vertices.splice( vertices.length - 1, 1, expansion );
		} else {
			vertices.splice( vertices.length - 1, 1, mirror );
		}
	} else {
		// contraction
		/** @type {number[]} */
		// @ts-ignore
		const contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) )
		const contractionWeight = measure( contraction );

		if ( contractionWeight < worstWeight ) {
			vertices.splice( vertices.length - 1, 1, contraction );
		} else {
			// shrink
			vertices = vertices.slice( 1 ).map( /** @return {number[]} */ vertex =>
				// @ts-ignore
				m.add( best, m.multiply( s, m.subtract( vertex, best ) ) ) );

			vertices.unshift( best );
		}
	}

	return vertices;
};

/**
 * Async Nelder Mead method
 * @param {number[][]} vertices
 * @param {(vertex: number[]) => Promise<number>} measureAsync
 * 	Async evluate the weight of a vertex. Cache its return values for better perf.
 * @param {number} [a] - Alpha, gt 0
 * @param {number} [g] - Gamma, gt 1
 * @param {number} [r] - Rho, gt 0 and lte 0.5
 * @param {number} [s] - Sigma
 * @returns {Promise<number[][]>} - Next iteration of vertices
 */
async function nmAsync( vertices, measureAsync, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// order
	const weights = new Map();

	await Promise.all( vertices.map( async vertex =>
		weights.set( vertex, await measureAsync( vertex ) )
	) );

	// deduplicate
	vertices = vertices.slice().sort( ( a, b ) => weights.get( a ) - weights.get( b ) );

	const best = vertices[ 0 ],
		worser = vertices[ vertices.length - 2 ],
		worst = vertices[ vertices.length - 1 ];

	// centralize
	/** @type {number[]} */
	const centroid = m.mean( vertices.slice( 0, -1 ), 0 );

	// reflection
	/** @type {number[]} */
	// @ts-ignore
	const mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) );

	const bestWeight = weights.get( best ),
		worserWeight = weights.get( worser ),
		worstWeight = weights.get( worst ),
		mirrorWeight = await measureAsync( mirror );

	if ( bestWeight <= mirrorWeight && mirrorWeight <= worserWeight ) {
		vertices.splice( vertices.length - 1, 1, mirror );
	} else if ( mirrorWeight < bestWeight ) {
		// expansion
		/** @type {number[]} */
		// @ts-ignore
		const expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) );
		const expansionWeight = await measureAsync( expansion );

		if ( expansionWeight < mirrorWeight ) {
			vertices.splice( vertices.length - 1, 1, expansion );
		} else {
			vertices.splice( vertices.length - 1, 1, mirror );
		}
	} else {
		// contraction
		/** @type {number[]} */
		// @ts-ignore
		const contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) );
		const contractionWeight = await measureAsync( contraction );

		if ( contractionWeight < worstWeight ) {
			vertices.splice( vertices.length - 1, 1, contraction );
		} else {
			// shrink
			vertices = vertices.slice( 1 ).map( /** @return {number[]} */ vertex =>
				// @ts-ignore
				m.add( best, m.multiply( s, m.subtract( vertex, best ) ) ) );

			vertices.unshift( best );
		}
	}

	return vertices;
};

/**
 * Callback Nelder Mead method
 * @param {number[][]} vertices
 * @param {(
 * 	vertex: number[],
 * 	callback:
 * 		( error: Error| null, weight: number ) => void
 * ) => void} measureCallback
 * 	Callback for evluate the weight of a vertex. Cache its return values for better perf.
 * @param {( error: Error | null, vertices: number[][] ) => void} callback
 * @param {number} [a] - Alpha, gt 0
 * @param {number} [g] - Gamma, gt 1
 * @param {number} [r] - Rho, gt 0 and lte 0.5
 * @param {number} [s] - Sigma
 */
function nmCallback( vertices, measureCallback, callback, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	// order
	const weights = new Map();
	let len = vertices.length;

	vertices.forEach( vertex => measureCallback( vertex, ( error, weight ) => {
		if ( error ) {
			callback( error, null );
		} else {
			weights.set( vertex, weight );
			len -= 1;

			if ( 0 === len ) {
				// deduplicate
				vertices = vertices.slice().sort( ( a, b ) => weights.get( a ) - weights.get( b ) );

				const best = vertices[ 0 ],
					worser = vertices[ vertices.length - 2 ],
					worst = vertices[ vertices.length - 1 ];

				// centralize
				/** @type {number[]} */
				const centroid = m.mean( vertices.slice( 0, -1 ), 0 );

				// reflection
				/** @type {number[]} */
				// @ts-ignore
				const mirror = m.add( centroid, m.multiply( a, m.subtract( centroid, worst ) ) );

				const bestWeight = weights.get( best ),
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
							/** @type {number[]} */
							// @ts-ignore
							const expansion = m.add( centroid, m.multiply( g, m.subtract( mirror, centroid ) ) );

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
							/** @type {number[]} */
							// @ts-ignore
							const contraction = m.add( centroid, m.multiply( r, m.subtract( worst, centroid ) ) );

							measureCallback( contraction, ( error, contractionWeight ) => {
								if ( error ) {
									callback( error, null );
								} else {
									if ( contractionWeight < worstWeight ) {
										vertices.splice( vertices.length - 1, 1, contraction );
									} else {
										// shrink
										vertices = vertices.slice( 1 ).map( /** @return {number[]} */ vertex =>
											// @ts-ignore
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
 * Generator iteration of Nelder Mead method
 * @param {number[][]} vertices
 * @param {(vertex: number[]) => number} measure
 * 	Evluate the weight of a vertex. Cache its return values for better perf.
 * @param {number} [a] - Alpha, gt 0
 * @param {number} [g] - Gamma, gt 1
 * @param {number} [r] - Rho, gt 0 and lte 0.5
 * @param {number} [s] - Sigma
 * @yields {number[][]} - Next iteration of vertices
 */
function* nmGen( vertices, measure, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	for ( ; ; ) {
		vertices = nm( vertices, measure, a, g, r, s );
		yield vertices;
	}
};

/**
 * Async Generator iteration of Nelder Mead method
 * @param {number[][]} vertices
 * @param {(vertex: number[]) => Promise<number>} measureAsync
 * 	Async evluate the weight of a vertex. Cache its return values for better perf.
 * @param {number} [a] - Alpha, gt 0
 * @param {number} [g] - Gamma, gt 1
 * @param {number} [r] - Rho, gt 0 and lte 0.5
 * @param {number} [s] - Sigma
 * @yields {Promise<number[][]>} - Next iteration of vertices
 */
async function* nmAsyncGen( vertices, measureAsync, a = 1, g = 2, r = 0.5, s = 0.5 ) {
	for ( ; ; ) {
		vertices = await nmAsync( vertices, measureAsync, a, g, r, s );
		yield vertices;
	}
};

// export { nm, nmAsync, nmCallback, nmGen, nmAsyncGen };
module.exports = { nm, nmAsync, nmCallback, nmGen, nmAsyncGen };
