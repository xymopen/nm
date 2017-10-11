/**
 * make a function cache its return value
 * @param {function} fn
 * @param {function>} hash - calculate the hash of the arguments as key of map
 */
function memorize( fn, hash = JSON.stringify ) {
	let returns = new Map(), throws = new Map();;

	function memorized() {
		let argsKey = hash( arguments );

		if ( throws.has( argsKey ) ) {
			throw throws.get( argsKey );
		} else if ( returns.has( argsKey ) ) {
			return returns.get( argsKey );
		} else {
			let ret;

			try {
				ret = fn( ...arguments );
			} catch ( error ) {
				throws.set( argsKey, error );

				throw error;
			}

			returns.set( argsKey, ret );

			return ret;
		}
	}

	memorized.refresh = function refresh() {
		returns.clear();
	}

	return memorized;
};

/**
 * make a node-style async function cache its return value
 * @param {function} fn
 * @param {function>} hash - calculate the hash of the arguments as key of map
 */
function nMemorize( fn, hash = JSON.stringify ) {
	let returns = new Map(), throws = new Map();

	function memorized() {
		let args = [ ...arguments ], callback;

		if ( "function" === typeof args[ args.length - 1 ] ) {
			callback = args.pop();
		} else {
			callback = function () { };
		}

		let argsKey = hash( args );

		if ( throws.has( argsKey ) ) {
			callback( throws.get( argsKey ), null );
		} else if ( returns.has( argsKey ) ) {
			callback( null, returns.get( argsKey ) );
		} else {
			fn( ...args, function ( error, ret ) {
				if ( error ) {
					throws.set( argsKey, error );
					callback( error, null );
				} else {
					returns.set( argsKey, ret );
					callback( null, ret );
				}
			} );
		}
	}

	memorized.refresh = function refresh() {
		returns.clear();
		throws.clear();
	}

	return memorized;
};

// export { memorize, nMemorize };
module.exports = { memorize, nMemorize };
